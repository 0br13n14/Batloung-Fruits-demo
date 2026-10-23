import { body, query } from 'express-validator';
import { MAX_DECIMAL_VALUE, MAX_UNSIGNED_INT } from '../constants.js';

export const listProductValidators = [
  query('search').optional().isString().trim(),
  query('fruit').optional().isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Fruit must be a valid positive integer.'),
  query('boxSize').optional().isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Box size must be a valid positive integer.'),
  query('status').optional().isIn(['Active', 'Inactive'])
    .withMessage('Status must be Active or Inactive.')
];

export const productBodyValidators = [
  body('fruit_id').isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Fruit is required and must be a valid positive integer.'),
  body('box_size_id').isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Box size is required and must be a valid positive integer.'),
  body('quantity_per_box').isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Quantity per box must be a valid positive integer.'),
  body('selling_price').isFloat({ gt: 0, max: MAX_DECIMAL_VALUE })
    .withMessage('Selling price must be greater than zero and fit the supported price range.'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean.').bail().toBoolean()
];
