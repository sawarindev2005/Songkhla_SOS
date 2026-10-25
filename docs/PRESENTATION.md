# สรุปสำหรับนำเสนอ: Cookies, JWT และ CRUD ของ admin / command

เลขบรรทัดอ้างอิงตามโค้ดเวอร์ชันปัจจุบัน (`ไฟล์:บรรทัด`) รายละเอียด API เต็มดูที่ `docs/API.md`

---

## ส่วนที่ 1 — Cookies และ JWT

### 1.1 แนวคิดหลัก (พูดสั้นๆ ตอนเปิด)

- ใช้ **JWT** (JSON Web Token) ยืนยันตัวตน เซ็นด้วย `JWT_SECRET` ใน `server/.env` ด้วยไลบรารี `jsonwebtoken`
- เก็บ JWT ใน **คุกกี้ HttpOnly** ไม่เก็บใน localStorage → JavaScript อ่าน token ไม่ได้ ถ้ามี XSS ก็ขโมย token ไปใช้ที่อื่นไม่ได้
- ฝั่ง client **ไม่เคยแตะ token** browser แนบคุกกี้ให้เองทุก request
- มีคุกกี้ 2 ใบ

| คุกกี้ | ของใคร | payload | อายุ | ใช้ทำอะไร |
|---|---|---|---|---|
| `hy_token` | เจ้าหน้าที่ (rescuer / command / admin) | `{ id, role, name }` | 12 ชม. | ยืนยันตัวตน + เช็กสิทธิ์ตามบทบาท |
| `hy_requester` | ประชาชนผู้แจ้ง (ไม่มีบัญชี) | `{ typ: 'requester', cases: [...] }` | 7 วัน | ยกเลิกเคสที่ตัวเองแจ้ง |

### 1.2 Flow การ login (แผนภาพสำหรับสไลด์)

```
 Browser (Next.js :3000)                         Server (Express :4000)
 ───────────────────────                         ──────────────────────
 /login กรอก user/pass
   login() ──── POST /api/auth/login ──────────▶ bcrypt.compare(รหัสผ่าน)
                                                 signToken() → JWT {id, role, name}
           ◀─── Set-Cookie: hy_token=JWT ─────── setAuthCookie()  (HttpOnly, SameSite=Lax)
                 body: { user }  (ไม่มี token)
 router.replace(ROLE_HOME[role])

 ทุก request ต่อจากนี้
   api() ─────── fetch(credentials:'include') ─▶ cookieParser() อ่านคุกกี้
                 (browser แนบ hy_token เอง)       verifyToken  → jwt.verify() → req.user
                                                 requireRole('command','admin') → ไม่ผ่าน 403
           ◀─── 401 ถ้า token หมดอายุ/ปลอม
   ไป /login?expired=1

 logout ─────── POST /api/auth/logout ─────────▶ clearAuthCookie()  (JS ลบคุกกี้ HttpOnly เองไม่ได้)
```

### 1.3 โค้ดฝั่ง server

