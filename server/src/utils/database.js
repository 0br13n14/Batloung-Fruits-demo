import { pool } from '../config/db.js';

export async function withTransaction(work) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function isDuplicateKeyError(error) {
  return error.code === 'ER_DUP_ENTRY';
}
