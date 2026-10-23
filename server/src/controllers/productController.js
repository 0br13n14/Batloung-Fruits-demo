import { pool } from '../config/db.js';
import { isDuplicateKeyError } from '../utils/database.js';
import { AppError } from '../utils/AppError.js';

const productSelect = `SELECT products.id, products.fruit_id, fruits.name AS fruit_name,
                              products.box_size_id, box_sizes.name AS box_size,
                              products.quantity_per_box, products.selling_price, products.is_active
                       FROM products
                       INNER JOIN fruits ON fruits.id = products.fruit_id
                       INNER JOIN box_sizes ON box_sizes.id = products.box_size_id`;

export async function listProductsController(request, response) {
  const search = request.query.search ? `%${request.query.search}%` : null;
  const fruitId = request.query.fruit ?? null;
  const boxSizeId = request.query.boxSize ?? null;
  const isActive =
    request.query.status === 'Active'
      ? true
      : request.query.status === 'Inactive'
        ? false
        : null;
  const [products] = await pool.execute(
    `${productSelect}
     WHERE (? IS NULL OR fruits.name LIKE ?)
       AND (? IS NULL OR products.fruit_id = ?)
       AND (? IS NULL OR products.box_size_id = ?)
       AND (? IS NULL OR products.is_active = ?)
     ORDER BY fruits.name, box_sizes.id`,
    [search, search, fruitId, fruitId, boxSizeId, boxSizeId, isActive, isActive]
  );
  response.status(200).json({ products });
}

export async function getProductController(request, response) {
  const [products] = await pool.execute(
    `${productSelect} WHERE products.id = ?`,
    [request.params.id]
  );
  if (products.length === 0) {
    throw new AppError('Product not found.', 404);
  }
  response.status(200).json({ product: products[0] });
}

async function validateProductReferences(connection, fruitId, boxSizeId) {
  const [fruits] = await connection.execute(
    'SELECT id FROM fruits WHERE id = ? AND is_active = TRUE',
    [fruitId]
  );
  if (fruits.length === 0) {
    throw new AppError('Active fruit not found.', 422, [
      { field: 'fruit_id', message: 'Choose an active fruit.' }
    ]);
  }

  const [boxSizes] = await connection.execute(
    'SELECT id FROM box_sizes WHERE id = ?',
    [boxSizeId]
  );
  if (boxSizes.length === 0) {
    throw new AppError('Box size not found.', 422, [
      { field: 'box_size_id', message: 'Choose an existing box size.' }
    ]);
  }
}

function duplicateProductError(error) {
  if (isDuplicateKeyError(error)) {
    throw new AppError('A product with this fruit and box size already exists.', 409);
  }
  throw error;
}

export async function createProductController(request, response) {
  try {
    await validateProductReferences(pool, request.body.fruit_id, request.body.box_size_id);
    const [result] = await pool.execute(
      `INSERT INTO products
        (fruit_id, box_size_id, quantity_per_box, selling_price, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        request.body.fruit_id,
        request.body.box_size_id,
        request.body.quantity_per_box,
        request.body.selling_price,
        request.body.is_active ?? true
      ]
    );
    const [products] = await pool.execute(`${productSelect} WHERE products.id = ?`, [result.insertId]);
    response.status(201).json({ product: products[0] });
  } catch (error) {
    duplicateProductError(error);
  }
}

export async function updateProductController(request, response) {
  try {
    await validateProductReferences(pool, request.body.fruit_id, request.body.box_size_id);
    const [result] = await pool.execute(
      `UPDATE products
       SET fruit_id = ?, box_size_id = ?, quantity_per_box = ?, selling_price = ?, is_active = ?
       WHERE id = ?`,
      [
        request.body.fruit_id,
        request.body.box_size_id,
        request.body.quantity_per_box,
        request.body.selling_price,
        request.body.is_active ?? true,
        request.params.id
      ]
    );
    if (result.affectedRows === 0) {
      const [rows] = await pool.execute('SELECT id FROM products WHERE id = ?', [request.params.id]);
      if (rows.length === 0) {
        throw new AppError('Product not found.', 404);
      }
    }
    const [products] = await pool.execute(`${productSelect} WHERE products.id = ?`, [request.params.id]);
    response.status(200).json({ product: products[0] });
  } catch (error) {
    duplicateProductError(error);
  }
}

export async function deactivateProductController(request, response) {
  const [result] = await pool.execute(
    'UPDATE products SET is_active = FALSE WHERE id = ?',
    [request.params.id]
  );
  if (result.affectedRows === 0) {
    const [products] = await pool.execute('SELECT id FROM products WHERE id = ?', [request.params.id]);
    if (products.length === 0) {
      throw new AppError('Product not found.', 404);
    }
  }
  response.status(200).json({ message: 'Product deactivated.' });
}
