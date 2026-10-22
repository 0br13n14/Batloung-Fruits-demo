import { pool } from '../config/db.js';
import { withTransaction } from '../utils/database.js';
import { AppError } from '../utils/AppError.js';

const supplierSelect = `SELECT suppliers.id, suppliers.name, suppliers.province_id,
                               provinces.name AS province_name, suppliers.contact_person,
                               suppliers.telephone, suppliers.email, suppliers.physical_address,
                               suppliers.created_at
                        FROM suppliers
                        INNER JOIN provinces ON provinces.id = suppliers.province_id`;

export async function listSuppliersController(request, response) {
  const search = request.query.search ? `%${request.query.search}%` : null;
  const provinceId = request.query.province ?? null;
  const [suppliers] = await pool.execute(
    `${supplierSelect}
     WHERE (? IS NULL OR suppliers.name LIKE ? OR suppliers.contact_person LIKE ?
            OR suppliers.telephone LIKE ? OR suppliers.email LIKE ?)
       AND (? IS NULL OR suppliers.province_id = ?)
     ORDER BY suppliers.name`,
    [search, search, search, search, search, provinceId, provinceId]
  );
  response.status(200).json({ suppliers });
}

export async function getSupplierController(request, response) {
  const [suppliers] = await pool.execute(
    `${supplierSelect} WHERE suppliers.id = ?`,
    [request.params.id]
  );
  if (suppliers.length === 0) {
    throw new AppError('Supplier not found.', 404);
  }
  response.status(200).json({ supplier: suppliers[0] });
}

async function validateSupplierProvince(connection, provinceId) {
  const [provinces] = await connection.execute(
    'SELECT id FROM provinces WHERE id = ?',
    [provinceId]
  );
  if (provinces.length === 0) {
    throw new AppError('Province not found.', 422, [
      { field: 'province_id', message: 'Choose an existing province.' }
    ]);
  }
}

export async function createSupplierController(request, response) {
  const supplier = await withTransaction(async (connection) => {
    await validateSupplierProvince(connection, request.body.province_id);
    const [result] = await connection.execute(
      `INSERT INTO suppliers
        (name, province_id, contact_person, telephone, email, physical_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        request.body.name,
        request.body.province_id,
        request.body.contact_person ?? null,
        request.body.telephone ?? null,
        request.body.email ?? null,
        request.body.physical_address ?? null
      ]
    );
    return { id: result.insertId, ...request.body };
  });
  response.status(201).json({ supplier });
}

export async function updateSupplierController(request, response) {
  const supplier = await withTransaction(async (connection) => {
    await validateSupplierProvince(connection, request.body.province_id);
    const [result] = await connection.execute(
      `UPDATE suppliers
       SET name = ?, province_id = ?, contact_person = ?, telephone = ?, email = ?, physical_address = ?
       WHERE id = ?`,
      [
        request.body.name,
        request.body.province_id,
        request.body.contact_person ?? null,
        request.body.telephone ?? null,
        request.body.email ?? null,
        request.body.physical_address ?? null,
        request.params.id
      ]
    );
    if (result.affectedRows === 0) {
      const [rows] = await connection.execute('SELECT id FROM suppliers WHERE id = ?', [request.params.id]);
      if (rows.length === 0) {
        throw new AppError('Supplier not found.', 404);
      }
    }
    return { id: Number(request.params.id), ...request.body };
  });
  response.status(200).json({ supplier });
}

export async function deleteSupplierController(request, response) {
  await withTransaction(async (connection) => {
    const [suppliers] = await connection.execute(
      'SELECT id FROM suppliers WHERE id = ? FOR UPDATE',
      [request.params.id]
    );
    if (suppliers.length === 0) {
      throw new AppError('Supplier not found.', 404);
    }
    const [purchases] = await connection.execute(
      'SELECT id FROM purchases WHERE supplier_id = ? LIMIT 1',
      [request.params.id]
    );
    if (purchases.length > 0) {
      throw new AppError('Supplier cannot be deleted because purchases depend on it.', 409);
    }
    await connection.execute('DELETE FROM suppliers WHERE id = ?', [request.params.id]);
  });
  response.status(200).json({ message: 'Supplier deleted.' });
}
