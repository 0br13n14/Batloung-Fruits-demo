import { body, query } from 'express-validator';
import { MAX_UNSIGNED_INT, ORDER_STATUS_VALUES } from '../constants.js';

export const listOrderValidators = [
  query('search').optional().isString().trim().isLength({ max: 100 })
    .withMessage('Search must be 100 characters or fewer.'),
  query('status').optional().isIn(ORDER_STATUS_VALUES)
    .withMessage('Status is invalid.'),
  query('vendor').optional().isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Vendor must be a valid positive integer.'),
  query('from').optional().isISO8601().withMessage('from must be a valid date.'),
  query('to').optional().isISO8601().withMessage('to must be a valid date.')
];

export const createOrderValidators = [
  body('vendor_id').isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Vendor is required and must be a valid positive integer.'),
  body('items').isArray({ min: 1 }).withMessage('An order must contain at least one item.'),
  body('items.*.product_id').isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Product ID must be a valid positive integer.'),
  body('items.*.quantity_boxes').isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Quantity must be a valid positive integer.'),
  body('items').custom((items) => {
    if (!Array.isArray(items)) {
      return true;
    }
    if (items.some((item) => !item || typeof item !== 'object')) {
      return false;
    }
    const ids = items.map((item) => String(item.product_id));
    return new Set(ids).size === ids.length;
  }).withMessage('An order can contain each product only once.')
];

export const updateOrderValidators = [
  body('status').isString().notEmpty().withMessage('Status is required.')
];