| สิ่งที่ทำ | ตำแหน่งโค้ด |
|---|---|
| ชื่อคุกกี้ / path / อายุ | `server/src/middleware/auth.js:3-5` |
| **สร้าง JWT** `signToken(user)` | `server/src/middleware/auth.js:7` |
| **ตั้งค่าคุกกี้** `cookieOptions()` (httpOnly, secure, sameSite, path, maxAge) | `server/src/middleware/auth.js:17` |
| ตั้ง/ลบคุกกี้ `setAuthCookie` / `clearAuthCookie` | `server/src/middleware/auth.js:27`, `:31` |
| **ตรวจ JWT** `verifyToken` → แนบ `req.user` หรือตอบ 401 | `server/src/middleware/auth.js:37` |
| **ตรวจบทบาท** `requireRole(...roles)` → ตอบ 403 | `server/src/middleware/auth.js:50` |
| คุกกี้ผู้แจ้ง `readRequesterCases` / `addRequesterCase` | `server/src/middleware/auth.js:66`, `:77` |
| ไม่มี `JWT_SECRET` → ไม่ยอมเปิดเซิร์ฟเวอร์ | `server/src/index.js:7` |
| `cors({ credentials: true })` + `cookieParser()` | `server/src/index.js:14`, `:16` |
| `POST /auth/login` ตรวจ bcrypt แล้วตั้งคุกกี้ | `server/src/routes/auth.js:22` |
| `POST /auth/logout` ลบคุกกี้ | `server/src/routes/auth.js:48` |
| `GET /auth/me` เช็กว่ายัง login อยู่ | `server/src/routes/auth.js:53` |
| ตั้งคุกกี้ `hy_requester` ตอนส่งคำขอ | `server/src/routes/requests.js:38` |
| ยกเลิกเคสด้วยคุกกี้ `hy_requester` | `server/src/routes/requests.js:93` |

**จุดที่ "ด่าน" verifyToken/requireRole ถูกวางไว้** (route ที่อยู่ก่อนบรรทัดนี้เป็นสาธารณะ)

| ไฟล์ | บรรทัด | ผล |
|---|---|---|
| `server/src/routes/requests.js` | `:109` `router.use(verifyToken)` | ต่อจากนี้ต้อง login |
| `server/src/routes/users.js` | `:28` `router.use(verifyToken)` → `:52` `router.use(requireRole('admin'))` | จัดการบัญชีเฉพาะ admin |
| `server/src/routes/applications.js` | `:54` `router.use(verifyToken, requireRole('command','admin'))` | |
| `server/src/routes/announcements.js` | `:42` `router.use(verifyToken, requireRole('admin'))` | |
| `server/src/routes/placeRouter.js` | `:10` `canEdit = [verifyToken, requireRole('command','admin')]` | ใส่ไว้ที่ POST/PATCH/DELETE |
| `server/src/routes/dashboard.js` | `:47` | `/summary` เฉพาะ command, admin |

### 1.4 โค้ดฝั่ง client

| สิ่งที่ทำ | ตำแหน่งโค้ด |
|---|---|
| `api()` ส่ง `credentials: 'include'` ทุก request | `client/src/lib/api.js:15` |
| ได้ 401 → พาไป `/login?expired=1` | `client/src/lib/api.js:28-31` |
| `AuthProvider` เรียก `/auth/me` ตอนเปิดเว็บ, `login()`, `logout()` | `client/src/lib/auth.js:21` |
| `useLogout()` ออกจากระบบ (รอ server ลบคุกกี้สำเร็จก่อน) | `client/src/lib/auth.js:69` |
| `useRequireRole(roles)` กันหน้าตามบทบาท | `client/src/lib/auth.js:96` |
| หน้า login เรียก `login()` แล้วพาไปหน้าตามบทบาท | `client/src/app/login/page.js:40-41` |
| layout admin อนุญาตเฉพาะ `['admin']` | `client/src/app/admin/layout.js:5` |
| layout command อนุญาต `['command','admin']` | `client/src/app/command/layout.js:5` |
| `StaffShell` เรียก `useRequireRole` และปุ่มออกจากระบบ | `client/src/components/StaffShell.jsx:87-88` |

> **ประเด็นสำคัญ:** การกันหน้าฝั่ง client มีไว้เพื่อ UX เท่านั้น สิทธิ์จริงตรวจที่ server ทุก request ผ่าน `verifyToken` + `requireRole` (ต่อให้แก้โค้ด client ก็เรียก API ที่ไม่มีสิทธิ์ไม่ได้)

### 1.5 คุณสมบัติความปลอดภัยของคุกกี้ (ตอบคำถามกรรมการ)

