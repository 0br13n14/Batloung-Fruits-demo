import { pool } from '../config/db.js';
import { ORDER_STATUSES } from '../constants.js';
import { AppError } from '../utils/AppError.js';
import { normalizeNumericRows } from '../utils/normalizeNumericRows.js';

async function getAvailableStock() {
  const [rows] = await pool.execute(
    `SELECT products.id AS product_id, fruits.name AS fruit_name,
            box_sizes.name AS box_size,
            COALESCE(stock.quantity_available, 0) AS quantity_available
     FROM products
     INNER JOIN fruits ON fruits.id = products.fruit_id
     INNER JOIN box_sizes ON box_sizes.id = products.box_size_id
     LEFT JOIN stock ON stock.product_id = products.id
     ORDER BY fruits.name, box_sizes.id`
  );
  return normalizeNumericRows(rows, ['quantity_available']);
}

async function getSalesByFruit() {
  const [rows] = await pool.execute(
    `SELECT fruits.id AS fruit_id, fruits.name AS fruit_name,
            COALESCE(SUM(CASE WHEN orders.id IS NOT NULL THEN order_items.quantity_boxes ELSE 0 END), 0) AS boxes_sold,
            COALESCE(SUM(CASE WHEN orders.id IS NOT NULL THEN order_items.subtotal ELSE 0 END), 0) AS sales_value
     FROM fruits
     LEFT JOIN products ON products.fruit_id = fruits.id
     LEFT JOIN order_items ON order_items.product_id = products.id
     LEFT JOIN orders ON orders.id = order_items.order_id AND orders.status = ?
     GROUP BY fruits.id
     ORDER BY sales_value DESC, fruits.name`,
    [ORDER_STATUSES.COMPLETED]
  );
  return normalizeNumericRows(rows, ['boxes_sold', 'sales_value']);
}

async function getSalesByBoxSize() {
  const [rows] = await pool.execute(
    `SELECT box_sizes.id AS box_size_id, box_sizes.name AS box_size,
            COALESCE(SUM(CASE WHEN orders.id IS NOT NULL THEN order_items.quantity_boxes ELSE 0 END), 0) AS boxes_sold,
            COALESCE(SUM(CASE WHEN orders.id IS NOT NULL THEN order_items.subtotal ELSE 0 END), 0) AS sales_value
     FROM box_sizes
     LEFT JOIN products ON products.box_size_id = box_sizes.id
     LEFT JOIN order_items ON order_items.product_id = products.id
     LEFT JOIN orders ON orders.id = order_items.order_id AND orders.status = ?
     GROUP BY box_sizes.id
     ORDER BY box_sizes.id`,
    [ORDER_STATUSES.COMPLETED]
  );
  return normalizeNumericRows(rows, ['boxes_sold', 'sales_value']);
}

async function getSalesByVendor() {
  const [rows] = await pool.execute(
    `SELECT street_vendors.id AS vendor_id, street_vendors.vendor_name,
            COALESCE(SUM(order_items.quantity_boxes), 0) AS boxes_sold,
            COALESCE(SUM(order_items.subtotal), 0) AS sales_value
     FROM street_vendors
     LEFT JOIN orders ON orders.vendor_id = street_vendors.id AND orders.status = ?
     LEFT JOIN order_items ON order_items.order_id = orders.id
     GROUP BY street_vendors.id
     ORDER BY sales_value DESC, street_vendors.vendor_name`,
    [ORDER_STATUSES.COMPLETED]
  );
  return normalizeNumericRows(rows, ['boxes_sold', 'sales_value']);
}

async function getPurchasesByProvince() {
  const [rows] = await pool.execute(
    `SELECT provinces.id AS province_id, provinces.name AS province_name,
            COALESCE(SUM(purchases.quantity_boxes), 0) AS boxes_purchased,
            COALESCE(SUM(purchases.quantity_boxes * purchases.unit_cost), 0) AS total_cost
     FROM provinces
     LEFT JOIN suppliers ON suppliers.province_id = provinces.id
     LEFT JOIN purchases ON purchases.supplier_id = suppliers.id
     GROUP BY provinces.id
     ORDER BY provinces.name`
  );
  return normalizeNumericRows(rows, ['boxes_purchased', 'total_cost']);
}

async function getOrdersByStatus(status) {
  const [rows] = await pool.execute(
    `SELECT orders.id, orders.vendor_id, street_vendors.vendor_name,
            orders.order_date, orders.status, orders.total_amount, orders.created_by
     FROM orders
     INNER JOIN street_vendors ON street_vendors.id = orders.vendor_id
     WHERE orders.status = ?
     ORDER BY orders.order_date DESC, orders.id DESC`,
    [status]
  );
  return normalizeNumericRows(rows, ['total_amount']);
}

async function getSalesByDate(from, to) {
  const [rows] = await pool.execute(
    `SELECT DATE(orders.order_date) AS sale_date,
            COALESCE(SUM(orders.total_amount), 0) AS sales_value
     FROM orders
     WHERE orders.status = ?
       AND (? IS NULL OR orders.order_date >= ?)
       AND (? IS NULL OR orders.order_date < DATE_ADD(?, INTERVAL 1 DAY))
     GROUP BY DATE(orders.order_date)
     ORDER BY sale_date`,
    [ORDER_STATUSES.COMPLETED, from, from, to, to]
  );
  return normalizeNumericRows(rows, ['sales_value']);
}

const reportReaders = new Map([
  ['available-stock', getAvailableStock],
  ['sales-by-fruit', getSalesByFruit],
  ['sales-by-box-size', getSalesByBoxSize],
  ['sales-by-vendor', getSalesByVendor],
  ['purchases-by-province', getPurchasesByProvince],
  ['pending-orders', () => getOrdersByStatus(ORDER_STATUSES.PENDING)],
  ['completed-orders', () => getOrdersByStatus(ORDER_STATUSES.COMPLETED)]
]);

export async function getReportController(request, response) {
  const { reportName } = request.params;
  let data;
  if (reportName === 'total-sales-by-date') {
    data = await getSalesByDate(request.query.from ?? null, request.query.to ?? null);
  } else {
    const readReport = reportReaders.get(reportName);
    if (!readReport) {
      throw new AppError('Report not found.', 404);
    }
    data = await readReport();
  }
  response.status(200).json({ report: reportName, data });
}
