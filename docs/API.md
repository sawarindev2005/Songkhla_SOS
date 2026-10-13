# สรุป API — ระบบขอความช่วยเหลือน้ำท่วมหาดใหญ่

- เซิร์ฟเวอร์: Express 5 + MySQL (`server/src/index.js`)
- Base URL: `http://localhost:4000/api` (ตั้งพอร์ตด้วย `PORT` ใน `server/.env`)
- รับ/ส่ง JSON ทั้งหมด, CORS เปิดให้เฉพาะ `CLIENT_ORIGIN` (ค่าเริ่มต้น `http://localhost:3000`)
- ฝั่ง client เรียกผ่าน `api()` ใน `client/src/lib/api.js` (ตั้ง URL ด้วย `NEXT_PUBLIC_API_URL`)

สัญลักษณ์ในตาราง
- **สาธารณะ** = ไม่ต้องส่ง token
- **🔒 role** = ต้องส่ง `Authorization: Bearer <token>` และบทบาทต้องอยู่ในรายการ

บทบาท (`users.role`): `rescuer` กู้ภัย · `command` ศูนย์บัญชาการ · `admin` ผู้ดูแลระบบ

---

## 1. Auth — `server/src/routes/auth.js`

| Method | Path | สิทธิ์ | ทำอะไร |
|---|---|---|---|
| POST | `/auth/login` | สาธารณะ | body `{ username, password }` → `{ token, user }` (ตรวจรหัสด้วย bcrypt, บัญชีที่ `is_active = 0` ได้ 403) |
| GET | `/auth/me` | 🔒 ทุกบทบาท | ข้อมูลบัญชีของ token ปัจจุบัน (client ยังไม่ได้เรียกใช้) |

## 2. คำขอความช่วยเหลือ — `server/src/routes/requests.js`

| Method | Path | สิทธิ์ | ทำอะไร |
|---|---|---|---|
| GET | `/requests/public` | สาธารณะ | เคสที่ยังไม่จบ (`pending/assigned/in_progress`) สำหรับแผนที่ — **ไม่มีชื่อและเบอร์โทร** |
| POST | `/requests` | สาธารณะ | ส่งคำขอ body: `requester_name`, `phone` (9–10 หลัก), `lat`, `lng`, `people_count`, `urgency` (`low/medium/high/critical`), `has_elderly/has_children/has_disabled/has_patient`, `description`, `address_note` → `201 { id, case_no }` เลขเคสรูปแบบ `HY-00001` |
| GET | `/requests/track/:caseNo` | สาธารณะ | ติดตามเคสด้วยเลขเคส + ทีมที่รับ + `queue_ahead` (จำนวนเคสที่รอก่อนหน้า) |
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
| 401 | ไม่ได้ส่ง token / token หมดอายุหรือไม่ถูกต้อง / รหัสผ่านผิด |
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
[server] ตรวจรหัสด้วย bcrypt → signToken(user) → ส่ง { token, user }
      │
      ▼
[client] saveSession() เก็บ token ใน localStorage ("hy_token")
      │
      ▼  ทุก request ต่อจากนี้
[client] api() แนบ header  Authorization: Bearer <token>
      │
      ▼
[server] verifyToken → ถอด token ได้ req.user = { id, role, name }
         requireRole(...) → เช็กบทบาท ไม่ผ่านได้ 403
      │
      ▼  ถ้า token หมดอายุ/ไม่ถูกต้อง → 401
