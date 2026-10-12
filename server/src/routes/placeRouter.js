const express = require('express');
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { httpError, requireLatLng, pick } = require('../utils');

// CRUD แบบเดียวกันสำหรับ shelters และ distribution_points:
// อ่านได้ทุกคน, เพิ่ม/แก้/ลบได้เฉพาะศูนย์บัญชาการและ admin
function placeRouter({ table, fields, statuses, normalize = (data) => data }) {
  const router = express.Router();
  const canEdit = [verifyToken, requireRole('command', 'admin')];

  async function findById(id) {
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (!rows[0]) throw httpError(404, 'ไม่พบข้อมูลนี้');
    return rows[0];
  }

  function validate(body, { partial }) {
    const data = normalize(pick(body, fields));
    if (!partial || body.lat !== undefined || body.lng !== undefined) {
      Object.assign(data, requireLatLng(body));
    }
    if (!partial || data.name !== undefined) {
      data.name = String(data.name || '').trim();
      if (!data.name) throw httpError(400, 'กรุณากรอกชื่อสถานที่');
    }
    if (data.status !== undefined && !statuses.includes(data.status)) {
      throw httpError(400, 'สถานะไม่ถูกต้อง');
    }
    return data;
  }

  router.get('/', async (req, res) => {
    const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY status, name`);
    res.json(rows);
  });

  router.get('/:id', async (req, res) => {
    res.json(await findById(req.params.id));
  });

  router.post('/', ...canEdit, async (req, res) => {
    const data = validate(req.body || {}, { partial: false });
    data.created_by = req.user.id;
    const [result] = await pool.query(`INSERT INTO ${table} SET ?`, [data]);
    res.status(201).json(await findById(result.insertId));
  });

  router.patch('/:id', ...canEdit, async (req, res) => {
    await findById(req.params.id);
    const data = validate(req.body || {}, { partial: true });
    if (Object.keys(data).length) {
      await pool.query(`UPDATE ${table} SET ? WHERE id = ?`, [data, req.params.id]);
    }
    res.json(await findById(req.params.id));
  });

  router.delete('/:id', ...canEdit, async (req, res) => {
    const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
    if (result.affectedRows === 0) throw httpError(404, 'ไม่พบข้อมูลนี้');
    res.status(204).end();
  });

  return router;
}

module.exports = placeRouter;
