/**
 * this is by weijie
 * the js to fetch from db
 * 
 * this script is not in use?
 */
// db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool to reuse database connections efficiently
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'NewPassword123!',
  database: process.env.DB_NAME || 'user',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper function to test connection on startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(' Successfully connected to local MySQL database on port 3306!');
    connection.release();
  } catch (error) {
    console.error(' Database connection failed:', error.message);
  }
}

// Execute connection test on startup
testConnection();

// Export the pool so controllers can execute queries
module.exports = pool;