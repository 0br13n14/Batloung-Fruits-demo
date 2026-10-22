import { pool } from '../config/db.js';
import { withTransaction } from '../utils/database.js';
import { AppError } from '../utils/AppError.js';

export async function listStockController(request, response) {
  const search = request.query.search ? `%${request.query.search}%` : null;
  const fruitId = request.query.fruit ?? null;
  const boxSizeId = request.query.boxSize ?? null;
  const [stock] = await pool.execute(
    `SELECT products.id AS product_id, fruits.name AS fruit_name,
            products.fruit_id, products.box_size_id, box_sizes.name AS box_size,
            products.quantity_per_box, products.selling_price, products.is_active,
            COALESCE(stock.id, 0) AS id,
            COALESCE(stock.quantity_available, 0) AS quantity_available
     FROM products
     INNER JOIN fruits ON fruits.id = products.fruit_id
     INNER JOIN box_sizes ON box_sizes.id = products.box_size_id
     LEFT JOIN stock ON stock.product_id = products.id
     WHERE (? IS NULL OR fruits.name LIKE ?)
       AND (? IS NULL OR products.fruit_id = ?)
       AND (? IS NULL OR products.box_size_id = ?)
     ORDER BY fruits.name, box_sizes.id`,
    [search, search, fruitId, fruitId, boxSizeId, boxSizeId]
  );
  response.status(200).json({ stock });
}

export async function recordPurchaseController(request, response) {
  const purchase = await withTransaction(async (connection) => {
    const [products] = await connection.execute(
      `SELECT products.id, products.fruit_id, fruits.name AS fruit_name
       FROM products
       INNER JOIN fruits ON fruits.id = products.fruit_id
       WHERE products.id = ? AND products.is_active = TRUE AND fruits.is_active = TRUE
       FOR UPDATE`,
      [request.body.product_id]
    );
    if (products.length === 0) {
      throw new AppError('Active product not found.', 404);
    }

    const [suppliers] = await connection.execute(
      `SELECT suppliers.id, suppliers.province_id, provinces.name AS province_name
       FROM suppliers
       INNER JOIN provinces ON provinces.id = suppliers.province_id
       WHERE suppliers.id = ?
       FOR UPDATE`,
      [request.body.supplier_id]
    );
    if (suppliers.length === 0) {
      throw new AppError('Supplier not found.', 404);
    }

    const [allowedProvinces] = await connection.execute(
      `SELECT province_id FROM fruit_source_provinces
       WHERE fruit_id = ? AND province_id = ?`,
      [products[0].fruit_id, suppliers[0].province_id]
    );
    if (allowedProvinces.length === 0) {
      throw new AppError(
        `${suppliers[0].province_name} is not an allowed source province for ${products[0].fruit_name}.`,
        422,
        [{ field: 'supplier_id', message: 'Supplier province is not a source province for this fruit.' }]
      );
    }

    const [result] = await connection.execute(
      `INSERT INTO purchases
        (supplier_id, product_id, quantity_boxes, unit_cost, purchase_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        request.body.supplier_id,
        request.body.product_id,
        request.body.quantity_boxes,
        request.body.unit_cost,
        request.body.purchase_date ?? new Date().toISOString().slice(0, 10),
        request.user.id
      ]
    );
    await connection.execute(
      `INSERT INTO stock (product_id, quantity_available)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE quantity_available = quantity_available + VALUES(quantity_available)`,
      [request.body.product_id, request.body.quantity_boxes]
    );
    const [stock] = await connection.execute(
      'SELECT id, quantity_available FROM stock WHERE product_id = ?',
      [request.body.product_id]
    );
    return {
      id: result.insertId,
      ...request.body,
      purchase_date: request.body.purchase_date ?? new Date().toISOString().slice(0, 10),
      created_by: request.user.id,
      quantity_available: stock[0].quantity_available
    };
  });
  response.status(201).json({ purchase });
}

export async function updateStockController(request, response) {
  const [result] = await pool.execute(
    'UPDATE stock SET quantity_available = ? WHERE id = ?',
    [request.body.quantity_available, request.params.id]
  );
  if (result.affectedRows === 0) {
    const [rows] = await pool.execute('SELECT id FROM stock WHERE id = ?', [request.params.id]);
    if (rows.length === 0) {
      throw new AppError('Stock record not found.', 404);
    }
  }
  const [stock] = await pool.execute(
    `SELECT stock.id, stock.product_id, stock.quantity_available,
            fruits.name AS fruit_name, box_sizes.name AS box_size
     FROM stock
     INNER JOIN products ON products.id = stock.product_id
     INNER JOIN fruits ON fruits.id = products.fruit_id
     INNER JOIN box_sizes ON box_sizes.id = products.box_size_id
     WHERE stock.id = ?`,
    [request.params.id]
  );
  response.status(200).json({ stock: stock[0] });
}
