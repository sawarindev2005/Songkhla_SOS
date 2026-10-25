# สรุป API — ระบบขอความช่วยเหลือน้ำท่วมหาดใหญ่

- เซิร์ฟเวอร์: Express 5 + MySQL (`server/src/index.js`)
- Base URL: `http://localhost:4000/api` (ตั้งพอร์ตด้วย `PORT` ใน `server/.env`)
- รับ/ส่ง JSON ทั้งหมด, CORS เปิดให้เฉพาะ `CLIENT_ORIGIN` (ค่าเริ่มต้น `http://localhost:3000`)
- ฝั่ง client เรียกผ่าน `api()` ใน `client/src/lib/api.js` (ตั้ง URL ด้วย `NEXT_PUBLIC_API_URL`)

สัญลักษณ์ในตาราง
- **สาธารณะ** = ไม่ต้องมี token
- **🔒 role** = ต้องมีคุกกี้ `hy_token` (ได้มาตอน login) และบทบาทต้องอยู่ในรายการ

บทบาท (`users.role`): `rescuer` กู้ภัย · `command` ศูนย์บัญชาการ · `admin` ผู้ดูแลระบบ

---

## 1. Auth — `server/src/routes/auth.js`

| Method | Path | สิทธิ์ | ทำอะไร |
|---|---|---|---|
| POST | `/auth/login` | สาธารณะ | body `{ username, password }` → ตั้งคุกกี้ `hy_token` (HttpOnly) และตอบ `{ user }` (ตรวจรหัสด้วย bcrypt, บัญชีที่ `is_active = 0` ได้ 403) |
| POST | `/auth/logout` | สาธารณะ | ลบคุกกี้ `hy_token` → 204 |
| GET | `/auth/me` | 🔒 ทุกบทบาท | ข้อมูลบัญชีของ token ปัจจุบัน (client เรียกตอนเปิดเว็บเพื่อเช็กว่ายังล็อกอินอยู่) |

## 2. คำขอความช่วยเหลือ — `server/src/routes/requests.js`

| Method | Path | สิทธิ์ | ทำอะไร |
|---|---|---|---|
| GET | `/requests/public` | สาธารณะ | เคสที่ยังไม่จบ (`pending/assigned/in_progress`) สำหรับแผนที่ — **ไม่มีชื่อและเบอร์โทร** |
| POST | `/requests` | สาธารณะ | ส่งคำขอ body: `requester_name`, `phone` (9–10 หลัก), `lat`, `lng`, `people_count`, `urgency` (`low/medium/high/critical`), `has_elderly/has_children/has_disabled/has_patient`, `description`, `address_note` → `201 { id, case_no }` เลขเคสรูปแบบ `HY-00001` |
| GET | `/requests/track/:caseNo` | สาธารณะ | ติดตามเคสด้วยเลขเคส + ทีมที่รับ + `queue_ahead` (จำนวนเคสที่รอก่อนหน้า) + `can_cancel` (เครื่องนี้เป็นผู้แจ้งและยังยกเลิกได้) |
| PATCH | `/requests/:id/cancel` | ผู้แจ้ง (คุกกี้ `hy_requester`) | ยกเลิกเคสของตัวเอง เฉพาะสถานะ `pending`/`assigned` — คุกกี้ JWT นี้ได้ตอนส่งคำขอ (อายุ 7 วัน เก็บสูงสุด 10 เคส) |
| GET | `/requests?status=` | 🔒 rescuer, command, admin | ทุกเคสแบบเต็ม (มีชื่อ/เบอร์) `status` = `active` หรือชื่อสถานะ เรียงตามความด่วน |
| GET | `/requests/mine` | 🔒 rescuer | เคสที่มอบหมายให้ตัวเอง |
| PATCH | `/requests/:id/accept` | 🔒 rescuer | กดรับเคสเอง (รับได้เฉพาะ `pending` ถ้าทีมอื่นรับไปแล้วได้ 409) |
| PATCH | `/requests/:id/assign` | 🔒 command, admin | body `{ rescuer_id }` มอบหมายเคสให้กู้ภัย |
| PATCH | `/requests/:id/status` | 🔒 rescuer, command, admin | body `{ status }` — กู้ภัยเปลี่ยนได้เฉพาะเคสตัวเอง ตามลำดับ `assigned → in_progress → rescued` หรือคืนเป็น `pending` ส่วนศูนย์ฯ/admin เปลี่ยนได้ทุกเคส |

