// Connexion MariaDB avec mysql2 (méthode classique)
const mysql = require("mysql2/promise");

const config = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "timemanager",
  password: process.env.DB_PASS || "timemanager",
  database: process.env.DB_NAME || "timemanager",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(config);
  }
  return pool;
}

async function query(sql, params = []) {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  query,
  queryOne,
  close,
};
