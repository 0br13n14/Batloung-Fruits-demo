import { pool } from '../config/db.js';

export async function getProvincesController(request, response) {
  const [provinces] = await pool.execute(
    'SELECT id, name FROM provinces ORDER BY name'
  );
  response.status(200).json({ provinces });
}

export async function getBoxSizesController(request, response) {
  const [boxSizes] = await pool.execute(
    'SELECT id, name FROM box_sizes ORDER BY id'
  );
  response.status(200).json({ boxSizes });
}