สถานะเคส: `pending` → `assigned` → `in_progress` → `rescued` (หรือ `cancelled`)

## 3. ที่พักพิง และ จุดแจกจ่าย — `server/src/routes/placeRouter.js`

สองชุดนี้ใช้โค้ด CRUD ตัวเดียวกัน (`placeRouter`) ต่างกันแค่ตารางและฟิลด์

| Method | Path | สิทธิ์ | ทำอะไร |
|---|---|---|---|
| GET | `/shelters` · `/distributions` | สาธารณะ | รายการทั้งหมด |
| GET | `/shelters/:id` · `/distributions/:id` | สาธารณะ | รายการเดียว |
| POST | `/shelters` · `/distributions` | 🔒 command, admin | เพิ่ม (ต้องมี `name`, `lat`, `lng`) |
| PATCH | `/shelters/:id` · `/distributions/:id` | 🔒 command, admin | แก้บางฟิลด์ |
| DELETE | `/shelters/:id` · `/distributions/:id` | 🔒 command, admin | ลบ → 204 |

- ที่พักพิง (`shelters.js`): `name, address, capacity, current_occupancy, contact_phone, facilities, status` — status `open / full / closed`
- จุดแจกจ่าย (`distributions.js`): `name, address, supply_types, open_time, close_time, contact_phone, status` — status `active / closed`

## 4. ผู้ใช้ / กู้ภัย — `server/src/routes/users.js`

| Method | Path | สิทธิ์ | ทำอะไร |
|---|---|---|---|
| GET | `/users/rescuers/public` | สาธารณะ | ตำแหน่งทีมกู้ภัยบนแผนที่ (เฉพาะที่อัปเดตใน 24 ชม. ไม่มีชื่อ/เบอร์) |
| PATCH | `/users/me/location` | 🔒 rescuer | body `{ lat, lng }` อัปเดตตำแหน่งตัวเอง |
| GET | `/users/rescuers` | 🔒 command, admin | รายชื่อกู้ภัยพร้อมตำแหน่งและจำนวนงานที่กำลังทำ |
| GET | `/users?role=` | 🔒 admin | บัญชีทั้งหมด |
| POST | `/users` | 🔒 admin | สร้างบัญชี body `username, password (≥8), full_name, phone, role, team_name` |
| PATCH | `/users/:id` | 🔒 admin | แก้ข้อมูล/บทบาท/ระงับ (`is_active`)/รหัสผ่าน — ระงับหรือลดสิทธิ์ตัวเองไม่ได้ |
| DELETE | `/users/:id` | 🔒 admin | ลบบัญชี เคสที่ค้างอยู่กลับเข้าคิว `pending` — ลบตัวเองไม่ได้ |

## 5. แดชบอร์ด — `server/src/routes/dashboard.js`

| Method | Path | สิทธิ์ | ทำอะไร |
|---|---|---|---|
| GET | `/dashboard/public` | สาธารณะ | ตัวเลขหน้าแรก: `pending, in_progress, rescued, active_teams, open_shelters, available_beds, active_distributions, rescuers_on_map` |
| GET | `/dashboard/summary` | 🔒 command, admin | ตัวเลขหน้าแรก + แยกตามสถานะ/ความด่วน, สถิติ 7 วัน, เวลาตอบสนองเฉลี่ย, ผลงานแต่ละทีม, 10 เคสล่าสุด |

## 6. อื่นๆ

| Method | Path | ทำอะไร |
|---|---|---|
| GET | `/health` | เช็กว่าต่อฐานข้อมูลได้ → `{ ok: true }` |

### รูปแบบ error
ทุก error ตอบเป็น `{ "message": "ข้อความภาษาไทย" }`

| Status | ความหมาย |
|---|---|
| 400 | ข้อมูลไม่ถูกต้อง |
| 401 | ไม่มีคุกกี้ token / token หมดอายุหรือไม่ถูกต้อง / รหัสผ่านผิด |
| 403 | บทบาทไม่มีสิทธิ์ หรือบัญชีถูกระงับ |
| 404 | ไม่พบข้อมูล หรือไม่มี API นี้ |
| 409 | ข้อมูลชนกัน (เคสถูกรับไปแล้ว, username ซ้ำ) |
| 503 | ต่อฐานข้อมูลไม่ได้ |

