const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'hy_token';
const COOKIE_PATH = '/api';
const COOKIE_MAX_AGE = 12 * 60 * 60 * 1000; // 12 ชม. ให้ตรงกับ JWT_EXPIRES_IN ค่าเริ่มต้น

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
}

// HttpOnly: JavaScript อ่าน token ไม่ได้ (กัน XSS ขโมย token)
// SameSite=Lax: ไม่ส่งคุกกี้กับ POST/PATCH/DELETE ที่มาจากเว็บอื่น (กัน CSRF)
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: COOKIE_PATH,
    maxAge: COOKIE_MAX_AGE,
  };
}

function setAuthCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
}

function clearAuthCookie(res) {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
}

// ตรวจ token จากคุกกี้ hy_token แล้วแนบ req.user = { id, role, name }
function verifyToken(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบ' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }
}

// ใช้ต่อจาก verifyToken: requireRole('command', 'admin')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' });
    }
    next();
  };
}

// ---------- ผู้แจ้ง (ประชาชน ไม่มีบัญชี) ----------
// ส่งคำขอแล้วได้คุกกี้ hy_requester เก็บ id เคสที่แจ้งจากเครื่องนี้ ใช้ยืนยันสิทธิ์ยกเลิกเคสของตัวเอง
const REQUESTER_COOKIE = 'hy_requester';
const REQUESTER_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 วัน
const REQUESTER_MAX_CASES = 10; // เท่ากับจำนวนเคสที่ client เก็บใน localStorage

// คืน id เคสของผู้แจ้งจากคุกกี้ ถ้าไม่มี/ปลอม/หมดอายุ คืน [] (ไม่ throw)
function readRequesterCases(req) {
  const token = req.cookies?.[REQUESTER_COOKIE];
  if (!token) return [];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.typ === 'requester' && Array.isArray(payload.cases) ? payload.cases.map(Number) : [];
  } catch {
    return [];
  }
}

function addRequesterCase(req, res, id) {
  const cases = [id, ...readRequesterCases(req).filter((c) => c !== id)].slice(0, REQUESTER_MAX_CASES);
  const token = jwt.sign({ typ: 'requester', cases }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(REQUESTER_COOKIE, token, { ...cookieOptions(), path: '/api/requests', maxAge: REQUESTER_MAX_AGE });
}

module.exports = {
  signToken, setAuthCookie, clearAuthCookie, verifyToken, requireRole, readRequesterCases, addRequesterCase,
};
