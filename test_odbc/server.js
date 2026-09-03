import express from 'express';
import sql from 'mssql';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const config = {
  server: 'weijie-db.database.windows.net',
  database: 'weijie-db',
  user: 'admin_12345_SCOTT',
  password: 'pw+++SUM+++1234',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

app.get('/api/test-db', async (req, res) => {
  try {
    let pool = await sql.connect(config);
    let result = await pool.request().query('SELECT 1 AS status');
    res.json({ message: "Connected successfully!", data: result.recordset });
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log('Backend running on http://localhost:5000'));



app.get('/api/users', async (req, res) => {
  try {
    let pool = await sql.connect(config);
    
    // Explicitly target the user3 schema and topUser table
    let result = await pool.request().query('SELECT user_ID, username, accountType FROM user3.topUser');
    
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({ error: err.message });
  }
});