const { Pool } = require('pg');
require('dotenv').config();

// Ensure DATABASE_URL is set (Supabase connection string)
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing in environment variables');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Supabase (PostgreSQL) connection failed:', err.message);
  } else {
    console.log('✅ Supabase (PostgreSQL) connected successfully');
    release();
  }
});

module.exports = pool;