ตัวจัดการ error กลางอยู่ท้าย `server/src/index.js` ส่วน `httpError()` สำหรับโยน error ที่ส่งข้อความกลับได้อยู่ใน `server/src/utils.js`

---

# JWT ใช้ตรงไหน

## ภาพรวมการทำงาน

```
[หน้า /login]  POST /auth/login {username,password}
      │
      ▼
[server] ตรวจรหัสด้วย bcrypt → setAuthCookie() ตั้งคุกกี้ hy_token (HttpOnly) → ตอบ { user }
      │
      ▼  ทุก request ต่อจากนี้
[client] api() ใช้ fetch(..., { credentials: 'include' }) browser แนบคุกกี้ให้เอง
      │
      ▼
[server] cookie-parser อ่านคุกกี้ → verifyToken ถอด token ได้ req.user = { id, role, name }
         requireRole(...) → เช็กบทบาท ไม่ผ่านได้ 403
      │
      ▼  ถ้า token หมดอายุ/ไม่ถูกต้อง → 401
[client] api() พาไป /login?expired=1

[เปิดเว็บใหม่/รีเฟรช]  AuthProvider เรียก GET /auth/me → ได้ user = ยังล็อกอินอยู่, ได้ 401 = ยังไม่ login
[logout]              POST /auth/logout → server ลบคุกกี้
```

## เก็บอะไรในคุกกี้

เก็บ **JWT ตัวเดียว** ในคุกกี้ `hy_token` ตั้งค่าใน `cookieOptions()` (`server/src/middleware/auth.js`)

