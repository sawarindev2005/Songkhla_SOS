-- อัปเกรดฐานข้อมูลที่มีอยู่แล้ว (มีข้อมูลจริง ห้ามรัน schema.sql ทับ) ให้รองรับการสมัครอาสากู้ภัย
-- รันครั้งเดียวก่อน restart API เวอร์ชันใหม่
USE hatyai_floods;

ALTER TABLE users
  ADD COLUMN team_size    INT NULL AFTER team_name,
  ADD COLUMN equipment    VARCHAR(255) NULL AFTER team_size,
  ADD COLUMN service_area VARCHAR(255) NULL AFTER equipment;

CREATE TABLE IF NOT EXISTS rescuer_applications (
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