[client] api() ล้าง session แล้วพาไป /login?expired=1
```

## ฝั่ง server

| ไฟล์ | บรรทัด | หน้าที่ |
|---|---|---|
| `server/src/middleware/auth.js` | 3–9 | **`signToken(user)`** สร้าง token ด้วย `jsonwebtoken` ใส่ payload `{ id, role, name }` เซ็นด้วย `JWT_SECRET` อายุตาม `JWT_EXPIRES_IN` (ค่าเริ่มต้น `12h`) |
| `server/src/middleware/auth.js` | 11–23 | **`verifyToken`** อ่าน `Authorization: Bearer ...` แล้ว `jwt.verify()` ผ่านแล้วแนบ `req.user` ไม่ผ่านตอบ 401 |
| `server/src/middleware/auth.js` | 25–33 | **`requireRole(...roles)`** ใช้ต่อจาก `verifyToken` เช็ก `req.user.role` ไม่ตรงตอบ 403 |
| `server/src/routes/auth.js` | 24 | ตอน login สำเร็จ เรียก `signToken(user)` ส่ง token กลับ |
| `server/src/routes/auth.js` | 27 | `/auth/me` ใช้ `verifyToken` |
| `server/src/routes/requests.js` | 87 | `router.use(verifyToken)` — ทุก route **ที่อยู่ใต้บรรทัดนี้** ต้องมี token (route สาธารณะประกาศไว้ก่อนบรรทัดนี้) |
| `server/src/routes/users.js` | 26, 50 | `router.use(verifyToken)` แล้วต่อด้วย `router.use(requireRole('admin'))` สำหรับส่วนจัดการบัญชี |
| `server/src/routes/placeRouter.js` | 10 | `canEdit = [verifyToken, requireRole('command','admin')]` ใช้กับ POST/PATCH/DELETE |
| `server/src/routes/dashboard.js` | 47 | `/dashboard/summary` ใช้ `verifyToken, requireRole('command','admin')` |
| `server/src/index.js` | 5–8 | ถ้าไม่ได้ตั้ง `JWT_SECRET` เซิร์ฟเวอร์จะไม่ยอมเปิด |
| `server/.env` | — | `JWT_SECRET` (คีย์เซ็น ต้องเป็นค่าสุ่มยาวๆ) และ `JWT_EXPIRES_IN` |

นอกจากนี้ handler หลายตัวใช้ `req.user.id` ที่ได้จาก token เช่น รับเคส (`accept`), เคสของฉัน (`mine`), อัปเดตตำแหน่ง (`me/location`), `created_by` ตอนเพิ่มสถานที่ และกันแอดมินลบ/ระงับตัวเอง

## ฝั่ง client

| ไฟล์ | บรรทัด | หน้าที่ |
|---|---|---|
| `client/src/lib/api.js` | 3–4 | ชื่อคีย์ใน localStorage: `hy_token` (token), `hy_user` (ข้อมูลผู้ใช้) |
| `client/src/lib/api.js` | 14–34 | `getToken()`, `getStoredUser()`, `saveSession()`, `clearSession()` |
| `client/src/lib/api.js` | 41 | แนบ `Authorization: Bearer <token>` ทุก request ถ้ามี token |
| `client/src/lib/api.js` | 61–65 | ได้ 401 ระหว่างมี token → ล้าง session แล้วไป `/login?expired=1` |
| `client/src/lib/auth.js` | 21–56 | `AuthProvider` อ่าน session ตอนเปิดเว็บ, `login()` เรียก `/auth/login` แล้ว `saveSession`, `logout()` เรียก `clearSession` |
| `client/src/lib/auth.js` | 67+ | `useRequireRole(roles)` กันหน้าตามบทบาทฝั่ง client (ไม่มี login → `/login`, บทบาทไม่ตรง → หน้าของบทบาทตัวเอง) ใช้ใน `client/src/app/rescuer/layout.js` และ `client/src/components/StaffShell.jsx` |
| `client/src/app/login/page.js` | — | ฟอร์ม login เรียก `login()` แล้วพาไปหน้าตาม `ROLE_HOME` |
| `client/src/components/pk/PublicShell.jsx` | — | หน้าคนทั่วไปอ่าน `user` เพื่อเปลี่ยนแท็บขวาสุดเป็น "หน้าเจ้าหน้าที่" (ไม่ได้ใช้ token ตรงๆ) |

> การกันหน้าฝั่ง client มีไว้เพื่อ UX เท่านั้น สิทธิ์จริงตรวจที่ server ทุก request ผ่าน `verifyToken` + `requireRole`

## ข้อควรรู้

- **token ไม่ถูกเพิกถอนทันที**: `verifyToken` เชื่อ `role` ใน token โดยไม่เช็กฐานข้อมูล ถ้าแอดมินระงับบัญชีหรือเปลี่ยนบทบาท token เดิมยังใช้ได้จนหมดอายุ (สูงสุด `JWT_EXPIRES_IN`) ถ้าต้องการให้มีผลทันที ต้องให้ `verifyToken` เช็ก `is_active`/`role` จากตาราง `users` เพิ่ม
- token เก็บใน `localStorage` จึงอ่านได้จาก JavaScript บนหน้าเว็บ — สะดวก แต่ถ้ามีช่องโหว่ XSS token จะรั่วได้
- ถ้าเปลี่ยน `JWT_SECRET` ทุกคนต้อง login ใหม่ (token เก่าใช้ไม่ได้ทั้งหมด)
