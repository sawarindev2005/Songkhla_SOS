// error ที่ส่งข้อความกลับไปหา client ได้ (error handler ใน index.js อ่าน status/expose)
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.expose = true;
  return err;
}

function toCoord(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

// ตรวจพิกัดจาก body, โยน 400 ถ้าไม่ถูกต้อง
function requireLatLng(body) {
  const lat = toCoord(body.lat, -90, 90);
  const lng = toCoord(body.lng, -180, 180);
  if (lat === null || lng === null) throw httpError(400, 'กรุณาระบุตำแหน่งบนแผนที่');
  return { lat, lng };
}

// เลือกเฉพาะฟิลด์ที่อนุญาตจาก body สำหรับ UPDATE ... SET ?
function pick(body, fields) {
  const out = {};
  for (const f of fields) if (body[f] !== undefined) out[f] = body[f] === '' ? null : body[f];
  return out;
}

// ---------- ข้อมูลบัญชี (ใช้ทั้ง admin สร้างบัญชี และอาสาสมัครเอง) ----------

function normalizeUsername(value) {
  const username = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,50}$/.test(username)) {
    throw httpError(400, 'ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ ตัวเลข หรือ _ . - ความยาว 3–50 ตัว');
  }
  return username;
}

function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw httpError(400, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
  }
}

const EQUIPMENT = ['boat', 'truck', 'pickup', 'first_aid'];

// รับ array หรือ "boat,truck" → "boat,truck" เฉพาะค่าที่รู้จัก, ไม่มีเลย → null
function normalizeEquipment(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  const valid = EQUIPMENT.filter((e) => list.includes(e));
  return valid.length ? valid.join(',') : null;
}

// จำนวนสมาชิกทีม 1–999, ว่าง → null
function normalizeTeamSize(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1 || n > 999) throw httpError(400, 'จำนวนสมาชิกต้องอยู่ระหว่าง 1–999 คน');
  return n;
}

module.exports = {
  httpError, requireLatLng, pick, normalizeUsername, checkPassword, normalizeEquipment, normalizeTeamSize,
};
