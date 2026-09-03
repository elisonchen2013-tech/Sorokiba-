// db.js — persistência no Postgres do Render
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida! Configure em Render → Environment.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store (
      key   TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  console.log('✅ Postgres conectado e tabela "store" pronta');
}

async function get(key) {
  const { rows } = await pool.query('SELECT value FROM store WHERE key = $1', [key]);
  return rows.length ? rows[0].value : null;
}

async function set(key, value) {
  await pool.query(
    `INSERT INTO store (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)]
  );
}

module.exports = { pool, init, get, set };
