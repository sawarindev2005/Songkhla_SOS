# ระบบขอความช่วยเหลือน้ำท่วมหาดใหญ่

เว็บแจ้งขอความช่วยเหลือ ดูที่พักพิง/จุดแจกจ่าย และสั่งการหน่วยกู้ภัย แยกสิทธิ์ด้วย JWT

## ผู้จัดทำ

| ลำดับ | ชื่อ-นามสกุล | รหัสนักศึกษา |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |

## โครงสร้างฐานข้อมูล (SQL)

ฐานข้อมูล `hatyai_floods` (utf8mb4) มี 6 ตาราง — สคริปต์เต็มอยู่ที่ `server/sql/schema.sql`

```
users ──┬──< help_requests.assigned_to / assigned_by
        ├──< shelters.created_by
        ├──< distribution_points.created_by
        ├──< rescuer_applications.reviewed_by / user_id
        └──< public_announcements.created_by
```

### 1) `users` — บัญชีเจ้าหน้าที่ (ประชาชนไม่ต้องมีบัญชี)

| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `username` | VARCHAR(50) UNIQUE | |
| `password_hash` | VARCHAR(100) | bcrypt |
| `full_name` | VARCHAR(100) | |
| `phone` | VARCHAR(20) | |
| `role` | ENUM('rescuer','command','admin') | |
| `team_name` | VARCHAR(100) | |
| `team_size` | INT | จำนวนสมาชิกทีม |
| `equipment` | VARCHAR(255) | คั่นด้วย `,` จาก `boat,truck,pickup,first_aid` |
| `service_area` | VARCHAR(255) | พื้นที่ปฏิบัติงาน |
| `current_lat`, `current_lng` | DECIMAL(10,7) | ตำแหน่งล่าสุดของกู้ภัย |
| `location_updated_at` | DATETIME | |
| `is_active` | TINYINT(1) DEFAULT 1 | 0 = ถูกระงับ |
| `created_at`, `updated_at` | DATETIME | |

### 2) `help_requests` — คำขอความช่วยเหลือ

| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `case_no` | VARCHAR(20) UNIQUE | `HY-00001` |
| `requester_name` | VARCHAR(100) | |
| `phone` | VARCHAR(20) | |
| `people_count` | INT DEFAULT 1 | |
| `has_elderly`, `has_children`, `has_disabled`, `has_patient` | TINYINT(1) | กลุ่มเปราะบาง |
| `urgency` | ENUM('low','medium','high','critical') | |
| `description` | TEXT | |
| `address_note` | VARCHAR(255) | |
| `lat`, `lng` | DECIMAL(10,7) | |
| `status` | ENUM('pending','assigned','in_progress','rescued','cancelled') | INDEX |
| `assigned_to` | INT FK → `users.id` | ON DELETE SET NULL |
| `assigned_by` | INT FK → `users.id` | ON DELETE SET NULL |
| `assigned_at`, `resolved_at` | DATETIME | |
| `created_at`, `updated_at` | DATETIME | |

### 3) `shelters` — ที่พักพิง

| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(150) | |
| `address` | VARCHAR(255) | |
| `lat`, `lng` | DECIMAL(10,7) | |
| `capacity`, `current_occupancy` | INT | |
| `contact_phone` | VARCHAR(20) | |
| `facilities` | VARCHAR(255) | |
| `status` | ENUM('open','full','closed') | |
| `created_by` | INT FK → `users.id` | ON DELETE SET NULL |
| `created_at`, `updated_at` | DATETIME | |

### 4) `distribution_points` — จุดแจกจ่ายของ

| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(150) | |
| `address` | VARCHAR(255) | |
| `lat`, `lng` | DECIMAL(10,7) | |
| `supply_types` | VARCHAR(255) | |
| `open_time`, `close_time` | TIME | |
| `contact_phone` | VARCHAR(20) | |
| `status` | ENUM('active','closed') | |
| `created_by` | INT FK → `users.id` | ON DELETE SET NULL |
| `created_at`, `updated_at` | DATETIME | |

### 5) `rescuer_applications` — ใบสมัครอาสากู้ภัย (อนุมัติแล้วจึงสร้างแถวใน `users`)

| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `username` | VARCHAR(50) | INDEX |
| `password_hash` | VARCHAR(100) | |
| `full_name` | VARCHAR(100) | |
| `phone` | VARCHAR(20) | |
| `team_name` | VARCHAR(100) | |
| `team_size` | INT DEFAULT 1 | |
| `equipment`, `service_area` | VARCHAR(255) | |
| `status` | ENUM('pending','approved','rejected') | INDEX |
| `reject_reason` | VARCHAR(255) | |
| `reviewed_by` | INT FK → `users.id` | ON DELETE SET NULL |
| `reviewed_at` | DATETIME | |
| `user_id` | INT FK → `users.id` | บัญชีที่สร้างจากใบสมัคร |
| `created_at` | DATETIME | |

### 6) `public_announcements` — ประกาศสาธารณะจากผู้ดูแลระบบ

| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `title` | VARCHAR(160) | |
| `content` | TEXT | ข้อความล้วน |
| `tone` | ENUM('info','org','red') | |
| `is_published` | TINYINT(1) DEFAULT 0 | INDEX ร่วมกับ `published_at`, `id` |
| `published_at` | DATETIME | |
| `created_by` | INT FK → `users.id` | ON DELETE SET NULL |
| `created_at`, `updated_at` | DATETIME | |

## บัญชีตัวอย่าง

