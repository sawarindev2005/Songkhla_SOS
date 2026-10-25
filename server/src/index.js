require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pool = require('./db');

if (!process.env.JWT_SECRET) {
  console.error('ยังไม่ได้ตั้งค่า JWT_SECRET ใน server/.env');
  process.exit(1);
}

const app = express();
// credentials: true ให้ browser ส่ง/รับคุกกี้ token ข้าม origin ได้
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/shelters', require('./routes/shelters'));
app.use('/api/distributions', require('./routes/distributions'));
app.use('/api/users', require('./routes/users'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/announcements', require('./routes/announcements').announcementRouter());

app.use((req, res) => res.status(404).json({ message: 'ไม่พบ API นี้' }));

// Express 5 ส่ง error จาก async handler มาที่นี่อัตโนมัติ
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'ข้อมูลซ้ำกับที่มีอยู่แล้ว' });
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_BAD_DB_ERROR') {
    return res.status(503).json({ message: 'เชื่อมต่อฐานข้อมูลไม่ได้' });
  }
  res.status(err.status || 500).json({ message: err.expose ? err.message : 'เกิดข้อผิดพลาดในระบบ' });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`API พร้อมใช้งานที่ http://localhost:${port}/api`));
