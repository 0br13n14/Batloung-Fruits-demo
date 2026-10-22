import { pool } from '../config/db.js';
import { ORDER_STATUSES, ORDER_STATUS_VALUES } from '../constants.js';
import { normalizeNumericRows } from '../utils/normalizeNumericRows.js';

export async function getDashboardController(request, response) {
  const [summaryRows] = await pool.execute(
    `SELECT
       (SELECT COUNT(*) FROM fruits WHERE is_active = TRUE) AS total_fruits,
       (SELECT COUNT(*) FROM suppliers) AS total_suppliers,
       (SELECT COUNT(*) FROM street_vendors) AS total_registered_vendors,
       (SELECT COALESCE(SUM(quantity_available), 0) FROM stock) AS available_stock,
       (SELECT COUNT(*) FROM orders) AS total_orders,
       (SELECT COUNT(*) FROM orders WHERE status = ?) AS pending_orders,
       (SELECT COUNT(*) FROM orders WHERE status = ?) AS completed_orders,
       (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = ?) AS sales_value`,
    [ORDER_STATUSES.PENDING, ORDER_STATUSES.COMPLETED, ORDER_STATUSES.COMPLETED]
  );
  const [salesRows] = await pool.execute(
    `SELECT fruits.id AS fruit_id, fruits.name AS fruit_name,
            COALESCE(SUM(CASE WHEN orders.id IS NOT NULL THEN order_items.quantity_boxes ELSE 0 END), 0) AS boxes_sold,
            COALESCE(SUM(CASE WHEN orders.id IS NOT NULL THEN order_items.subtotal ELSE 0 END), 0) AS sales_value
     FROM fruits
     LEFT JOIN products ON products.fruit_id = fruits.id
     LEFT JOIN order_items ON order_items.product_id = products.id
     LEFT JOIN orders ON orders.id = order_items.order_id AND orders.status = ?
     WHERE fruits.is_active = TRUE
     GROUP BY fruits.id
     ORDER BY sales_value DESC, fruits.name`,
    [ORDER_STATUSES.COMPLETED]
  );
  const [statusRows] = await pool.execute(
    `SELECT status, COUNT(*) AS order_count
     FROM orders
     GROUP BY status
     ORDER BY FIELD(status, ?, ?, ?, ?, ?, ?)`,
    ORDER_STATUS_VALUES
  );
  const [recentOrders] = await pool.execute(
    `SELECT orders.id, street_vendors.vendor_name, orders.order_date,
            orders.status, orders.total_amount
     FROM orders
     INNER JOIN street_vendors ON street_vendors.id = orders.vendor_id
     ORDER BY orders.order_date DESC, orders.id DESC
     LIMIT 10`
  );
  const [summary] = normalizeNumericRows([summaryRows[0]], [
    'total_fruits', 'total_suppliers', 'total_registered_vendors', 'available_stock',
    'total_orders', 'pending_orders', 'completed_orders', 'sales_value'
  ]);
  response.status(200).json({
    summary,
    sales_by_fruit: normalizeNumericRows(salesRows, ['boxes_sold', 'sales_value']),
    orders_by_status: normalizeNumericRows(statusRows, ['order_count']),
    recent_orders: normalizeNumericRows(recentOrders, ['total_amount'])
  });
}
