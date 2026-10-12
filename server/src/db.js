const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hatyai_floods',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  // ให้ DECIMAL (lat/lng) และ COUNT/SUM ออกมาเป็น number แทน string
  decimalNumbers: true,
  supportBigNumbers: true,
  bigNumberStrings: false,
  dateStrings: false,
});

module.exports = pool;
