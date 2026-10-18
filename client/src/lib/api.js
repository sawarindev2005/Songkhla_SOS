export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// fetch wrapper: ส่งคุกกี้ token (HttpOnly) อัตโนมัติ, แปลง error เป็นข้อความภาษาไทยจาก server
// redirectOn401: false สำหรับ request ที่ได้ 401 ตามปกติ (เช็ก session, login รหัสผิด)
export async function api(path, { method = 'GET', body, signal, redirectOn401 = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // token หมดอายุ → ไปหน้า login
    if (res.status === 401 && redirectOn401 && typeof window !== 'undefined') {
      // อยู่นอก React component จึงใช้ router ไม่ได้
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/login?expired=1';
    }
    const err = new Error(data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    err.status = res.status;
    throw err;
  }
  return data;
}
