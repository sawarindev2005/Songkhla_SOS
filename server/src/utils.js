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

module.exports = { httpError, requireLatLng, pick };
