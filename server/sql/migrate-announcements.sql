-- Additive migration: run only after approval against the intended existing database.
-- Does not drop or alter any existing table; do not run schema.sql on existing data.
CREATE TABLE IF NOT EXISTS public_announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  content TEXT NOT NULL,
  tone ENUM('info','org','red') NOT NULL DEFAULT 'info',
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_announcement_public (is_published, published_at, id),
  CONSTRAINT fk_announcement_author FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