| ค่า | กันอะไร |
|---|---|
| `httpOnly: true` | XSS ขโมย token (`document.cookie` มองไม่เห็น) |
| `sameSite: 'lax'` | CSRF — เว็บอื่นสั่ง POST/PATCH/DELETE โดยแนบคุกกี้เราไม่ได้ |
| `secure` (production) | ดักฟัง token — ส่งผ่าน HTTPS เท่านั้น |
| `path: '/api'` | ไม่ส่งคุกกี้ไปกับ request ที่ไม่ใช่ API |
| `maxAge` = อายุ JWT | คุกกี้หมดอายุพร้อม token |
| รหัสผ่านเก็บเป็น bcrypt hash | ฐานข้อมูลรั่วก็ไม่เห็นรหัสผ่านจริง |
| ใช้ `req.user.id` จาก JWT แทนค่าจาก body | ปลอมตัวเป็นผู้ใช้อื่นไม่ได้ (`created_by`, `assigned_by`, `reviewed_by`) |

ข้อจำกัดที่ควรรู้: JWT เพิกถอนทันทีไม่ได้ ถ้าระงับบัญชี token เดิมยังใช้ได้จนหมดอายุ (สูงสุด 12 ชม.) แต่ `/auth/me` เช็ก `is_active` ทุกครั้งที่รีเฟรชหน้า

---

## ส่วนที่ 2 — CRUD ของ admin และ command

### 2.1 สิทธิ์แต่ละบทบาท

| ข้อมูล | Create | Read | Update | Delete | บทบาท |
|---|---|---|---|---|---|
| บัญชีผู้ใช้ (`users`) | ✅ | ✅ | ✅ (แก้ไข, ระงับ, รีเซ็ตรหัส) | ✅ | **admin** |
| ประกาศ (`public_announcements`) | ✅ | ✅ | ✅ (แก้ไข, เผยแพร่/ซ่อน) | ✅ | **admin** |
| ที่พักพิง (`shelters`) | ✅ | ✅ | ✅ | ✅ | **command, admin** |
| จุดแจกจ่าย (`distribution_points`) | ✅ | ✅ | ✅ | ✅ | **command, admin** |
| เคส (`help_requests`) | — (ประชาชนสร้าง) | ✅ | ✅ มอบหมาย / เปลี่ยนสถานะ | — | **command, admin** |
| ใบสมัครอาสา (`rescuer_applications`) | — (ประชาชนสมัคร) | ✅ | ✅ อนุมัติ / ปฏิเสธ | — | **command, admin** |
| Dashboard สรุป | — | ✅ | — | — | **command, admin** |

admin เข้าหน้า `/command` ได้ทั้งหมด แต่ command เข้าหน้า `/admin` ไม่ได้

### 2.2 admin — จัดการบัญชีผู้ใช้ (`/admin/users`)

| CRUD | API | server | client |
|---|---|---|---|
| **Read** | `GET /users` | `server/src/routes/users.js:66` | `client/src/app/admin/users/page.js:50` |
| **Create** | `POST /users` | `server/src/routes/users.js:76` | `client/src/app/admin/users/page.js:109` |
| **Update** | `PATCH /users/:id` | `server/src/routes/users.js:91` | `client/src/app/admin/users/page.js:109` |
| **Delete** | `DELETE /users/:id` | `server/src/routes/users.js:114` | `client/src/app/admin/users/page.js:125` |

จุดที่น่าพูด
- รหัสผ่าน hash ด้วย `bcrypt.hash(..., 10)` ก่อนบันทึก ไม่ส่ง `password_hash` กลับไป (`SAFE_FIELDS` ใน `users.js`)
- กันแอดมินระงับ/ลดสิทธิ์/ลบบัญชีตัวเอง (`id === req.user.id`) — `users.js:100`, `:116`
- ลบบัญชีกู้ภัยแล้ว เคสที่ค้างอยู่กลับเข้าคิว `pending` อัตโนมัติ — `users.js:119`
- ตรวจข้อมูลด้วย `normalizeUsername`, `checkPassword`, `normalizeEquipment`, `normalizeTeamSize` ใน `server/src/utils.js`

