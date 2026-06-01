import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../db/connection';

const RESET_POINTS = 10;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function runReset() {
  try {
    const [users] = await pool.execute<RowDataPacket[]>(
      "SELECT uuid FROM users WHERE points_reset_at <= DATE_SUB(NOW(), INTERVAL 180 DAY)",
    );

    if (users.length === 0) return;

    for (const user of users) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute(
          "UPDATE users SET points = ?, points_reset_at = NOW() WHERE uuid = ?",
          [RESET_POINTS, user.uuid],
        );
        await conn.execute(
          "INSERT INTO point_transactions (uuid, user_id, delta, reason) VALUES (?, ?, ?, 'reset')",
          [crypto.randomUUID(), user.uuid, RESET_POINTS],
        );
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        console.error(`Failed to reset points for user ${user.uuid}:`, e);
      } finally {
        conn.release();
      }
    }

    console.log(`Reset points for ${users.length} user(s)`);
  } catch (e) {
    console.error('Point reset job error:', e);
  }
}

export function startPointResetJob() {
  runReset();
  setInterval(runReset, CHECK_INTERVAL_MS);
}