| ค่า | ทำไม |
|---|---|
| `httpOnly: true` | JavaScript บนหน้าเว็บอ่าน token ไม่ได้ (`document.cookie` มองไม่เห็น) ถ้ามี XSS ก็ขโมย token ไปไม่ได้ |
| `secure` | เปิดเมื่อ `NODE_ENV=production` ให้ส่งคุกกี้ผ่าน HTTPS เท่านั้น (ตอน dev ใช้ http://localhost จึงปิด) |
| `sameSite: 'lax'` | browser ไม่แนบคุกกี้กับ POST/PATCH/DELETE ที่มาจากเว็บอื่น ช่วยกัน CSRF (localhost:3000 กับ :4000 นับเป็น same-site) |
| `path: '/api'` | ส่งคุกกี้เฉพาะ request ที่ขึ้นต้นด้วย `/api` |
| `maxAge: 12 ชม.` | ให้คุกกี้หมดอายุพร้อม JWT |

ข้อมูลผู้ใช้ (ชื่อ, บทบาท ฯลฯ) **ไม่ได้เก็บในคุกกี้หรือ localStorage** — client ขอจาก `/auth/me` แล้วเก็บไว้ใน React state เท่านั้น

## ฝั่ง server

| ไฟล์ | หน้าที่ |
|---|---|
| `server/src/middleware/auth.js` | **`signToken(user)`** สร้าง token ด้วย `jsonwebtoken` ใส่ payload `{ id, role, name }` เซ็นด้วย `JWT_SECRET` อายุตาม `JWT_EXPIRES_IN` (ค่าเริ่มต้น `12h`) |
| `server/src/middleware/auth.js` | **`cookieOptions()`**, **`setAuthCookie(res, user)`**, **`clearAuthCookie(res)`** ตั้ง/ลบคุกกี้ `hy_token` |
| `server/src/middleware/auth.js` | **`verifyToken`** อ่าน `req.cookies.hy_token` แล้ว `jwt.verify()` ผ่านแล้วแนบ `req.user` ไม่ผ่านตอบ 401 |
| `server/src/middleware/auth.js` | **`requireRole(...roles)`** ใช้ต่อจาก `verifyToken` เช็ก `req.user.role` ไม่ตรงตอบ 403 |
| `server/src/index.js` | `cors({ origin, credentials: true })` ให้รับ/ส่งคุกกี้ข้าม origin ได้ และ `app.use(cookieParser())` |
| `server/src/routes/auth.js` | `/login` เรียก `setAuthCookie` (ไม่ส่ง token ใน body), `/logout` เรียก `clearAuthCookie`, `/me` ใช้ `verifyToken` |
| `server/src/routes/requests.js` | `router.use(verifyToken)` — ทุก route **ที่อยู่ใต้บรรทัดนี้** ต้องมี token (route สาธารณะประกาศไว้ก่อนบรรทัดนี้) |
| `server/src/routes/users.js` | `router.use(verifyToken)` แล้วต่อด้วย `router.use(requireRole('admin'))` สำหรับส่วนจัดการบัญชี |
| `server/src/routes/placeRouter.js` | `canEdit = [verifyToken, requireRole('command','admin')]` ใช้กับ POST/PATCH/DELETE |
| `server/src/routes/dashboard.js` | `/dashboard/summary` ใช้ `verifyToken, requireRole('command','admin')` |
| `server/src/index.js` | ถ้าไม่ได้ตั้ง `JWT_SECRET` เซิร์ฟเวอร์จะไม่ยอมเปิด |
| `server/.env` | `JWT_SECRET` (คีย์เซ็น ต้องเป็นค่าสุ่มยาวๆ), `JWT_EXPIRES_IN`, `NODE_ENV=production` ตอนขึ้นจริงเพื่อเปิด `secure` |

นอกจากนี้ handler หลายตัวใช้ `req.user.id` ที่ได้จาก token เช่น รับเคส (`accept`), เคสของฉัน (`mine`), อัปเดตตำแหน่ง (`me/location`), `created_by` ตอนเพิ่มสถานที่ และกันแอดมินลบ/ระงับตัวเอง

## ฝั่ง client

| ไฟล์ | หน้าที่ |
|---|---|
| `client/src/lib/api.js` | `api()` ส่ง `credentials: 'include'` ทุก request (ไม่ได้แตะ token เอง) ได้ 401 → ไป `/login?expired=1` ยกเว้นส่ง `redirectOn401: false` |
| `client/src/lib/auth.js` | `AuthProvider` เรียก `/auth/me` ตอนเปิดเว็บ, `login()` เรียก `/auth/login` แล้วเก็บ `user` ใน state, `logout()` เรียก `/auth/logout` |
| `client/src/lib/auth.js` | `useRequireRole(roles)` กันหน้าตามบทบาทฝั่ง client (ไม่มี login → `/login`, บทบาทไม่ตรง → หน้าของบทบาทตัวเอง) ใช้ใน `client/src/app/rescuer/layout.js` และ `client/src/components/StaffShell.jsx` |
| `client/src/app/login/page.js` | ฟอร์ม login เรียก `login()` แล้วพาไปหน้าตาม `ROLE_HOME` |
| `client/src/components/pk/PublicShell.jsx` | หน้าคนทั่วไปอ่าน `user` เพื่อเปลี่ยนแท็บขวาสุดเป็น "หน้าเจ้าหน้าที่" |

> การกันหน้าฝั่ง client มีไว้เพื่อ UX เท่านั้น สิทธิ์จริงตรวจที่ server ทุก request ผ่าน `verifyToken` + `requireRole`

## ข้อควรรู้

- **token ไม่ถูกเพิกถอนทันที**: `verifyToken` เชื่อ `role` ใน token โดยไม่เช็กฐานข้อมูล ถ้าแอดมินระงับบัญชีหรือเปลี่ยนบทบาท token เดิมยังเรียก API ได้จนหมดอายุ (สูงสุด `JWT_EXPIRES_IN`) แต่ตอนรีเฟรชหน้า `/auth/me` จะเช็ก `is_active` และไม่ให้เข้า
- token อยู่ในคุกกี้ HttpOnly JavaScript อ่านไม่ได้ แต่ XSS ยังสั่ง request ในนามผู้ใช้ได้ระหว่างที่เปิดหน้าอยู่ — HttpOnly กันการ "ขโมย token ไปใช้ที่อื่น" ไม่ได้กัน XSS ทั้งหมด
- ถ้าเปลี่ยน `JWT_EXPIRES_IN` ควรแก้ `COOKIE_MAX_AGE` ใน `server/src/middleware/auth.js` ให้ตรงกันด้วย
- ถ้าเปลี่ยน `JWT_SECRET` ทุกคนต้อง login ใหม่ (token เก่าใช้ไม่ได้ทั้งหมด)