### 2.3 admin — จัดการประกาศ (`/admin/announcements`)

| CRUD | API | server | client |
|---|---|---|---|
| **Read** | `GET /announcements` (รวมที่ซ่อน) | `server/src/routes/announcements.js:43` | `client/src/app/admin/announcements/page.js:26` |
| **Create** | `POST /announcements` | `server/src/routes/announcements.js:48` | `client/src/app/admin/announcements/page.js:60` |
| **Update** | `PATCH /announcements/:id` | `server/src/routes/announcements.js:55` | แก้ข้อความ `:60` · สวิตช์เผยแพร่ `:74` |
| **Delete** | `DELETE /announcements/:id` | `server/src/routes/announcements.js:62` | `client/src/app/admin/announcements/page.js:88` |
| Read (สาธารณะ) | `GET /announcements/public` | `server/src/routes/announcements.js:36` | แถบข่าวหน้าประชาชน |

จุดที่น่าพูด
- ตรวจข้อมูลด้วย `validate()` — `announcements.js:7` (หัวข้อ ≤160 ตัว, เนื้อหา ≤5000 ตัว, tone)
- สร้างใหม่ซ่อนไว้ก่อน เผยแพร่ต้องกดสวิตช์เอง และมีเทสต์ `server/src/routes/announcements.test.js`

### 2.4 command (+admin) — จัดการที่พักพิง / จุดแจกจ่าย

ใช้ **router ตัวเดียว** (`placeRouter`) สร้าง CRUD ให้ทั้งสองตาราง และหน้า client ตัวเดียว (`PlaceManager`)

| CRUD | API | server | client |
|---|---|---|---|
| **Read** | `GET /shelters`, `/distributions` | `server/src/routes/placeRouter.js:33` | `client/src/components/PlaceManager.jsx:51` |
| **Create** | `POST` | `server/src/routes/placeRouter.js:42` | `client/src/components/PlaceManager.jsx:103` |
| **Update** | `PATCH /:id` | `server/src/routes/placeRouter.js:49` | `client/src/components/PlaceManager.jsx:103` |
| **Delete** | `DELETE /:id` | `server/src/routes/placeRouter.js:58` | `client/src/components/PlaceManager.jsx:122` |

- ตั้งค่าแต่ละตาราง: `server/src/routes/shelters.js`, `server/src/routes/distributions.js` (ฟิลด์, สถานะที่อนุญาต)
- หน้า: `client/src/app/command/shelters/page.js` → `<PlaceManager type="shelter" />`, `client/src/app/command/distributions/page.js` → `type="distribution"`
- config ฝั่ง client: `client/src/components/PlaceManager.jsx:24`
- ตรวจข้อมูล: `validate()` ใน `placeRouter.js:18` (ชื่อ, พิกัด, สถานะ) และ `client/src/lib/place-validation.mjs`
- `created_by` มาจาก `req.user.id` (JWT) — `placeRouter.js:44`

### 2.5 command (+admin) — มอบหมายเคส (`/command/assign`)

| การทำงาน | API | server | client |
|---|---|---|---|
| **Read** เคสที่ยังไม่จบ | `GET /requests?status=active` | `server/src/routes/requests.js:111` | `client/src/app/command/assign/page.js:32` |
| **Read** ทีมกู้ภัย + ตำแหน่ง | `GET /users/rescuers` | `server/src/routes/users.js:42` | `client/src/app/command/assign/page.js:33` |
| **Update** มอบหมายทีม | `PATCH /requests/:id/assign` | `server/src/routes/requests.js:151` | `client/src/app/command/assign/page.js:74` |
| **Update** เปลี่ยนสถานะ | `PATCH /requests/:id/status` | `server/src/routes/requests.js:175` | `client/src/app/command/assign/page.js:81` |

