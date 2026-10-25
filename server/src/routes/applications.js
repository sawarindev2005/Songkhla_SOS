const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  httpError, normalizeUsername, checkPassword, normalizeEquipment, normalizeTeamSize,
} = require('../utils');

const STATUSES = ['pending', 'approved', 'rejected'];
const LIST_FIELDS = `a.id, a.username, a.full_name, a.phone, a.team_name, a.team_size, a.equipment,
  a.service_area, a.status, a.reject_reason, a.reviewed_at, a.user_id, a.created_at,
  r.full_name AS reviewer_name`;

// ---------- อาสาสมัคร (ไม่ต้อง login) ----------

router.post('/', async (req, res) => {
  const b = req.body || {};
  const username = normalizeUsername(b.username);
  checkPassword(b.password);
  const fullName = String(b.full_name || '').trim();
  const phone = String(b.phone || '').replace(/[^0-9]/g, '');
  const teamName = String(b.team_name || '').trim();
  if (!fullName) throw httpError(400, 'กรุณากรอกชื่อ-นามสกุล');
  if (phone.length < 9 || phone.length > 10) throw httpError(400, 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9–10 หลัก');
  if (!teamName) throw httpError(400, 'กรุณากรอกชื่อทีมหรือหน่วยงาน');
  const teamSize = normalizeTeamSize(b.team_size) || 1;
  const serviceArea = String(b.service_area || '').trim().slice(0, 255) || null;

  const [[taken]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE username = ?) +
       (SELECT COUNT(*) FROM rescuer_applications WHERE username = ? AND status = 'pending') AS username_taken,
       (SELECT COUNT(*) FROM rescuer_applications WHERE phone = ? AND status = 'pending') AS phone_pending`,
    [username, username, phone]
  );
  if (taken.username_taken) throw httpError(409, 'ชื่อผู้ใช้นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น');
  if (taken.phone_pending) throw httpError(409, 'เบอร์นี้มีใบสมัครที่รออนุมัติอยู่แล้ว');

  const [result] = await pool.query('INSERT INTO rescuer_applications SET ?', [{
    username,
    password_hash: await bcrypt.hash(b.password, 10),
    full_name: fullName,
    phone,
    team_name: teamName,
    team_size: teamSize,
    equipment: normalizeEquipment(b.equipment),
    service_area: serviceArea,
  }]);
  res.status(201).json({ id: result.insertId });
});

// ---------- ศูนย์บัญชาการ / admin: พิจารณาใบสมัคร ----------

router.use(verifyToken, requireRole('command', 'admin'));

router.get('/', async (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : 'pending';
  const [rows] = await pool.query(
    `SELECT ${LIST_FIELDS}
     FROM rescuer_applications a LEFT JOIN users r ON r.id = a.reviewed_by
     WHERE a.status = ?
     ORDER BY ${status === 'pending' ? 'a.created_at ASC' : 'a.reviewed_at DESC'}`,
    [status]
  );
  res.json(rows);
});

router.get('/pending-count', async (req, res) => {
  const [[row]] = await pool.query("SELECT COUNT(*) AS count FROM rescuer_applications WHERE status = 'pending'");
  res.json(row);
});

// อนุมัติ = สร้างบัญชีกู้ภัยจากใบสมัคร — FOR UPDATE กันสองคนกดอนุมัติพร้อมกันแล้วได้บัญชีซ้ำ
router.patch('/:id/approve', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[app]] = await conn.query('SELECT * FROM rescuer_applications WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!app) throw httpError(404, 'ไม่พบใบสมัครนี้');
    if (app.status !== 'pending') throw httpError(409, 'ใบสมัครนี้ถูกพิจารณาไปแล้ว');
    const [[exists]] = await conn.query('SELECT id FROM users WHERE username = ?', [app.username]);
    if (exists) throw httpError(409, `ชื่อผู้ใช้ ${app.username} ถูกใช้แล้ว กรุณาปฏิเสธและให้ผู้สมัครสมัครใหม่`);

    const [result] = await conn.query('INSERT INTO users SET ?', [{
      username: app.username,
      password_hash: app.password_hash,
      full_name: app.full_name,
      phone: app.phone,
      role: 'rescuer',
      team_name: app.team_name,
      team_size: app.team_size,
      equipment: app.equipment,
      service_area: app.service_area,
    }]);
    await conn.query(
      "UPDATE rescuer_applications SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), user_id = ? WHERE id = ?",
      [req.user.id, result.insertId, app.id]
    );
    await conn.commit();
    res.json({ id: app.id, status: 'approved', user_id: result.insertId });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

router.patch('/:id/reject', async (req, res) => {
  const reason = String(req.body?.reason || '').trim();
  if (!reason) throw httpError(400, 'กรุณาระบุเหตุผลที่ไม่อนุมัติ ผู้สมัครจะเห็นข้อความนี้ตอนเข้าสู่ระบบ');
  if (reason.length > 255) throw httpError(400, 'เหตุผลยาวเกิน 255 ตัวอักษร');
  const [result] = await pool.query(
    `UPDATE rescuer_applications SET status = 'rejected', reject_reason = ?, reviewed_by = ?, reviewed_at = NOW()
     WHERE id = ? AND status = 'pending'`,
    [reason, req.user.id, req.params.id]
  );
  if (result.affectedRows === 0) throw httpError(409, 'ใบสมัครนี้ถูกพิจารณาไปแล้วหรือไม่มีอยู่');
  res.json({ id: Number(req.params.id), status: 'rejected' });
});

module.exports = router;
