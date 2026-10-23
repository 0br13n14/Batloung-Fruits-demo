import { pool } from '../config/db.js';
import { ORDER_STATUSES, ORDER_STATUS_VALUES, ROLES, VENDOR_STATUSES } from '../constants.js';
import { withTransaction } from '../utils/database.js';
import { AppError } from '../utils/AppError.js';

const nextOrderStatus = new Map([
  [ORDER_STATUSES.PENDING, ORDER_STATUSES.CONFIRMED],
  [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.PROCESSING],
  [ORDER_STATUSES.PROCESSING, ORDER_STATUSES.READY_FOR_COLLECTION],
  [ORDER_STATUSES.READY_FOR_COLLECTION, ORDER_STATUSES.COMPLETED]
]);
const MAX_DECIMAL_CENTS = 999_999_999_999n;

function amountFromCents(cents) {
  const value = BigInt(cents);
  const whole = value / 100n;
  const fraction = String(value % 100n).padStart(2, '0');
  return `${whole}.${fraction}`;
}

async function readOrder(connection, orderId) {
  const [orders] = await connection.execute(
    `SELECT orders.id, orders.vendor_id, street_vendors.vendor_name,
            orders.order_date, orders.status, orders.total_amount, orders.created_by
     FROM orders
     INNER JOIN street_vendors ON street_vendors.id = orders.vendor_id
     WHERE orders.id = ?`,
    [orderId]
  );
  if (orders.length === 0) {
    return null;
  }

  const [items] = await connection.execute(
    `SELECT order_items.id, order_items.product_id, fruits.name AS fruit_name,
            box_sizes.name AS box_size, order_items.quantity_boxes,
            order_items.unit_price, order_items.subtotal
     FROM order_items
     INNER JOIN products ON products.id = order_items.product_id
     INNER JOIN fruits ON fruits.id = products.fruit_id
     INNER JOIN box_sizes ON box_sizes.id = products.box_size_id
     WHERE order_items.order_id = ?
     ORDER BY order_items.id`,
    [orderId]
  );
  return { ...orders[0], items };
}

export async function listOrdersController(request, response) {
  const { search = null, status = null, vendor = null, from = null, to = null } = request.query;
  const searchTerm = search ? `%${search}%` : null;
  const [orders] = await pool.execute(
    `SELECT orders.id, orders.vendor_id, street_vendors.vendor_name,
            orders.order_date, orders.status, orders.total_amount, orders.created_by
     FROM orders
     INNER JOIN street_vendors ON street_vendors.id = orders.vendor_id
     WHERE (? IS NULL OR CAST(orders.id AS CHAR) LIKE ? OR street_vendors.vendor_name LIKE ?)
       AND (? IS NULL OR orders.status = ?)
       AND (? IS NULL OR orders.vendor_id = ?)
       AND (? IS NULL OR orders.order_date >= ?)
       AND (? IS NULL OR orders.order_date < DATE_ADD(?, INTERVAL 1 DAY))
     ORDER BY orders.order_date DESC, orders.id DESC`,
    [searchTerm, searchTerm, searchTerm, status, status, vendor, vendor, from, from, to, to]
  );
  response.status(200).json({ orders });
}

export async function getOrderController(request, response) {
  const order = await readOrder(pool, request.params.id);
  if (!order) {
    throw new AppError('Order not found.', 404);
  }
  response.status(200).json({ order });
}

