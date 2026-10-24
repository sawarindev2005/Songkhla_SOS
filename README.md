# ระบบขอความช่วยเหลือน้ำท่วมหาดใหญ่

เว็บแจ้งขอความช่วยเหลือ ดูที่พักพิง/จุดแจกจ่าย และสั่งการหน่วยกู้ภัย แยกสิทธิ์ด้วย JWT

| โฟลเดอร์ | เทคโนโลยี | พอร์ต |
|---|---|---|
| `server/` | Express 5 + MySQL (mysql2) + JWT + bcrypt | 4000 |
| `client/` | Next.js 16 (App Router, JavaScript) + Tailwind 4 + Leaflet/OpenStreetMap + Recharts | 3000 |

## ผู้ใช้ 4 กลุ่ม

| บทบาท | เข้าใช้ | ทำอะไรได้ |
|---|---|---|
| ประชาชน | ไม่ต้อง login (`/`) | ดูแผนที่เคส/ที่พักพิง/จุดแจกจ่าย, ขอความช่วยเหลือ → ได้เลขเคสอัตโนมัติ `HY-xxxxx`, ติดตามเคส |
| อาสา/กู้ภัย (`rescuer`) | `/rescuer` (mobile-first) | มาร์คตำแหน่งตัวเอง (GPS/ปักหมุด), ดูเคสใกล้ตัว, กดรับเคส, อัปเดตสถานะภารกิจ |
| ศูนย์บัญชาการ (`command`) | `/command` | Dashboard สรุป, มอบหมายเคสให้ทีมที่ใกล้ที่สุด, เพิ่ม/แก้/ลบที่พักพิงและจุดแจกจ่าย |
| ผู้ดูแลระบบ (`admin`) | `/admin` | ภาพรวมทั้งระบบ, สร้าง/แก้ไข/ระงับ/ลบบัญชีทุกคน (+ เข้าหน้าศูนย์บัญชาการได้) |

## ฐานข้อมูล (4 ตาราง)

`users` · `help_requests` · `shelters` · `distribution_points` — ดูรายละเอียดใน `server/sql/schema.sql`

## ติดตั้งและรัน

**1. สร้างฐานข้อมูล** — เปิด MySQL Workbench → File › Open SQL Script → `server/sql/schema.sql` → กด Execute (⚡)
(สคริปต์จะ `DROP DATABASE hatyai_floods` แล้วสร้างใหม่พร้อมข้อมูลตัวอย่าง)

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

## บัญชีตัวอย่าง

| ชื่อผู้ใช้ | รหัสผ่าน | บทบาท |
|---|---|---|
| admin | admin1234 | ผู้ดูแลระบบ |
| command | command1234 | ศูนย์บัญชาการ |
| rescue1, rescue2 | rescue1234 | อาสา/กู้ภัย |

เปลี่ยนรหัสผ่านก่อนใช้งานจริง · รีเซ็ตรหัส admin ได้ด้วย `npm run seed -- admin <รหัสใหม่>` (ในโฟลเดอร์ `server`)

## API หลัก (`/api`)

| Method | Path | สิทธิ์ |
|---|---|---|
| POST | `/auth/login` | ทุกคน |
| GET | `/auth/me` | login แล้ว |
| GET / POST | `/requests/public`, `/requests` | ทุกคน (ข้อมูลสาธารณะไม่มีเบอร์โทร) |
| GET | `/requests/track/:caseNo` | ทุกคน |
| GET | `/requests?status=active` | rescuer, command, admin |
| GET | `/requests/mine` | rescuer |
| PATCH | `/requests/:id/accept` | rescuer |
| PATCH | `/requests/:id/assign` | command, admin |
| PATCH | `/requests/:id/status` | rescuer (เฉพาะเคสตัวเอง), command, admin |
| PATCH | `/users/me/location` | rescuer |
| GET | `/users/rescuers` | command, admin |
| GET/POST/PATCH/DELETE | `/users` | admin |
| GET | `/shelters`, `/distributions` | ทุกคน |
| POST/PATCH/DELETE | `/shelters`, `/distributions` | command, admin |
| GET | `/dashboard/public` | ทุกคน |
| GET | `/dashboard/summary` | command, admin |

ข้อมูลบนหน้าเว็บรีเฟรชอัตโนมัติทุก 15 วินาที (polling)
