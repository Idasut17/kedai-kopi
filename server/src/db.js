import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Expect DATABASE_URL like: mysql://user:pass@host:3306/kedaikopi
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 10
});

export async function query(sql, params = []){
  const start = Date.now();
  const [rows, fields] = await pool.execute(sql, params);
  const duration = Date.now() - start;
  if(process.env.DEBUG_SQL){
    console.log('executed query', { sql, duration, rows: Array.isArray(rows)? rows.length : rows });
  }
  // Normalize to { rows, rowCount }
  if (Array.isArray(rows)) {
    return { rows, rowCount: rows.length };
  } else {
    // For INSERT/UPDATE/DELETE results
    return { rows: [], rowCount: rows.affectedRows ?? 0, info: rows };
  }
}

export async function getClient(){
  // Not commonly used in mysql2; return pool to keep API parity
  return pool;
}
