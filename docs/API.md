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
| POST | `/auth/login` | สาธารณะ | body `{ username, password }` → ตั้งคุกกี้ `hy_token` (HttpOnly) และตอบ `{ user }` (ตรวจรหัสด้วย bcrypt, บัญชีที่ `is_active = 0` ได้ 403) — ถ้ายังไม่มีบัญชีแต่มีใบสมัครกู้ภัยที่รหัสผ่านตรง ได้ 403 พร้อมข้อความ "รออนุมัติ" หรือ "ไม่ผ่านการอนุมัติ: <เหตุผล>" |
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
| POST | `/users` | 🔒 admin | สร้างบัญชี body `username, password (≥8), full_name, phone, role, team_name` และสำหรับกู้ภัย `team_size, equipment, service_area` |
| PATCH | `/users/:id` | 🔒 admin | แก้ข้อมูล/บทบาท/ระงับ (`is_active`)/รหัสผ่าน — ระงับหรือลดสิทธิ์ตัวเองไม่ได้ |
| DELETE | `/users/:id` | 🔒 admin | ลบบัญชี เคสที่ค้างอยู่กลับเข้าคิว `pending` — ลบตัวเองไม่ได้ |

### สมัครอาสากู้ภัย — `server/src/routes/applications.js`

อาสาสมัครส่งใบสมัครเอง ยังเข้าสู่ระบบไม่ได้จนกว่าศูนย์บัญชาการหรือ admin อนุมัติ (อนุมัติแล้วจึงสร้างแถวใน `users` บทบาท `rescuer`)

| Method | Path | สิทธิ์ | ทำอะไร |
|---|---|---|---|
| POST | `/applications` | สาธารณะ | body `username, password (≥8), full_name, phone (9–10 หลัก), team_name, team_size (1–999), equipment (array จาก boat/truck/pickup/first_aid), service_area` → `201 { id }` — ชื่อผู้ใช้ซ้ำกับบัญชีหรือใบสมัครที่รออยู่ หรือเบอร์มีใบสมัครรออยู่แล้ว ได้ 409 |
| GET | `/applications?status=` | 🔒 command, admin | รายการใบสมัคร `status` = `pending` (ค่าเริ่มต้น) / `approved` / `rejected` |
| GET | `/applications/pending-count` | 🔒 command, admin | `{ count }` จำนวนที่รออนุมัติ (ตัวเลขบนเมนู) |
| PATCH | `/applications/:id/approve` | 🔒 command, admin | สร้างบัญชีกู้ภัยจากใบสมัคร (ใช้รหัสผ่านที่ผู้สมัครตั้งไว้) — พิจารณาไปแล้วได้ 409 |
| PATCH | `/applications/:id/reject` | 🔒 command, admin | body `{ reason }` (บังคับ) ผู้สมัครเห็นเหตุผลตอนพยายาม login |

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
| 401 | ไม่มีคุกกี้ `hy_token` / token หมดอายุหรือไม่ถูกต้อง / รหัสผ่านผิด |
| 403 | บทบาทไม่มีสิทธิ์ หรือบัญชีถูกระงับ |
| 404 | ไม่พบข้อมูล หรือไม่มี API นี้ |
| 409 | ข้อมูลชนกัน (เคสถูกรับไปแล้ว, username ซ้ำ) |
| 503 | ต่อฐานข้อมูลไม่ได้ |

ตัวจัดการ error กลางอยู่ท้าย `server/src/index.js` ส่วน `httpError()` สำหรับโยน error ที่ส่งข้อความกลับได้อยู่ใน `server/src/utils.js`

---

# Cookies และ JWT ใช้ตรงไหน

## สรุปสั้น

ระบบใช้ **JWT 2 ตัว** เก็บใน **คุกกี้ HttpOnly 2 ใบ** เซ็นด้วย `JWT_SECRET` เดียวกัน (ไลบรารี `jsonwebtoken`) โค้ดทั้งหมดอยู่ใน `server/src/middleware/auth.js`

| คุกกี้ | ใช้กับใคร | ได้มาตอนไหน | payload ใน JWT | อายุ | `path` | ใช้ทำอะไร |
|---|---|---|---|---|---|---|
| `hy_token` | เจ้าหน้าที่ (rescuer / command / admin) | `POST /auth/login` สำเร็จ | `{ id, role, name }` | 12 ชม. (`JWT_EXPIRES_IN`) | `/api` | ยืนยันตัวตนและสิทธิ์ทุก route ที่มี 🔒 |
| `hy_requester` | ประชาชนผู้แจ้ง (ไม่มีบัญชี) | `POST /requests` สำเร็จ | `{ typ: 'requester', cases: [id, ...] }` | 7 วัน | `/api/requests` | พิสูจน์ว่าเครื่องนี้เป็นผู้แจ้งเคส เพื่อ **ยกเลิกเคสของตัวเอง** |