- ทีมเรียงตามระยะห่างจากเคส (`distanceKm`) — `client/src/app/command/assign/page.js` ใน `rankedRescuers`
- `WHERE status IN ('pending','assigned')` กันมอบหมายเคสที่เริ่มช่วยไปแล้ว

### 2.6 command (+admin) — อนุมัติอาสากู้ภัย (`/command/applications`)

| การทำงาน | API | server | client |
|---|---|---|---|
| **Read** ใบสมัคร | `GET /applications?status=` | `server/src/routes/applications.js:56` | `client/src/app/command/applications/page.js:32` |
| **Read** จำนวนรออนุมัติ (ตัวเลขบนเมนู) | `GET /applications/pending-count` | `server/src/routes/applications.js:68` | `client/src/components/StaffShell.jsx:89` |
| **Update** อนุมัติ → สร้างบัญชีใน `users` | `PATCH /applications/:id/approve` | `server/src/routes/applications.js:74` | `client/src/app/command/applications/page.js:57` |
| **Update** ปฏิเสธ (ต้องระบุเหตุผล) | `PATCH /applications/:id/reject` | `server/src/routes/applications.js:109` | `client/src/app/command/applications/page.js:66` |

- อนุมัติใช้ **transaction + `SELECT ... FOR UPDATE`** กันสองคนกดอนุมัติพร้อมกันแล้วได้บัญชีซ้ำ

### 2.7 Dashboard (Read อย่างเดียว)

| หน้า | API | server | client |
|---|---|---|---|
| `/command` | `GET /dashboard/summary` | `server/src/routes/dashboard.js:47` | `client/src/app/command/page.js:23` → `components/Dashboard.jsx` |
| `/admin` | `GET /dashboard/summary` + `/requests`, `/shelters`, `/distributions`, `/users/rescuers` | เหมือนข้างบน | `client/src/app/admin/page.js:16-20` |

---

## ส่วนที่ 3 — รูปแบบโค้ดที่ใช้ซ้ำ (ใช้ปิดท้าย)

| รูปแบบ | ตำแหน่ง |
|---|---|
| ส่ง error ภาษาไทยด้วย `httpError(status, message)` | `server/src/utils.js` |
| error handler กลาง (409 ข้อมูลซ้ำ, 503 ต่อ DB ไม่ได้) | ท้าย `server/src/index.js` |
| เลือกฟิลด์ที่อนุญาตก่อน `UPDATE ... SET ?` ด้วย `pick()` กันแก้คอลัมน์ที่ไม่ควรแก้ | `server/src/utils.js` |
| SQL ใช้ placeholder `?` ทุกที่ กัน SQL injection | ทุกไฟล์ใน `server/src/routes/` |
| ดึงข้อมูลใหม่ทุก 15 วินาที `usePolling()` | `client/src/hooks/usePolling.js` |
| ฟอร์มแก้ไขใช้ `Modal` + `ConfirmDialog` ก่อนลบ + `Toast` แจ้งผล | `client/src/components/pk/` |

### ลำดับการเดโมที่แนะนำ

1. login เป็น `command` → เปิด DevTools › Application › Cookies ให้เห็น `hy_token` ติด HttpOnly และพิมพ์ `document.cookie` ใน Console ให้เห็นว่าอ่านไม่ได้
2. เพิ่ม / แก้ / ลบ ที่พักพิง → ไปหน้าประชาชน `/shelters` ให้เห็นข้อมูลเปลี่ยน
3. มอบหมายเคสให้ทีมกู้ภัย
4. ลองเปิด `/admin` ด้วยบัญชี `command` → ถูกพากลับ (และถ้าเรียก `GET /api/users` ตรงๆ จะได้ 403)
5. logout → login เป็น `admin` → สร้างบัญชี, สร้างและเผยแพร่ประกาศ → แถบข่าวหน้าแรกขึ้นภายใน 15 วินาที
