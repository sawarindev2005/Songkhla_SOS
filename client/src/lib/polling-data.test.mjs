import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPollingUpdate, canCommitPoll } from './polling-data.mjs';

test('a confirmed row updates the cache without replacing unrelated rows or retaining a stale error', () => {
  const other = { id: 2, is_published: 0 };
  const previous = { path: '/announcements', data: [{ id: 1, is_published: 0 }, other], error: new Error('old read failed') };
  const at = new Date();
  const result = applyPollingUpdate(previous, '/announcements', (rows) => rows.map((row) => row.id === 1 ? { ...row, is_published: 1 } : row), at);
  assert.equal(result.data[0].is_published, 1);
  assert.equal(previous.data[0].is_published, 0);
  assert.equal(result.data[1], other);
  assert.equal(result.error, null);
  assert.equal(result.updatedAt, at);
});

test('a slow poll cannot revert the publication returned by a successful write', async () => {
  let result = { path: '/announcements', data: [{ id: 1, is_published: 0 }], error: null };
  const oldController = new AbortController();
  let active = oldController;
  let release;
  const pending = new Promise((resolve) => { release = resolve; }).then((data) => {
    if (canCommitPoll(active, oldController)) result = { ...result, data };
  });
  active.abort();
  active = null;
  result = applyPollingUpdate(result, '/announcements', () => [{ id: 1, is_published: 1 }]);
  release([{ id: 1, is_published: 0 }]);
  await pending;
  assert.equal(result.data[0].is_published, 1);
  assert.equal(canCommitPoll(new AbortController(), oldController), false);
});

test('an update for an old route cannot touch another route or invoke its updater', () => {
  const previous = { path: '/shelters', data: [] };
  assert.equal(applyPollingUpdate(previous, '/announcements', () => assert.fail('wrong route')), previous);
});

test('only the active un-aborted request may commit', () => {
  const current = new AbortController();
  assert.equal(canCommitPoll(current, current), true);
  assert.equal(canCommitPoll(null, current), false);
  current.abort();
  assert.equal(canCommitPoll(current, current), false);
});
