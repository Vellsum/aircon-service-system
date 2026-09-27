const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'NewPassword123!',
  database: 'user',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get('/api/data', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `user`');
    res.json(rows);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Catch top-level crashes
process.on('uncaughtException', (err) => {
  console.error('CRASH ERROR:', err);
});

app.listen(5000, () => {
  console.log('Server is running on http://localhost:5000');
});