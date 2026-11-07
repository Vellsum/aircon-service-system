const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.SUPABASE_DATABASE_URL) {
    throw new Error('SUPABASE_DATABASE_URL is missing from .env');
}

const pool = new Pool({
    connectionString: process.env.SUPABASE_DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pool.on('connect', () => {
    console.log('[DB] Connected to Supabase PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[DB] Unexpected PostgreSQL error:', err.message);
});

module.exports = pool;