| ชื่อผู้ใช้ | รหัสผ่าน | บทบาท |
|---|---|---|
| admin | admin1234 | ผู้ดูแลระบบ |
| command | command1234 | ศูนย์บัญชาการ |
| rescue1, rescue2 | rescue1234 | อาสา/กู้ภัย |

เปลี่ยนรหัสผ่านก่อนใช้งานจริง · รีเซ็ตรหัส admin ได้ด้วย `npm run seed -- admin <รหัสใหม่>` (ในโฟลเดอร์ `server`)

## API หลัก (`/api`)

รายละเอียดเต็มดูที่ `docs/API.md`

| Method | Path | สิทธิ์ |
|---|---|---|
| POST | `/auth/login`, `/auth/logout` | ทุกคน |
| GET | `/auth/me` | login แล้ว |
| GET | `/requests/public` | ทุกคน (ไม่มีชื่อและเบอร์โทร) |
| POST | `/requests` | ทุกคน → ได้เลขเคส `HY-xxxxx` |
| GET | `/requests/track/:caseNo` | ทุกคน |
| PATCH | `/requests/:id/cancel` | ผู้แจ้ง (คุกกี้ `hy_requester`) |
| GET | `/requests?status=active` | rescuer, command, admin |
| GET | `/requests/mine` | rescuer |
| PATCH | `/requests/:id/accept` | rescuer |
| PATCH | `/requests/:id/assign` | command, admin |
| PATCH | `/requests/:id/status` | rescuer (เฉพาะเคสตัวเอง), command, admin |
| GET | `/users/rescuers/public` | ทุกคน (ตำแหน่งทีม ไม่มีชื่อ/เบอร์) |
| PATCH | `/users/me/location` | rescuer |
| GET | `/users/rescuers` | command, admin |
| GET/POST/PATCH/DELETE | `/users` | admin |
| POST | `/applications` | ทุกคน (สมัครอาสากู้ภัย) |
| GET | `/applications`, `/applications/pending-count` | command, admin |
| PATCH | `/applications/:id/approve`, `/applications/:id/reject` | command, admin |
| GET | `/shelters`, `/distributions` | ทุกคน |
| POST/PATCH/DELETE | `/shelters`, `/distributions` | command, admin |
| GET | `/announcements/public` | ทุกคน (เฉพาะที่เผยแพร่) |
| GET/POST/PATCH/DELETE | `/announcements` | admin |
| GET | `/dashboard/public` | ทุกคน |
| GET | `/dashboard/summary` | command, admin |

ข้อมูลบนหน้าเว็บรีเฟรชอัตโนมัติทุก 15 วินาที (polling)

---

## เทคโนโลยี

| โฟลเดอร์ | เทคโนโลยี | พอร์ต |
|---|---|---|
| `server/` | Express 5 + MySQL (mysql2) + JWT + bcrypt | 4000 |
| `client/` | Next.js 16 (App Router, JavaScript) + Tailwind 4 + Leaflet/OpenStreetMap + Recharts | 3000 |

## ผู้ใช้ 4 กลุ่ม

| บทบาท | เข้าใช้ | ทำอะไรได้ |
|---|---|---|
| ประชาชน | ไม่ต้อง login (`/`) | ดูแผนที่เคส/ที่พักพิง/จุดแจกจ่าย, ขอความช่วยเหลือ → ได้เลขเคสอัตโนมัติ `HY-xxxxx`, ติดตามเคส, สมัครอาสากู้ภัย (`/register`) |
| อาสา/กู้ภัย (`rescuer`) | `/rescuer` (mobile-first) | มาร์คตำแหน่งตัวเอง (GPS/ปักหมุด), ดูเคสใกล้ตัว, กดรับเคส, อัปเดตสถานะภารกิจ |
| ศูนย์บัญชาการ (`command`) | `/command` | Dashboard สรุป, มอบหมายเคสให้ทีมที่ใกล้ที่สุด, อนุมัติอาสากู้ภัย, เพิ่ม/แก้/ลบที่พักพิงและจุดแจกจ่าย |
| ผู้ดูแลระบบ (`admin`) | `/admin` | ภาพรวมทั้งระบบ, สร้าง/แก้ไข/ระงับ/ลบบัญชีทุกคน, จัดการประกาศ (+ เข้าหน้าศูนย์บัญชาการได้) |

## ติดตั้งและรัน

**1. สร้างฐานข้อมูล** — เปิด MySQL Workbench → File › Open SQL Script → `server/sql/schema.sql` → กด Execute (⚡)
(ไฟล์ SQL ไฟล์เดียวของทั้งระบบ สคริปต์จะ `DROP DATABASE hatyai_floods` แล้วสร้างทั้ง 6 ตารางใหม่พร้อมข้อมูลตัวอย่าง — ข้อมูลเดิมในฐานข้อมูลจะหายทั้งหมด)

**2. ตั้งค่า env** (ครั้งแรกครั้งเดียว)
```bash
cp server/.env.example server/.env              # แก้ DB_PASSWORD และ JWT_SECRET
cp client/.env.local.example client/.env.local
```

**3. ติดตั้งและรัน** (ที่โฟลเดอร์บนสุดของโปรเจกต์)
```bash
npm run install-all   # ติดตั้งแพ็กเกจทั้ง root, server, client (ทำใหม่ทุกครั้งหลัง pull)
npm run dev           # รัน API (http://localhost:4000/api) + เว็บ (http://localhost:3000) พร้อมกัน
```
log ของสองฝั่งขึ้นใน terminal เดียว มีป้าย `[server]` / `[client]` กำกับ · กด Ctrl+C ครั้งเดียวปิดทั้งคู่
