const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { setAuthCookie, clearAuthCookie, verifyToken } = require('../middleware/auth');

const PUBLIC_FIELDS = 'id, username, full_name, phone, role, team_name, current_lat, current_lng, location_updated_at';

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }
  if (!user.is_active) {
    return res.status(403).json({ message: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
  }

  const { password_hash, ...safeUser } = user;
  // token อยู่ในคุกกี้ HttpOnly เท่านั้น ไม่ส่งใน body ให้ JavaScript เห็น
  setAuthCookie(res, user);
  res.json({ user: safeUser });
});

// JavaScript ลบคุกกี้ HttpOnly เองไม่ได้ ต้องให้ server สั่งลบ
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

router.get('/me', verifyToken, async (req, res) => {
  const [rows] = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ? AND is_active = 1`, [req.user.id]);
  if (!rows[0]) return res.status(401).json({ message: 'ไม่พบบัญชีผู้ใช้' });
  res.json(rows[0]);
});

module.exports = router;
