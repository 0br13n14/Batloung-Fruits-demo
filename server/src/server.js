import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

async function startServer() {
  const connection = await pool.getConnection();
  connection.release();

  app.listen(env.port, () => {
    process.stdout.write(`Batloung Fruits API listening on port ${env.port}.\n`);
  });
}

startServer().catch(async (error) => {
  console.error('Unable to start the API or connect to MySQL.', error);
  await pool.end();
  process.exitCode = 1;
});
