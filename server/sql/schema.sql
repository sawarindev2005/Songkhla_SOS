-- ระบบขอความช่วยเหลือน้ำท่วมหาดใหญ่
-- เปิดไฟล์นี้ใน MySQL Workbench แล้วกด Execute (⚡) เพื่อสร้างฐานข้อมูลพร้อมข้อมูลตัวอย่าง
-- บัญชีตัวอย่าง: admin / admin1234, command / command1234, rescue1 / rescue1234, rescue2 / rescue1234

DROP DATABASE IF EXISTS hatyai_floods;
CREATE DATABASE hatyai_floods CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hatyai_floods;

-- 1) บัญชีผู้ใช้งาน (เจ้าหน้าที่เท่านั้น ประชาชนไม่ต้องมีบัญชี)
CREATE TABLE users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  username            VARCHAR(50)  NOT NULL UNIQUE,
  password_hash       VARCHAR(100) NOT NULL,
  full_name           VARCHAR(100) NOT NULL,
  phone               VARCHAR(20),
  role                ENUM('rescuer','command','admin') NOT NULL,
  team_name           VARCHAR(100),
  team_size           INT NULL,
  equipment           VARCHAR(255) NULL,  -- คั่นด้วย , จากชุด boat,truck,pickup,first_aid
  service_area        VARCHAR(255) NULL,
  current_lat         DECIMAL(10,7),
  current_lng         DECIMAL(10,7),
  location_updated_at DATETIME,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2) รายการขอความช่วยเหลือ
CREATE TABLE help_requests (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  case_no        VARCHAR(20) UNIQUE,
  requester_name VARCHAR(100) NOT NULL,
  phone          VARCHAR(20)  NOT NULL,
  people_count   INT NOT NULL DEFAULT 1,
  has_elderly    TINYINT(1) NOT NULL DEFAULT 0,
  has_children   TINYINT(1) NOT NULL DEFAULT 0,
  has_disabled   TINYINT(1) NOT NULL DEFAULT 0,
  has_patient    TINYINT(1) NOT NULL DEFAULT 0,
  urgency        ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  description    TEXT,
  address_note   VARCHAR(255),
  lat            DECIMAL(10,7) NOT NULL,
  lng            DECIMAL(10,7) NOT NULL,
  status         ENUM('pending','assigned','in_progress','rescued','cancelled') NOT NULL DEFAULT 'pending',
  assigned_to    INT NULL,
  assigned_by    INT NULL,
  assigned_at    DATETIME NULL,
  resolved_at    DATETIME NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  CONSTRAINT fk_req_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_req_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 3) ที่พักพิง
CREATE TABLE shelters (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(150) NOT NULL,
  address           VARCHAR(255),
  lat               DECIMAL(10,7) NOT NULL,
  lng               DECIMAL(10,7) NOT NULL,
  capacity          INT NOT NULL DEFAULT 0,
  current_occupancy INT NOT NULL DEFAULT 0,
  contact_phone     VARCHAR(20),
  facilities        VARCHAR(255),
  status            ENUM('open','full','closed') NOT NULL DEFAULT 'open',
  created_by        INT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_shelter_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4) จุดแจกจ่ายของ
CREATE TABLE distribution_points (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  address       VARCHAR(255),
  lat           DECIMAL(10,7) NOT NULL,
  lng           DECIMAL(10,7) NOT NULL,
  supply_types  VARCHAR(255),
  open_time     TIME,
  close_time    TIME,
  contact_phone VARCHAR(20),
  status        ENUM('active','closed') NOT NULL DEFAULT 'active',
  created_by    INT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dist_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 5) ใบสมัครอาสากู้ภัย (ยังเข้าสู่ระบบไม่ได้จนกว่าศูนย์บัญชาการ/admin อนุมัติ แล้วจึงสร้างแถวใน users)
CREATE TABLE rescuer_applications (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20)  NOT NULL,
  team_name     VARCHAR(100) NOT NULL,
  team_size     INT NOT NULL DEFAULT 1,
  equipment     VARCHAR(255),
  service_area  VARCHAR(255),
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reject_reason VARCHAR(255),
  reviewed_by   INT NULL,
  reviewed_at   DATETIME NULL,
  user_id       INT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_app_status (status),
  INDEX idx_app_username (username),
  CONSTRAINT fk_app_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_app_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------- ข้อมูลตัวอย่าง ----------
