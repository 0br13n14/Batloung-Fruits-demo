import { body, query } from 'express-validator';
import { MAX_DECIMAL_VALUE, MAX_UNSIGNED_INT } from '../constants.js';

export const listStockValidators = [
  query('search').optional().isString().trim(),
  query('fruit').optional().isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Fruit must be a valid positive integer.'),
  query('boxSize').optional().isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Box size must be a valid positive integer.')
];

export const purchaseBodyValidators = [
  body('supplier_id').isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Supplier is required and must be a valid positive integer.'),
  body('product_id').isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Product is required and must be a valid positive integer.'),
  body('quantity_boxes').isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Quantity must be a valid positive integer.'),
  body('unit_cost').isFloat({ min: 0, max: MAX_DECIMAL_VALUE }).withMessage('Unit cost must fit the supported cost range.'),
  body('purchase_date').optional().isISO8601().withMessage('Purchase date must be a valid date.')
];

export const stockUpdateValidators = [
  body('quantity_available').isInt({ min: 0, max: MAX_UNSIGNED_INT })
    .withMessage('Available quantity must be a valid non-negative integer.')
];
