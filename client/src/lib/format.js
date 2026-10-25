export const HATYAI_CENTER = [7.0086, 100.4747];

export const STATUS = {
  pending: { label: 'รอความช่วยเหลือ' },
  assigned: { label: 'มอบหมายทีมแล้ว' },
  in_progress: { label: 'กำลังช่วยเหลือ' },
  rescued: { label: 'ช่วยเหลือแล้ว' },
  cancelled: { label: 'ยกเลิก' },
};

export const URGENCY = {
  critical: { label: 'วิกฤต', hint: 'อันตรายถึงชีวิต ต้องช่วยทันที' },
  high: { label: 'เร่งด่วน', hint: 'มีผู้ป่วย/ผู้สูงอายุ หรือน้ำสูงขึ้นเร็ว' },
  medium: { label: 'ปานกลาง', hint: 'ติดอยู่ในบ้าน ยังปลอดภัย' },
  low: { label: 'ไม่เร่งด่วน', hint: 'ต้องการเสบียงหรือความช่วยเหลือทั่วไป' },
};

export const SHELTER_STATUS = {
  open: { label: 'เปิดรับ' },
  full: { label: 'เต็มแล้ว' },
  closed: { label: 'ปิด' },
};

export const DIST_STATUS = {
  active: { label: 'เปิดแจก' },
  closed: { label: 'ปิดแล้ว' },
};

export const VULNERABLE = [
  { key: 'has_elderly', label: 'ผู้สูงอายุ' },
  { key: 'has_children', label: 'เด็กเล็ก' },
  { key: 'has_disabled', label: 'ผู้พิการ' },
  { key: 'has_patient', label: 'ผู้ป่วย/ติดเตียง' },
];

// อุปกรณ์ของทีมกู้ภัย (key ตรงกับ EQUIPMENT ใน server/src/utils.js)
export const EQUIPMENT = [
  { key: 'boat', label: 'เรือ' },
  { key: 'truck', label: 'รถยกสูง' },
  { key: 'pickup', label: 'รถกระบะ' },
  { key: 'first_aid', label: 'ชุดปฐมพยาบาล' },
];

// "boat,pickup" → "เรือ, รถกระบะ"
export function equipmentLabel(value) {
  const keys = String(value || '').split(',');
  return EQUIPMENT.filter((e) => keys.includes(e.key)).map((e) => e.label).join(', ');
}

export const HOTLINES = [
  { number: '1669', label: 'เจ็บป่วยฉุกเฉิน' },
  { number: '1784', label: 'ปภ. สาธารณภัย' },
  { number: '191', label: 'เหตุด่วนเหตุร้าย' },
];

const thaiTime = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' });
const thaiDateTime = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatTime = (d) => (d ? thaiTime.format(new Date(d)) : '-');
export const formatDateTime = (d) => (d ? thaiDateTime.format(new Date(d)) : '-');
export const formatNumber = (n) => new Intl.NumberFormat('th-TH').format(n ?? 0);

export function timeAgo(d) {
  if (!d) return '-';
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'เมื่อสักครู่';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชม. ที่แล้ว`;
  return `${Math.floor(hours / 24)} วันที่แล้ว`;
}

export function formatMinutes(mins) {
  if (mins === null || mins === undefined) return '-';
  if (mins < 60) return `${mins} นาที`;
  return `${Math.floor(mins / 60)} ชม. ${mins % 60} นาที`;
}

// ระยะทาง (กม.) ระหว่างสองพิกัด
export function distanceKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km) {
  if (km == null) return '';
  return km < 1 ? `${Math.round(km * 1000)} ม.` : `${km.toFixed(1)} กม.`;
}

export const directionsUrl = (lat, lng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

export const vulnerableLabels = (r) => VULNERABLE.filter((v) => r[v.key]).map((v) => v.label);

// เลขเคสของฉันที่เคยส่ง เก็บในเครื่อง
const MY_CASES_KEY = 'hy_my_cases';
const DISMISSED_CASES_KEY = 'hy_dismissed_cases';

export function getMyCases() {
  try {
    return JSON.parse(localStorage.getItem(MY_CASES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addMyCase(caseNo) {
  try {
    const list = [caseNo, ...getMyCases().filter((c) => c !== caseNo)].slice(0, 10);
    localStorage.setItem(MY_CASES_KEY, JSON.stringify(list));
  } catch {
    // localStorage ใช้ไม่ได้ (โหมดส่วนตัว) — ไม่เป็นไร ผู้ใช้ยังเห็นเลขเคสบนจอ
  }
}

export function getDismissedCases() {
  try {
    const list = JSON.parse(localStorage.getItem(DISMISSED_CASES_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function dismissCase(caseNo) {
  try {
    const list = [caseNo, ...getDismissedCases().filter((c) => c !== caseNo)];
    localStorage.setItem(DISMISSED_CASES_KEY, JSON.stringify(list));
  } catch {
    // เก็บไม่ได้ก็ยังซ่อนการ์ดในหน้าปัจจุบันได้
  }
}
