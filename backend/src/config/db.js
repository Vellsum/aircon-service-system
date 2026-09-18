// backend/src/config/db.js
const sql = require('mssql');
const path = require('path');

// Ensure dotenv loads .env from the backend root directory
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('✅ Connected successfully to Azure SQL Database (Backend)!');
        return pool;
    })
    .catch(err => {
        console.error('❌ Database Connection Failed:', err.message);
    });

module.exports = { sql, poolPromise };