INSERT INTO users (username, password_hash, full_name, phone, role, team_name, current_lat, current_lng, location_updated_at) VALUES
('admin',   '$2b$10$LX1RE/NYhOtjDHMrGTDdp.tr0gBtC5f8rfv3IqnI7ikkfq93adHGy', 'ผู้ดูแลระบบ',            '0800000000', 'admin',   NULL, NULL, NULL, NULL),
('command', '$2b$10$vEyIPs7uj2AZ.y34C0BPWuQJI/a/eRah8Qb85zjEjohXK1k.3mvkC', 'เจ้าหน้าที่ศูนย์บัญชาการ', '0811111111', 'command', 'ศูนย์บัญชาการเทศบาลนครหาดใหญ่', NULL, NULL, NULL),
('rescue1', '$2b$10$McW2tL9lbXJSoVuGLgmEhulHCip3hvMSnM/pbXZeTDCfutQHFxGzS', 'สมชาย ใจกล้า',           '0822222222', 'rescuer', 'มูลนิธิกู้ภัยหาดใหญ่ ทีม A', 7.0060, 100.4700, NOW()),
('rescue2', '$2b$10$McW2tL9lbXJSoVuGLgmEhulHCip3hvMSnM/pbXZeTDCfutQHFxGzS', 'สมหญิง ช่วยเหลือ',        '0833333333', 'rescuer', 'อาสาเรือ ทีม B', 7.0150, 100.4850, NOW());

INSERT INTO help_requests (requester_name, phone, people_count, has_elderly, has_children, has_disabled, has_patient, urgency, description, address_note, lat, lng, status, created_at) VALUES
('นายเอก',    '0891234567', 4, 1, 1, 0, 0, 'critical', 'น้ำท่วมถึงชั้นสอง มีผู้สูงอายุติดอยู่บนหลังคา', 'ซอยเพชรเกษม 12', 7.0045, 100.4742, 'pending', NOW() - INTERVAL 2 HOUR),
('นางบี',     '0897654321', 2, 0, 0, 0, 1, 'high',     'ผู้ป่วยติดเตียง ต้องการเรือ',                   'ถนนศรีภูวนารถ',  7.0102, 100.4688, 'pending', NOW() - INTERVAL 90 MINUTE),
('นายซี',     '0861112222', 6, 0, 1, 0, 0, 'medium',   'ขาดน้ำดื่มและอาหาร 2 วัน',                      'ชุมชนคลองเตย',   6.9988, 100.4801, 'pending', NOW() - INTERVAL 1 HOUR),
('นางดี',     '0863334444', 3, 1, 0, 1, 0, 'high',     'คนพิการนั่งรถเข็น น้ำท่วมเอว',                    'ถนนนิพัทธ์อุทิศ 3', 7.0071, 100.4659, 'assigned', NOW() - INTERVAL 3 HOUR),
('นายอี',     '0865556666', 1, 0, 0, 0, 0, 'low',      'ต้องการย้ายรถ',                                 'ซอยธรรมนูญวิถี', 7.0132, 100.4772, 'rescued', NOW() - INTERVAL 1 DAY);

UPDATE help_requests SET case_no = CONCAT('HY-', LPAD(id, 5, '0'));
UPDATE help_requests SET assigned_to = 3, assigned_by = 2, assigned_at = NOW() - INTERVAL 150 MINUTE WHERE status = 'assigned';
UPDATE help_requests SET assigned_to = 4, assigned_by = 2, assigned_at = NOW() - INTERVAL 23 HOUR, resolved_at = NOW() - INTERVAL 20 HOUR WHERE status = 'rescued';

INSERT INTO shelters (name, address, lat, lng, capacity, current_occupancy, contact_phone, facilities, status, created_by) VALUES
('ศูนย์พักพิง ม.อ. หาดใหญ่',        'มหาวิทยาลัยสงขลานครินทร์', 7.0072, 100.4979, 500, 188, '074282000', 'ห้องน้ำ, อาหาร 3 มื้อ, หน่วยแพทย์', 'open', 2),
('โรงเรียนหาดใหญ่วิทยาลัย',          'ถนนเพชรเกษม',            7.0186, 100.4733, 300, 300, '074123456', 'ห้องน้ำ, อาหาร', 'full', 2),
('ศาลาประชาคม เทศบาลนครหาดใหญ่',    'ถนนเพชรเกษม',            7.0093, 100.4741, 200, 76,  '074200000', 'ห้องน้ำ, ที่ชาร์จโทรศัพท์', 'open', 2);

INSERT INTO distribution_points (name, address, lat, lng, supply_types, open_time, close_time, contact_phone, status, created_by) VALUES
('จุดแจกอาหาร ตลาดกิมหยง',  'ถนนศุภสารรังสรรค์', 7.0053, 100.4714, 'อาหาร, น้ำดื่ม',       '08:00', '18:00', '0844444444', 'active', 2),
('จุดแจกของ วัดหาดใหญ่ใน',  'ถนนเพชรเกษม',      7.0121, 100.4636, 'อาหาร, ยา, เสื้อผ้า', '07:00', '20:00', '0855555555', 'active', 2),
('จุดแจกน้ำดื่ม สถานีรถไฟ', 'ถนนรัถการ',        7.0025, 100.4690, 'น้ำดื่ม',              '09:00', '17:00', NULL,         'active', 2),
('จุดแจกของ สวนสาธารณะ',    'ถนนกาญจนวนิช',     7.0230, 100.4890, 'อาหาร, ถุงยังชีพ',    '08:00', '16:00', NULL,         'closed', 2);
