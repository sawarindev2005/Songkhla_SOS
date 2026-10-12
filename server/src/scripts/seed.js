// สร้าง/รีเซ็ตบัญชี admin:  npm run seed -- <username> <password>
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../db');

async function main() {
  const [username = 'admin', password = 'admin1234'] = process.argv.slice(2);
  if (password.length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (username, password_hash, full_name, role)
     VALUES (?, ?, 'ผู้ดูแลระบบ', 'admin')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin', is_active = 1`,
    [username, hash]
  );
  console.log(`บัญชี admin "${username}" พร้อมใช้งาน`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
