const router = require('express').Router();
const pool = require('../db');
const { verifyToken, requireRole, readRequesterCases, addRequesterCase } = require('../middleware/auth');
const { httpError, requireLatLng } = require('../utils');

const URGENCIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['pending', 'assigned', 'in_progress', 'rescued', 'cancelled'];
const ACTIVE = "('pending','assigned','in_progress')";
// ผู้แจ้งยกเลิกเองได้ก่อนทีมเริ่มเข้าช่วยเหลือ
const CANCELLABLE = ['pending', 'assigned'];

// ข้อมูลที่เปิดให้ประชาชนเห็นบนแผนที่ (ไม่มีเบอร์โทร)
const PUBLIC_FIELDS = `r.id, r.case_no, r.people_count, r.has_elderly, r.has_children, r.has_disabled,
  r.has_patient, r.urgency, r.description, r.address_note, r.lat, r.lng, r.status, r.created_at`;

const FULL_SELECT = `
  SELECT r.*, u.full_name AS rescuer_name, u.team_name AS rescuer_team, u.phone AS rescuer_phone
  FROM help_requests r
  LEFT JOIN users u ON u.id = r.assigned_to`;

const flag = (v) => (v ? 1 : 0);

async function findById(id) {
  const [rows] = await pool.query(`${FULL_SELECT} WHERE r.id = ?`, [id]);
  if (!rows[0]) throw httpError(404, 'ไม่พบเคสนี้');
  return rows[0];
}

// ---------- ประชาชน (ไม่ต้อง login) ----------

router.get('/public', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_FIELDS} FROM help_requests r WHERE r.status IN ${ACTIVE} ORDER BY r.created_at DESC`
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  const { lat, lng } = requireLatLng(b);
  const name = String(b.requester_name || '').trim();
  const phone = String(b.phone || '').replace(/[^0-9]/g, '');
  if (!name) throw httpError(400, 'กรุณากรอกชื่อผู้ขอความช่วยเหลือ');
  if (phone.length < 9 || phone.length > 10) throw httpError(400, 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9–10 หลัก');
  const people = Math.max(1, Math.min(999, parseInt(b.people_count, 10) || 1));
  const urgency = URGENCIES.includes(b.urgency) ? b.urgency : 'medium';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO help_requests
        (requester_name, phone, people_count, has_elderly, has_children, has_disabled, has_patient,
         urgency, description, address_note, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, people, flag(b.has_elderly), flag(b.has_children), flag(b.has_disabled),
        flag(b.has_patient), urgency, b.description || null, b.address_note || null, lat, lng]
    );
    // เลขเคสอัตโนมัติ: HY-00001
    const caseNo = `HY-${String(result.insertId).padStart(5, '0')}`;
    await conn.query('UPDATE help_requests SET case_no = ? WHERE id = ?', [caseNo, result.insertId]);
    await conn.commit();
    addRequesterCase(req, res, result.insertId);
    res.status(201).json({ id: result.insertId, case_no: caseNo });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

router.get('/track/:caseNo', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_FIELDS}, r.assigned_at, r.resolved_at, r.updated_at,
            u.team_name AS rescuer_team, u.phone AS rescuer_phone,
            (SELECT COUNT(*) FROM help_requests q
              WHERE q.status = 'pending' AND q.created_at < r.created_at) AS queue_ahead
     FROM help_requests r
     LEFT JOIN users u ON u.id = r.assigned_to
     WHERE r.case_no = ?`,
    [String(req.params.caseNo).trim().toUpperCase()]
  );
  const row = rows[0];
  if (!row) throw httpError(404, 'ไม่พบเลขเคสนี้ กรุณาตรวจสอบอีกครั้ง');
  row.can_cancel = CANCELLABLE.includes(row.status) && readRequesterCases(req).includes(row.id);
  res.json(row);
});

// ผู้แจ้งยกเลิกเคสของตัวเอง — ยืนยันความเป็นเจ้าของจาก JWT ในคุกกี้ hy_requester
// ตอบ 403 ไม่ใช่ 401 เพื่อไม่ให้ client พาไปหน้า login เจ้าหน้าที่
// WHERE status กันชนกับทีมที่เพิ่งกดเริ่มช่วยเหลือพร้อมกัน
router.patch('/:id/cancel', async (req, res) => {
  const id = Number(req.params.id);
  if (!readRequesterCases(req).includes(id)) throw httpError(403, 'ยกเลิกได้เฉพาะเคสที่แจ้งจากเครื่องนี้');
  const [result] = await pool.query(
    `UPDATE help_requests SET status = 'cancelled', resolved_at = NOW()
     WHERE id = ? AND status IN (?)`,
    [id, CANCELLABLE]
  );
  if (result.affectedRows === 0) {
    throw httpError(409, 'ยกเลิกไม่ได้ ทีมกำลังเข้าช่วยเหลือหรือเคสปิดไปแล้ว หากไม่ต้องการความช่วยเหลือแล้ว กรุณาโทรแจ้งทีม');
  }
  res.json({ id, status: 'cancelled' });
});