ทั้งสองใบตั้งค่าด้วย `cookieOptions()` ชุดเดียวกัน

| ค่า | ทำไม |
|---|---|
| `httpOnly: true` | JavaScript บนหน้าเว็บอ่าน token ไม่ได้ (`document.cookie` มองไม่เห็น) ถ้ามี XSS ก็ขโมย token ไปใช้ที่อื่นไม่ได้ |
| `secure` | เปิดเมื่อ `NODE_ENV=production` ให้ส่งคุกกี้ผ่าน HTTPS เท่านั้น (ตอน dev ใช้ http://localhost จึงปิด) |
| `sameSite: 'lax'` | browser ไม่แนบคุกกี้กับ POST/PATCH/DELETE ที่มาจากเว็บอื่น ช่วยกัน CSRF (localhost:3000 กับ :4000 นับเป็น same-site) |
| `path` | `hy_token` ส่งเฉพาะ request ที่ขึ้นต้นด้วย `/api` ส่วน `hy_requester` แคบกว่า ส่งเฉพาะ `/api/requests...` |
| `maxAge` | ให้คุกกี้หมดอายุพร้อม JWT ข้างใน |

> ฝั่ง client **ไม่เคยแตะ token เลย** — browser แนบคุกกี้ให้เองเพราะ `api()` ส่ง `credentials: 'include'` ทุก request และ server ต้องเปิด `cors({ credentials: true })`

## 1) `hy_token` — login ของเจ้าหน้าที่

### ลำดับการทำงาน

```
[หน้า /login]  POST /auth/login {username,password}
      │
      ▼
[server] ตรวจรหัสด้วย bcrypt → signToken() สร้าง JWT → setAuthCookie() ตั้งคุกกี้ hy_token → ตอบ { user }
         (ไม่ส่ง token ใน body ให้ JavaScript เห็น)
      │
      ▼  ทุก request ต่อจากนี้
[client] api() ใช้ fetch(..., { credentials: 'include' }) browser แนบคุกกี้ให้เอง
      │
      ▼
[server] cookie-parser อ่านคุกกี้ → verifyToken ถอด JWT ได้ req.user = { id, role, name }
         requireRole(...) → เช็กบทบาท ไม่ผ่านได้ 403
      │
      ▼  ถ้า token ไม่มี/หมดอายุ/ถูกปลอม → 401
[client] api() พาไป /login?expired=1

[เปิดเว็บใหม่/รีเฟรช]  AuthProvider เรียก GET /auth/me → ได้ user = ยังล็อกอินอยู่, ได้ 401 = ยังไม่ login
[logout]              POST /auth/logout → server สั่งลบคุกกี้ (JavaScript ลบคุกกี้ HttpOnly เองไม่ได้)
```

### route ที่ใช้ `hy_token` (ฝั่ง server)

| ไฟล์ | ใช้อย่างไร |
|---|---|
| `server/src/middleware/auth.js` | **`signToken(user)`** สร้าง JWT · **`setAuthCookie` / `clearAuthCookie`** ตั้ง/ลบคุกกี้ · **`verifyToken`** อ่าน `req.cookies.hy_token` แล้ว `jwt.verify()` ผ่านแล้วแนบ `req.user` ไม่ผ่านตอบ 401 · **`requireRole(...roles)`** เช็ก `req.user.role` ไม่ตรงตอบ 403 |
| `server/src/index.js` | `cors({ origin, credentials: true })`, `app.use(cookieParser())` และไม่ยอมเปิดเซิร์ฟเวอร์ถ้าไม่ได้ตั้ง `JWT_SECRET` |
| `server/src/routes/auth.js` | `/login` เรียก `setAuthCookie`, `/logout` เรียก `clearAuthCookie`, `/me` ใช้ `verifyToken` |
| `server/src/routes/requests.js` | `router.use(verifyToken)` — route **ใต้บรรทัดนี้** ต้องมี token (`GET /requests`, `/mine`, `/accept`, `/assign`, `/status`) ส่วน route สาธารณะประกาศไว้ก่อนบรรทัดนี้ |
| `server/src/routes/users.js` | `GET /rescuers/public` สาธารณะ → `router.use(verifyToken)` → `me/location` (rescuer), `rescuers` (command, admin) → `router.use(requireRole('admin'))` สำหรับจัดการบัญชี |
| `server/src/routes/applications.js` | `POST /applications` สาธารณะ → `router.use(verifyToken, requireRole('command','admin'))` สำหรับดู/อนุมัติ/ปฏิเสธใบสมัคร |
| `server/src/routes/placeRouter.js` | `canEdit = [verifyToken, requireRole('command','admin')]` ใช้กับ POST/PATCH/DELETE ของที่พักพิงและจุดแจกจ่าย |
| `server/src/routes/dashboard.js` | `/dashboard/summary` ใช้ `verifyToken, requireRole('command','admin')` |
| `server/src/routes/announcements.js` | `GET /public` สาธารณะ → `router.use(verifyToken, requireRole('admin'))` สำหรับจัดการประกาศ |

handler หลายตัวใช้ **`req.user.id`** ที่ได้จาก JWT แทนการรับจาก body (กันปลอมตัว) เช่น รับเคส (`accept`), เคสของฉัน (`mine`), อัปเดตตำแหน่ง (`me/location`), `assigned_by` ตอนมอบหมาย, `created_by` ตอนเพิ่มสถานที่/ประกาศ, `reviewed_by` ตอนพิจารณาใบสมัคร และกันแอดมินลบ/ระงับ/ลดสิทธิ์ตัวเอง

### ฝั่ง client

| ไฟล์ | หน้าที่ |
|---|---|
| `client/src/lib/api.js` | `api()` ส่ง `credentials: 'include'` ทุก request ได้ 401 → ไป `/login?expired=1` ยกเว้นส่ง `redirectOn401: false` (เช่น เช็ก session, login รหัสผิด, ยกเลิกเคส) |
| `client/src/lib/auth.js` | `AuthProvider` เรียก `/auth/me` ตอนเปิดเว็บ, `login()` / `logout()`, `useLogout()` ล้าง user หลัง server ลบคุกกี้สำเร็จเท่านั้น, `useRequireRole(roles)` กันหน้าตามบทบาท |
| `client/src/components/StaffShell.jsx`, `client/src/app/rescuer/layout.js` | ใช้ `useRequireRole` กันหน้า command/admin และ rescuer |
| `client/src/app/login/page.js` | ฟอร์ม login เรียก `login()` แล้วพาไปหน้าตาม `ROLE_HOME` |
| `client/src/components/pk/PublicShell.jsx` | หน้าประชาชนอ่าน `user` เพื่อเปลี่ยนแท็บขวาสุดเป็น "หน้าเจ้าหน้าที่" |

ข้อมูลผู้ใช้ (ชื่อ, บทบาท ฯลฯ) **ไม่ได้เก็บในคุกกี้หรือ localStorage** — client ขอจาก `/auth/me` แล้วเก็บไว้ใน React state เท่านั้น

> การกันหน้าฝั่ง client มีไว้เพื่อ UX เท่านั้น สิทธิ์จริงตรวจที่ server ทุก request ผ่าน `verifyToken` + `requireRole`

## 2) `hy_requester` — ผู้แจ้งยกเลิกเคสของตัวเอง

ประชาชนไม่มีบัญชี จึงใช้ JWT อีกตัวพิสูจน์ว่า "เครื่องนี้เป็นคนแจ้งเคสนี้"

```
[หน้า /request]  POST /requests
      │
      ▼
[server] บันทึกเคส → addRequesterCase() อ่าน id เคสเดิมจากคุกกี้ + ใส่ id ใหม่ไว้หน้าสุด (เก็บสูงสุด 10 เคส)
         → เซ็น JWT ใหม่ { typ:'requester', cases:[...] } อายุ 7 วัน → ตั้งคุกกี้ hy_requester
      │
      ▼
[หน้า /track]  GET /requests/track/:caseNo
[server] readRequesterCases() → can_cancel = สถานะยังเป็น pending/assigned และ id อยู่ในคุกกี้
      │
      ▼  ถ้า can_cancel = true จะเห็นปุ่มยกเลิก
[client] api(`/requests/${id}/cancel`, { method:'PATCH', redirectOn401:false })
[server] id ไม่อยู่ในคุกกี้ → 403 (ไม่ใช่ 401 เพื่อไม่ให้ client พาไปหน้า login เจ้าหน้าที่)
         ทีมเริ่มช่วยเหลือไปแล้ว → 409
```

| ไฟล์ | หน้าที่ |
|---|---|
| `server/src/middleware/auth.js` | **`addRequesterCase(req, res, id)`** เพิ่มเคสแล้วเซ็นคุกกี้ใหม่ · **`readRequesterCases(req)`** ถอดคุกกี้ ถ้าไม่มี/ปลอม/หมดอายุ/`typ` ไม่ใช่ `requester` คืน `[]` (ไม่ throw) |
| `server/src/routes/requests.js` | `POST /` ตั้งคุกกี้, `GET /track/:caseNo` คำนวณ `can_cancel`, `PATCH /:id/cancel` เช็กสิทธิ์จากคุกกี้ |
| `client/src/app/(public)/track/page.js` | แสดงปุ่มยกเลิกตาม `can_cancel` และเรียก `/cancel` |

`typ: 'requester'` กันไม่ให้เอา JWT ตัวนี้ไปใช้แทน `hy_token` (และ `hy_token` ไม่มี `cases` จึงใช้แทน `hy_requester` ไม่ได้)

## 3) localStorage (ไม่ใช่คุกกี้ และไม่มี JWT)

| key | เก็บอะไร | ใช้ที่ |
|---|---|---|
| `hy_my_cases` | เลขเคส (`HY-xxxxx`) ที่เครื่องนี้แจ้ง สูงสุด 10 เคส | การ์ด "เคสที่ฉันแจ้ง" และหน้า `/track` (`client/src/lib/format.js`, `useVisibleMyCases.js`) |
| `hy_dismissed_cases` | เลขเคสที่ผู้ใช้กดซ่อนการ์ด | `useVisibleMyCases.js` |

ข้อมูลนี้ใช้แสดงผลอย่างเดียว ไม่ได้ให้สิทธิ์อะไร — สิทธิ์ยกเลิกเคสมาจากคุกกี้ `hy_requester` ที่ server เซ็นเท่านั้น

## ข้อควรรู้

- **token ไม่ถูกเพิกถอนทันที**: `verifyToken` เชื่อ `role` ใน token โดยไม่เช็กฐานข้อมูล ถ้าแอดมินระงับบัญชีหรือเปลี่ยนบทบาท token เดิมยังเรียก API ได้จนหมดอายุ (สูงสุด `JWT_EXPIRES_IN`) แต่ตอนรีเฟรชหน้า `/auth/me` จะเช็ก `is_active` และไม่ให้เข้า
- token อยู่ในคุกกี้ HttpOnly JavaScript อ่านไม่ได้ แต่ XSS ยังสั่ง request ในนามผู้ใช้ได้ระหว่างที่เปิดหน้าอยู่ — HttpOnly กันการ "ขโมย token ไปใช้ที่อื่น" ไม่ได้กัน XSS ทั้งหมด
- ถ้าเปลี่ยน `JWT_EXPIRES_IN` ควรแก้ `COOKIE_MAX_AGE` ใน `server/src/middleware/auth.js` ให้ตรงกันด้วย
- ถ้าเปลี่ยน `JWT_SECRET` ทุกคนต้อง login ใหม่ และผู้แจ้งจะยกเลิกเคสเดิมจากเว็บไม่ได้ (token เก่าใช้ไม่ได้ทั้งหมด)
- ล้างคุกกี้ browser หรือเปลี่ยนเครื่อง = เสียสิทธิ์ยกเลิกเคสผ่านเว็บ ต้องโทรแจ้งทีมแทน
- ค่าใน `server/.env`: `JWT_SECRET` (คีย์เซ็น ต้องเป็นค่าสุ่มยาวๆ), `JWT_EXPIRES_IN`, และ `NODE_ENV=production` ตอนขึ้นจริงเพื่อเปิด `secure`

# Admin-authored public announcements

- `GET /announcements/public`: public, published entries only, newest publication first (maximum 50), `Cache-Control: no-store`.
- `GET /announcements`: admin only, including hidden entries. Other roles receive 403; missing/expired authentication receives 401.
- `POST /announcements`: admin only. Required `title` (1–160 characters) and `content` (1–5000 characters), plain text. Optional `tone`: `info` (default), `org`, or `red`. Optional boolean `is_published` defaults to `false`. Author comes from the authenticated admin, not the submitted body.
- `PATCH /announcements/:id`: admin only; validates supplied fields. `is_published: true` publishes a hidden entry with a new publication time; `false` hides it from the public feed.
- `DELETE /announcements/:id`: admin only; permanently deletes the announcement. The admin UI confirms first and offers hiding as the reversible alternative.
- Responses include announcement content, state/timestamps, and `author_name` via a LEFT JOIN to users; deleted author accounts do not delete announcements. No password or session fields are returned.
- Storage is `public_announcements` in `server/sql/schema.sql`, the single SQL file for the whole database. Do not apply it to existing data: it drops and recreates the database.
