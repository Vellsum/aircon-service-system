const sql = require('mssql');
const path = require('path');

// Ensure dotenv loads .env from the backend root directory
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME || process.env.DB_DATABASE,
    port: 1433,
    options: {
        encrypt: true, // Mandatory for Azure SQL
        trustServerCertificate: false,
        connectTimeout: 30000 // 30 second timeout for cloud latency
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log(`✅ Connected successfully to Azure SQL Database (${config.database})!`);
        return pool;
    })
    .catch(err => {
        console.error('❌ Database Connection Failed:', err.message);
        return null;
    });

module.exports = { sql, poolPromise };