const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { announcementRouter, validate } = require('./announcements');

// HTTP integration uses a disposable in-memory SQL adapter, never the project database.
const key = randomBytes(32).toString('hex');
const previousKey = process.env.JWT_SECRET;
let server;
let base;
let nextId = 1;
const rows = new Map();
const calls = [];
let unavailable = false;
const db = {
  async query(sql, args = []) {
    if (unavailable) throw new Error('database fixture unavailable');
    calls.push({ sql, args });
    if (sql.startsWith('INSERT')) {
      const id = nextId++;
      rows.set(id, { id, ...args[0], author_name: 'ผู้ดูแลระบบ' });
      return [{ insertId: id }];
    }
    if (sql.startsWith('UPDATE')) {
      const current = rows.get(Number(args[1]));
      if (current) Object.assign(current, args[0]);
      return [{ affectedRows: current ? 1 : 0 }];
    }
    if (sql.startsWith('DELETE')) return [{ affectedRows: rows.delete(Number(args[0])) ? 1 : 0 }];
    assert.match(sql, /LEFT JOIN users/);
    if (sql.includes('WHERE a.id = ?')) return [[rows.get(Number(args[0]))].filter(Boolean)];
    if (sql.includes('WHERE a.is_published = 1')) return [[...rows.values()].filter((row) => row.is_published === 1).reverse()];
    return [[...rows.values()]];
  },
};

before(async () => {
  process.env.JWT_SECRET = key;
  const app = express();
  app.use(express.json());
  app.use(require('cookie-parser')());
  app.use('/announcements', announcementRouter(db));
  app.use((err, req, res, next) => res.status(err.status || 500).json({ message: err.expose ? err.message : 'เกิดข้อผิดพลาดในระบบ' }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/announcements`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  if (previousKey === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousKey;
});
async function request(path, method = 'GET', body, role) {
  const headers = { 'Content-Type': 'application/json' };
  if (role) headers.Cookie = `hy_token=${jwt.sign({ id: 1, role }, key, { expiresIn: '1m' })}`;
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: response.status === 204 ? null : await response.json(), cache: response.headers.get('cache-control') };
}

test('only admins can read drafts or mutate announcements', async () => {
  assert.equal((await request('')).status, 401);
  for (const method of ['POST', 'PATCH', 'DELETE']) assert.equal((await request(method === 'POST' ? '' : '/1', method, method === 'DELETE' ? undefined : {})).status, 401);
  for (const role of ['command', 'rescuer']) {
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
      const result = await request(method === 'PATCH' || method === 'DELETE' ? '/1' : '', method, method === 'POST' || method === 'PATCH' ? {} : undefined, role);
      assert.equal(result.status, 403);
    }
  }
  assert.equal(calls.length, 0);
});

test('admin CRUD keeps drafts private, publishes, hides, and deletes through the same API', async () => {
  const created = await request('', 'POST', { title: ' ประกาศทดสอบ ', content: 'รายละเอียด\nบรรทัดใหม่', created_by: 999 }, 'admin');
  assert.equal(created.status, 201);
  assert.equal(created.data.title, 'ประกาศทดสอบ');
  assert.equal(calls.find((call) => call.sql.startsWith('INSERT')).args[0].created_by, 1);
  assert.equal(created.data.is_published, 0);
  assert.equal(created.data.published_at, null);
  assert.deepEqual((await request('/public')).data, []);
  const id = created.data.id;
  const published = await request(`/${id}`, 'PATCH', { is_published: true, tone: 'red' }, 'admin');
  assert.equal(published.status, 200);
  assert.ok(published.data.published_at);
  const publicResult = await request('/public');
  assert.equal(publicResult.data.length, 1);
  assert.equal(publicResult.cache, 'no-store');
  const edited = await request(`/${id}`, 'PATCH', { content: 'แก้เฉพาะเนื้อหา' }, 'admin');
  assert.equal(edited.data.is_published, 1);
  assert.equal(edited.data.published_at, published.data.published_at);
  assert.equal((await request('/public')).data[0].content, 'แก้เฉพาะเนื้อหา');
  assert.equal((await request('', 'GET', undefined, 'admin')).data.length, 1);
  await request(`/${id}`, 'PATCH', { is_published: false, title: 'แก้หัวข้อแล้ว' }, 'admin');
  assert.deepEqual((await request('/public')).data, []);
  assert.equal((await request(`/${id}`, 'DELETE', undefined, 'admin')).status, 204);
  assert.equal((await request(`/${id}`, 'DELETE', undefined, 'admin')).status, 404);
});

test('bad input is rejected before writes and SQL uses bound parameters', async () => {
  const writesBefore = calls.filter((call) => /^(INSERT|UPDATE|DELETE)/.test(call.sql)).length;
  for (const body of [{}, { title: 'x', content: '' }, { title: 'x'.repeat(161), content: 'x' }, { title: 'x', content: 'x'.repeat(5001) }, { title: 'x', content: 'x', tone: 'invalid' }, { title: 'x', content: 'x', is_published: 'false' }]) {
    assert.equal((await request('', 'POST', body, 'admin')).status, 400);
  }
  assert.equal((await request('/1%20OR%201=1', 'DELETE', undefined, 'admin')).status, 400);
  assert.equal(calls.filter((call) => /^(INSERT|UPDATE|DELETE)/.test(call.sql)).length, writesBefore);
  assert.equal(validate({ title: 'x', content: 'x', is_published: false }).tone, 'info');
});

test('database failures return a recoverable error without exposing internal details', async () => {
  unavailable = true;
  try {
    const result = await request('/public');
    assert.equal(result.status, 500);
    assert.equal(result.data.message, 'เกิดข้อผิดพลาดในระบบ');
  } finally { unavailable = false; }
  assert.equal((await request('/public')).status, 200);
});
