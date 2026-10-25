const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { httpError } = require('../utils');

const FIELDS = 'a.id, a.title, a.content, a.tone, a.is_published, a.published_at, a.created_at, a.updated_at, u.full_name AS author_name';

function validate(body, partial = false) {
  const data = {};
  for (const [key, max, label] of [['title', 160, 'หัวข้อ'], ['content', 5000, 'รายละเอียด']]) {
    if (partial && body[key] === undefined) continue;
    if (typeof body[key] !== 'string' || !body[key].trim()) throw httpError(400, `กรุณากรอก${label}ประกาศ`);
    if ([...body[key].trim()].length > max) throw httpError(400, `${label}ประกาศยาวได้ไม่เกิน ${max} ตัวอักษร`);
    data[key] = body[key].trim();
  }
  if (!partial || body.tone !== undefined) {
    data.tone = body.tone ?? 'info';
    if (!['info', 'org', 'red'].includes(data.tone)) throw httpError(400, 'กรุณาเลือกระดับประกาศ');
  }
  if (!partial || body.is_published !== undefined) {
    if (body.is_published !== undefined && typeof body.is_published !== 'boolean') throw httpError(400, 'สถานะเผยแพร่ต้องเป็น true หรือ false');
    data.is_published = body.is_published ? 1 : 0;
  }
  return data;
}

function announcementRouter(db = require('../db')) {
  const router = express.Router();
  const select = `SELECT ${FIELDS} FROM public_announcements a LEFT JOIN users u ON u.id = a.created_by`;
  async function find(id) {
    if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) throw httpError(400, 'เลขประกาศไม่ถูกต้อง');
    const [rows] = await db.query(`${select} WHERE a.id = ?`, [id]);
    if (!rows[0]) throw httpError(404, 'ไม่พบประกาศนี้');
    return rows[0];
  }

  router.get('/public', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const [rows] = await db.query(`${select} WHERE a.is_published = 1 ORDER BY a.published_at DESC, a.id DESC LIMIT 50`);
    res.json(rows);
  });

  router.use(verifyToken, requireRole('admin'));
  router.get('/', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const [rows] = await db.query(`${select} ORDER BY a.created_at DESC, a.id DESC`);
    res.json(rows);
  });
  router.post('/', async (req, res) => {
    const data = validate(req.body || {});
    data.created_by = req.user.id;
    data.published_at = data.is_published ? new Date() : null;
    const [result] = await db.query('INSERT INTO public_announcements SET ?', [data]);
    res.status(201).json(await find(result.insertId));
  });
  router.patch('/:id', async (req, res) => {
    const previous = await find(req.params.id);
    const data = validate(req.body || {}, true);
    if (data.is_published && !previous.is_published) data.published_at = new Date();
    if (Object.keys(data).length) await db.query('UPDATE public_announcements SET ? WHERE id = ?', [data, req.params.id]);
    res.json(await find(req.params.id));
  });
  router.delete('/:id', async (req, res) => {
    await find(req.params.id);
    const [result] = await db.query('DELETE FROM public_announcements WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) throw httpError(404, 'ไม่พบประกาศนี้');
    res.status(204).end();
  });
  return router;
}

module.exports = { announcementRouter, validate };
