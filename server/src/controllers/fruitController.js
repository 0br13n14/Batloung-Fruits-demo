import { pool } from '../config/db.js';
import { withTransaction, isDuplicateKeyError } from '../utils/database.js';
import { AppError } from '../utils/AppError.js';

export async function listFruitsController(request, response) {
  const search = request.query.search ? `%${request.query.search}%` : null;
  const isActive =
    request.query.status === 'Active'
      ? true
      : request.query.status === 'Inactive'
        ? false
        : null;
  const [fruits] = await pool.execute(
    `SELECT fruits.id, fruits.name, fruits.description, fruits.is_active,
            (SELECT COALESCE(
               JSON_ARRAYAGG(JSON_OBJECT('id', provinces.id, 'name', provinces.name)),
               JSON_ARRAY()
             )
             FROM fruit_source_provinces
             INNER JOIN provinces ON provinces.id = fruit_source_provinces.province_id
             WHERE fruit_source_provinces.fruit_id = fruits.id) AS source_provinces
     FROM fruits
     WHERE (? IS NULL OR fruits.name LIKE ?)
       AND (? IS NULL OR fruits.is_active = ?)
     ORDER BY fruits.name`,
    [search, search, isActive, isActive]
  );
  response.status(200).json({ fruits });
}

export async function getFruitController(request, response) {
  const [fruits] = await pool.execute(
    `SELECT fruits.id, fruits.name, fruits.description, fruits.is_active,
            (SELECT COALESCE(
               JSON_ARRAYAGG(JSON_OBJECT('id', provinces.id, 'name', provinces.name)),
               JSON_ARRAY()
             )
             FROM fruit_source_provinces
             INNER JOIN provinces ON provinces.id = fruit_source_provinces.province_id
             WHERE fruit_source_provinces.fruit_id = fruits.id) AS source_provinces
     FROM fruits
     WHERE fruits.id = ?
     `,
    [request.params.id]
  );
  if (fruits.length === 0) {
    throw new AppError('Fruit not found.', 404);
  }
  response.status(200).json({ fruit: fruits[0] });
}

async function saveSourceProvinces(connection, fruitId, provinceIds) {
  if (provinceIds === undefined) {
    return;
  }

  const uniqueIds = [...new Set(provinceIds.map(Number))];
  if (uniqueIds.length > 0) {
    const placeholders = uniqueIds.map(() => '?').join(', ');
    const [provinces] = await connection.execute(
      `SELECT id FROM provinces WHERE id IN (${placeholders})`,
      uniqueIds
    );
    if (provinces.length !== uniqueIds.length) {
      throw new AppError('One or more source provinces do not exist.', 422, [
        { field: 'source_province_ids', message: 'Choose existing provinces.' }
      ]);
    }
  }

  await connection.execute(
    'DELETE FROM fruit_source_provinces WHERE fruit_id = ?',
    [fruitId]
  );
  for (const provinceId of uniqueIds) {
    await connection.execute(
      'INSERT INTO fruit_source_provinces (fruit_id, province_id) VALUES (?, ?)',
      [fruitId, provinceId]
    );
  }
}

function getFruitNameVariants(name) {
  const normalizedName = name.trim().toLowerCase();
  const variants = new Set([normalizedName]);
  if (normalizedName.endsWith('es') && normalizedName.length > 2) {
    variants.add(normalizedName.slice(0, -2));
  }
  if (normalizedName.endsWith('s') && normalizedName.length > 1) {
    variants.add(normalizedName.slice(0, -1));
  }
  return variants;
}

async function assertFruitNameIsUnique(connection, name, excludeId) {
  const [rows] = await connection.execute(
    `SELECT id, name
     FROM fruits
     ${excludeId === undefined ? '' : 'WHERE id <> ?'}
     FOR UPDATE`,
    excludeId === undefined ? [] : [excludeId]
  );
  const nameVariants = getFruitNameVariants(name);
  if (
    rows.some((fruit) =>
      [...getFruitNameVariants(fruit.name)].some((variant) =>
        nameVariants.has(variant)
      )
    )
  ) {
    throw new AppError(
      'A fruit with the same name or a singular/plural variant already exists.',
      409
    );
  }
}

export async function createFruitController(request, response) {
  try {
    const fruit = await withTransaction(async (connection) => {
      await assertFruitNameIsUnique(connection, request.body.name);
      const [result] = await connection.execute(
        'INSERT INTO fruits (name, description, is_active) VALUES (?, ?, ?)',
        [request.body.name, request.body.description ?? null, request.body.is_active ?? true]
      );
      await saveSourceProvinces(connection, result.insertId, request.body.source_province_ids);
      return { id: result.insertId, ...request.body };
    });
    response.status(201).json({ fruit });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        'A fruit with the same name or a singular/plural variant already exists.',
        409
      );
    }
    throw error;
  }
}

export async function updateFruitController(request, response) {
  try {
    const fruit = await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        'SELECT id FROM fruits WHERE id = ? FOR UPDATE',
        [request.params.id]
      );
      if (rows.length === 0) {
        throw new AppError('Fruit not found.', 404);
      }

      await assertFruitNameIsUnique(
        connection,
        request.body.name,
        Number(request.params.id)
      );
      await connection.execute(
        `UPDATE fruits
         SET name = ?, description = ?, is_active = ?
         WHERE id = ?`,
        [
          request.body.name,
          request.body.description ?? null,
          request.body.is_active ?? true,
          request.params.id
        ]
      );
      await saveSourceProvinces(connection, request.params.id, request.body.source_province_ids);
      return { id: Number(request.params.id), ...request.body };
    });
    response.status(200).json({ fruit });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        'A fruit with the same name or a singular/plural variant already exists.',
        409
      );
    }
    throw error;
  }
}

export async function deactivateFruitController(request, response) {
  const [result] = await pool.execute(
    'UPDATE fruits SET is_active = FALSE WHERE id = ?',
    [request.params.id]
  );
  if (result.affectedRows === 0) {
    const [fruits] = await pool.execute('SELECT id FROM fruits WHERE id = ?', [request.params.id]);
    if (fruits.length === 0) {
      throw new AppError('Fruit not found.', 404);
    }
  }
  response.status(200).json({ message: 'Fruit deactivated.' });
}
