import { pool } from '../config/db.js';
import { VENDOR_STATUSES } from '../constants.js';
import { AppError } from '../utils/AppError.js';

const vendorSelect = `SELECT id, vendor_name, business_name, telephone, location_area,
                             latitude, longitude, registration_date, status
                      FROM street_vendors`;

export async function listVendorsController(request, response) {
  const search = request.query.search ? `%${request.query.search}%` : null;
  const status = request.query.status ?? null;
  const [vendors] = await pool.execute(
    `${vendorSelect}
     WHERE (? IS NULL OR vendor_name LIKE ? OR business_name LIKE ?
            OR telephone LIKE ? OR location_area LIKE ?)
       AND (? IS NULL OR status = ?)
     ORDER BY vendor_name`,
    [search, search, search, search, search, status, status]
  );
  response.status(200).json({ vendors });
}

export async function getVendorController(request, response) {
  const [vendors] = await pool.execute(
    `${vendorSelect} WHERE id = ?`,
    [request.params.id]
  );
  if (vendors.length === 0) {
    throw new AppError('Vendor not found.', 404);
  }
  response.status(200).json({ vendor: vendors[0] });
}

function vendorValues(body) {
  return [
    body.vendor_name,
    body.business_name ?? null,
    body.telephone,
    body.location_area,
    body.latitude ?? null,
    body.longitude ?? null,
    body.registration_date,
    body.status ?? VENDOR_STATUSES.ACTIVE
  ];
}

export async function createVendorController(request, response) {
  const values = vendorValues(request.body);
  if ((values[4] === null) !== (values[5] === null)) {
    throw new AppError('Latitude and longitude must be provided together.', 422, [
      { field: 'latitude', message: 'Provide both coordinates or neither.' },
      { field: 'longitude', message: 'Provide both coordinates or neither.' }
    ]);
  }
  const [result] = await pool.execute(
    `INSERT INTO street_vendors
      (vendor_name, business_name, telephone, location_area, latitude, longitude, registration_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );
  response.status(201).json({
    vendor: { id: result.insertId, ...request.body, status: request.body.status ?? VENDOR_STATUSES.ACTIVE }
  });
}

export async function updateVendorController(request, response) {
  const values = vendorValues(request.body);
  if ((values[4] === null) !== (values[5] === null)) {
    throw new AppError('Latitude and longitude must be provided together.', 422, [
      { field: 'latitude', message: 'Provide both coordinates or neither.' },
      { field: 'longitude', message: 'Provide both coordinates or neither.' }
    ]);
  }
  const [result] = await pool.execute(
    `UPDATE street_vendors
     SET vendor_name = ?, business_name = ?, telephone = ?, location_area = ?,
         latitude = ?, longitude = ?, registration_date = ?, status = ?
     WHERE id = ?`,
    [...values, request.params.id]
  );
  if (result.affectedRows === 0) {
    const [vendors] = await pool.execute('SELECT id FROM street_vendors WHERE id = ?', [request.params.id]);
    if (vendors.length === 0) {
      throw new AppError('Vendor not found.', 404);
    }
  }
  response.status(200).json({
    vendor: { id: Number(request.params.id), ...request.body, status: request.body.status ?? VENDOR_STATUSES.ACTIVE }
  });
}

export async function deactivateVendorController(request, response) {
  const [result] = await pool.execute(
    'UPDATE street_vendors SET status = ? WHERE id = ?',
    [VENDOR_STATUSES.INACTIVE, request.params.id]
  );
  if (result.affectedRows === 0) {
    const [vendors] = await pool.execute('SELECT id FROM street_vendors WHERE id = ?', [request.params.id]);
    if (vendors.length === 0) {
      throw new AppError('Vendor not found.', 404);
    }
  }
  response.status(200).json({ message: 'Vendor deactivated.' });
}