export async function createOrderController(request, response) {
  const order = await withTransaction(async (connection) => {
    const [vendors] = await connection.execute(
      'SELECT id FROM street_vendors WHERE id = ? AND status = ? FOR UPDATE',
      [request.body.vendor_id, VENDOR_STATUSES.ACTIVE]
    );
    if (vendors.length === 0) {
      throw new AppError('Active vendor not found.', 422, [
        { field: 'vendor_id', message: 'Choose a registered Active vendor.' }
      ]);
    }

    const items = request.body.items
      .map((item) => ({ productId: Number(item.product_id), quantity: Number(item.quantity_boxes) }))
      .sort((left, right) => left.productId - right.productId);
    const productIds = items.map((item) => item.productId);
    const placeholders = productIds.map(() => '?').join(', ');
    const [products] = await connection.execute(
      `SELECT products.id, products.selling_price, fruits.name AS fruit_name, box_sizes.name AS box_size
       FROM products
       INNER JOIN fruits ON fruits.id = products.fruit_id
       INNER JOIN box_sizes ON box_sizes.id = products.box_size_id
       WHERE products.id IN (${placeholders})
         AND products.is_active = TRUE AND fruits.is_active = TRUE
       ORDER BY products.id
       FOR UPDATE`,
      productIds
    );
    if (products.length !== productIds.length) {
      throw new AppError('One or more active products were not found.', 422, [
        { field: 'items', message: 'Choose active products.' }
      ]);
    }

    const [stockRows] = await connection.execute(
      `SELECT product_id, quantity_available
       FROM stock
       WHERE product_id IN (${placeholders})
       ORDER BY product_id
       FOR UPDATE`,
      productIds
    );
    const stocks = new Map(stockRows.map((row) => [row.product_id, row.quantity_available]));
    const productById = new Map(products.map((product) => [product.id, product]));
    for (const item of items) {
      const available = stocks.get(item.productId) ?? 0;
      if (item.quantity > available) {
        const product = productById.get(item.productId);
        throw new AppError(
          `Insufficient stock for ${product.fruit_name} ${product.box_size}: ${available} box(es) available.`,
          409,
          [{ field: 'items', message: `Requested ${item.quantity}; only ${available} available.` }]
        );
      }
    }

    const pricedItems = items.map((item) => {
      const product = productById.get(item.productId);
      const unitPriceCents = Math.round(Number(product.selling_price) * 100);
      const subtotalCents = BigInt(unitPriceCents) * BigInt(item.quantity);
      if (subtotalCents > MAX_DECIMAL_CENTS) {
        throw new AppError('Order item total exceeds the supported amount.', 422, [
          { field: 'items', message: 'Reduce the quantity or choose a lower-priced product.' }
        ]);
      }
      return {
        ...item,
        unitPrice: amountFromCents(unitPriceCents),
        subtotal: amountFromCents(subtotalCents),
        subtotalCents,
        fruit_name: product.fruit_name,
        box_size: product.box_size
      };
    });
    const totalCents = pricedItems.reduce((total, item) => total + item.subtotalCents, 0n);
    if (totalCents > MAX_DECIMAL_CENTS) {
      throw new AppError('Order total exceeds the supported amount.', 422, [
        { field: 'items', message: 'Reduce the order total.' }
      ]);
    }
    const [result] = await connection.execute(
      `INSERT INTO orders (vendor_id, status, total_amount, created_by)
       VALUES (?, ?, ?, ?)`,
      [request.body.vendor_id, ORDER_STATUSES.PENDING, amountFromCents(totalCents), request.user.id]
    );

    for (const item of pricedItems) {
      await connection.execute(
        `INSERT INTO order_items
          (order_id, product_id, quantity_boxes, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [result.insertId, item.productId, item.quantity, item.unitPrice, item.subtotal]
      );
    }
    return await readOrder(connection, result.insertId);
  });
  response.status(201).json({ order });
}

async function validateStatusTransition(connection, order, nextStatus, userRole) {
  if (!ORDER_STATUS_VALUES.includes(nextStatus)) {
    throw new AppError('Order status is invalid.', 422, [
      { field: 'status', message: 'Choose a valid order status.' }
    ]);
  }
  if (order.status === ORDER_STATUSES.COMPLETED || order.status === ORDER_STATUSES.CANCELLED) {
    throw new AppError(`A ${order.status} order cannot change status.`, 409);
  }
  if (nextStatus === ORDER_STATUSES.CANCELLED) {
    if (userRole === ROLES.SALES && ![ORDER_STATUSES.PENDING, ORDER_STATUSES.CONFIRMED].includes(order.status)) {
      throw new AppError('Sales users may cancel only Pending or Confirmed orders.', 403);
    }
    return;
  }
  if (nextOrderStatus.get(order.status) !== nextStatus) {
    throw new AppError(`Order must move from ${order.status} to ${nextOrderStatus.get(order.status) ?? 'a terminal status'}.`, 409);
  }

  if (nextStatus === ORDER_STATUSES.COMPLETED) {
    const [items] = await connection.execute(
      `SELECT order_items.product_id, order_items.quantity_boxes,
              COALESCE(stock.quantity_available, 0) AS quantity_available
       FROM order_items
       LEFT JOIN stock ON stock.product_id = order_items.product_id
       WHERE order_items.order_id = ?
       ORDER BY order_items.product_id
       FOR UPDATE`,
      [order.id]
    );
    for (const item of items) {
      if (item.quantity_boxes > item.quantity_available) {
        throw new AppError('Insufficient stock to complete this order.', 409, [
          {
            field: 'status',
            message: `Product ${item.product_id} has ${item.quantity_available} box(es) available; ${item.quantity_boxes} required.`
          }
        ]);
      }
    }
    for (const item of items) {
      const [result] = await connection.execute(
        `UPDATE stock
         SET quantity_available = quantity_available - ?
         WHERE product_id = ? AND quantity_available >= ?`,
        [item.quantity_boxes, item.product_id, item.quantity_boxes]
      );
      if (result.affectedRows !== 1) {
        throw new AppError('Stock changed while completing the order. Try again.', 409);
      }
    }
  }
}

export async function updateOrderController(request, response) {
  const order = await withTransaction(async (connection) => {
    const [orders] = await connection.execute(
      'SELECT id, status FROM orders WHERE id = ? FOR UPDATE',
      [request.params.id]
    );
    if (orders.length === 0) {
      throw new AppError('Order not found.', 404);
    }
    await validateStatusTransition(connection, orders[0], request.body.status, request.user.role);
    await connection.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [request.body.status, request.params.id]
    );
    return await readOrder(connection, request.params.id);
  });
  response.status(200).json({ order });
}

export async function deleteOrderController(request, response) {
  await withTransaction(async (connection) => {
    const [orders] = await connection.execute(
      'SELECT id, status FROM orders WHERE id = ? FOR UPDATE',
      [request.params.id]
    );
    if (orders.length === 0) {
      throw new AppError('Order not found.', 404);
    }
    if (orders[0].status === ORDER_STATUSES.COMPLETED) {
      throw new AppError('Completed orders cannot be deleted.', 409);
    }
    await connection.execute('DELETE FROM orders WHERE id = ?', [request.params.id]);
  });
  response.status(200).json({ message: 'Order deleted.' });
}
