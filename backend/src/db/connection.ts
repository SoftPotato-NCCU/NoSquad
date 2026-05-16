import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'database',
  port: Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_DATABASE ?? 'nosquad',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
});