// ---------- เจ้าหน้าที่ ----------

router.use(verifyToken);

router.get('/', requireRole('rescuer', 'command', 'admin'), async (req, res) => {
  const { status } = req.query;
  const where = [];
  const params = [];
  if (status === 'active') {
    where.push(`r.status IN ${ACTIVE}`);
  } else if (STATUSES.includes(status)) {
    where.push('r.status = ?');
    params.push(status);
  }
  const [rows] = await pool.query(
    `${FULL_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY FIELD(r.urgency, 'critical','high','medium','low'), r.created_at ASC`,
    params
  );
  res.json(rows);
});

router.get('/mine', requireRole('rescuer'), async (req, res) => {
  const [rows] = await pool.query(
    `${FULL_SELECT} WHERE r.assigned_to = ?
     ORDER BY FIELD(r.status, 'in_progress','assigned','rescued','cancelled'), r.updated_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// กู้ภัยกดรับเคสเอง — WHERE status='pending' กันสองทีมรับเคสเดียวกัน
router.patch('/:id/accept', requireRole('rescuer'), async (req, res) => {
  const [result] = await pool.query(
    `UPDATE help_requests
     SET status = 'assigned', assigned_to = ?, assigned_by = ?, assigned_at = NOW()
     WHERE id = ? AND status = 'pending'`,
    [req.user.id, req.user.id, req.params.id]
  );
  if (result.affectedRows === 0) throw httpError(409, 'เคสนี้ถูกรับไปแล้วหรือไม่อยู่ในสถานะรอช่วยเหลือ');
  res.json(await findById(req.params.id));
});

// ศูนย์บัญชาการมอบหมายเคสให้กู้ภัย
router.patch('/:id/assign', requireRole('command', 'admin'), async (req, res) => {
  const rescuerId = Number(req.body?.rescuer_id);
  const [users] = await pool.query(
    "SELECT id FROM users WHERE id = ? AND role = 'rescuer' AND is_active = 1",
    [rescuerId]
  );
  if (!users[0]) throw httpError(400, 'กรุณาเลือกหน่วยกู้ภัยที่ใช้งานได้');

  const [result] = await pool.query(
    `UPDATE help_requests
     SET status = 'assigned', assigned_to = ?, assigned_by = ?, assigned_at = NOW()
     WHERE id = ? AND status IN ('pending','assigned')`,
    [rescuerId, req.user.id, req.params.id]
  );
  if (result.affectedRows === 0) throw httpError(409, 'มอบหมายได้เฉพาะเคสที่ยังไม่เริ่มช่วยเหลือ');
  res.json(await findById(req.params.id));
});

// เปลี่ยนสถานะ: กู้ภัยเปลี่ยนได้เฉพาะเคสของตัวเอง, ศูนย์ฯ/admin เปลี่ยนได้ทุกเคส
const RESCUER_TRANSITIONS = {
  assigned: ['in_progress', 'pending'],
  in_progress: ['rescued', 'pending'],
};

router.patch('/:id/status', requireRole('rescuer', 'command', 'admin'), async (req, res) => {
  const next = req.body?.status;
  if (!STATUSES.includes(next)) throw httpError(400, 'สถานะไม่ถูกต้อง');
  const current = await findById(req.params.id);

  if (req.user.role === 'rescuer') {
    if (current.assigned_to !== req.user.id) throw httpError(403, 'เคสนี้ไม่ได้มอบหมายให้คุณ');
    if (!(RESCUER_TRANSITIONS[current.status] || []).includes(next)) {
      throw httpError(400, 'ไม่สามารถเปลี่ยนสถานะจากขั้นตอนปัจจุบันได้');
    }
  } else if ((next === 'assigned' || next === 'in_progress') && !current.assigned_to) {
    throw httpError(400, 'กรุณามอบหมายหน่วยกู้ภัยก่อน');
  }

  // คืนเคสกลับเข้าคิว = ล้างผู้รับผิดชอบ
  const fields = { status: next };
  if (next === 'pending') Object.assign(fields, { assigned_to: null, assigned_by: null, assigned_at: null });
  if (next === 'rescued' || next === 'cancelled') fields.resolved_at = new Date();
  else fields.resolved_at = null;

  await pool.query('UPDATE help_requests SET ? WHERE id = ?', [fields, req.params.id]);
  res.json(await findById(req.params.id));
});

module.exports = router;
