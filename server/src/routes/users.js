const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  httpError, requireLatLng, pick, normalizeUsername, checkPassword, normalizeEquipment, normalizeTeamSize,
} = require('../utils');

const ROLES = ['rescuer', 'command', 'admin'];
const SAFE_FIELDS = `id, username, full_name, phone, role, team_name, team_size, equipment, service_area,
  current_lat, current_lng, location_updated_at, is_active, created_at`;

// จำนวนเคสที่กำลังทำอยู่ของกู้ภัยแต่ละคน
const ACTIVE_MISSIONS = `(SELECT COUNT(*) FROM help_requests r
  WHERE r.assigned_to = u.id AND r.status IN ('assigned','in_progress')) AS active_missions`;

// ---------- ประชาชน: ตำแหน่งทีมกู้ภัยบนแผนที่ (ไม่มีชื่อ/เบอร์) ----------
router.get('/rescuers/public', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.team_name, u.current_lat, u.current_lng, u.location_updated_at, ${ACTIVE_MISSIONS}
     FROM users u
     WHERE u.role = 'rescuer' AND u.is_active = 1 AND u.current_lat IS NOT NULL
       AND u.location_updated_at > NOW() - INTERVAL 1 DAY`
  );
  res.json(rows);
});

router.use(verifyToken);

// ---------- กู้ภัย: มาร์คตำแหน่งตัวเอง ----------
router.patch('/me/location', requireRole('rescuer'), async (req, res) => {
  const { lat, lng } = requireLatLng(req.body || {});
  await pool.query(
    'UPDATE users SET current_lat = ?, current_lng = ?, location_updated_at = NOW() WHERE id = ?',
    [lat, lng, req.user.id]
  );
  const [rows] = await pool.query(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`, [req.user.id]);
  res.json(rows[0]);
});

// ---------- ศูนย์บัญชาการ: รายชื่อกู้ภัยพร้อมตำแหน่ง ----------
router.get('/rescuers', requireRole('command', 'admin'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT ${SAFE_FIELDS.replace(/(\w+)/g, 'u.$1')}, ${ACTIVE_MISSIONS}
     FROM users u WHERE u.role = 'rescuer' AND u.is_active = 1
     ORDER BY u.team_name, u.full_name`
  );
  res.json(rows);
});

// ---------- Admin: จัดการบัญชีทุกคน ----------
router.use(requireRole('admin'));

async function findById(id) {
  const [rows] = await pool.query(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`, [id]);
  if (!rows[0]) throw httpError(404, 'ไม่พบบัญชีนี้');
  return rows[0];
}

// ข้อมูลทีมกู้ภัย: ตรวจ/แปลงเฉพาะฟิลด์ที่ส่งมา
function normalizeRescuerFields(data) {
  if (data.team_size !== undefined) data.team_size = normalizeTeamSize(data.team_size);
  if (data.equipment !== undefined) data.equipment = normalizeEquipment(data.equipment);
}

router.get('/', async (req, res) => {
  const { role } = req.query;
  const [rows] = await pool.query(
    `SELECT ${SAFE_FIELDS} FROM users ${ROLES.includes(role) ? 'WHERE role = ?' : ''}
     ORDER BY FIELD(role, 'admin','command','rescuer'), created_at DESC`,
    ROLES.includes(role) ? [role] : []
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  const data = pick(b, ['username', 'full_name', 'phone', 'role', 'team_name', 'team_size', 'equipment', 'service_area']);
  data.username = normalizeUsername(data.username);
  data.full_name = String(data.full_name || '').trim();
  if (!data.full_name) throw httpError(400, 'กรุณากรอกชื่อ-นามสกุล');
  normalizeRescuerFields(data);
  if (!ROLES.includes(data.role)) throw httpError(400, 'กรุณาเลือกบทบาท');
  checkPassword(b.password);
  data.password_hash = await bcrypt.hash(b.password, 10);

  const [result] = await pool.query('INSERT INTO users SET ?', [data]);
  res.status(201).json(await findById(result.insertId));
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await findById(id);
  const b = req.body || {};
  const data = pick(b, ['full_name', 'phone', 'role', 'team_name', 'team_size', 'equipment', 'service_area', 'is_active']);
  normalizeRescuerFields(data);

  if (data.role !== undefined && !ROLES.includes(data.role)) throw httpError(400, 'บทบาทไม่ถูกต้อง');
  if (data.is_active !== undefined) data.is_active = data.is_active ? 1 : 0;
  if (id === req.user.id && (data.is_active === 0 || (data.role && data.role !== 'admin'))) {
    throw httpError(400, 'ไม่สามารถระงับหรือลดสิทธิ์บัญชีของตัวเองได้');
  }
  if (b.password) {
    checkPassword(b.password);
    data.password_hash = await bcrypt.hash(b.password, 10);
  }

  if (Object.keys(data).length) {
    await pool.query('UPDATE users SET ? WHERE id = ?', [data, id]);
  }
  res.json(await findById(id));
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw httpError(400, 'ไม่สามารถลบบัญชีของตัวเองได้');
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  if (result.affectedRows === 0) throw httpError(404, 'ไม่พบบัญชีนี้');
  // เคสที่ค้างอยู่กับบัญชีที่ถูกลบ (assigned_to ถูก SET NULL) ให้กลับเข้าคิว
  await pool.query(
    "UPDATE help_requests SET status = 'pending', assigned_at = NULL WHERE assigned_to IS NULL AND status IN ('assigned','in_progress')"
  );
  res.status(204).end();
});

module.exports = router;
