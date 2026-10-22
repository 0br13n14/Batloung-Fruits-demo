import { body, query } from 'express-validator';
import { MAX_UNSIGNED_INT } from '../constants.js';

const provinceIdList = body('source_province_ids')
  .optional()
  .isArray().withMessage('Source province IDs must be an array.')
  .bail()
  .custom((ids) => ids.every((id) => Number.isInteger(Number(id)) && Number(id) > 0 && Number(id) <= MAX_UNSIGNED_INT))
  .withMessage('Every source province ID must be a valid positive integer.');

export const listFruitValidators = [
  query('search').optional().isString().trim()
];

export const fruitBodyValidators = [
  body('name').isString().withMessage('Name is required.')
    .bail().trim().notEmpty().withMessage('Name is required.')
    .isLength({ max: 80 }).withMessage('Name must be 80 characters or fewer.'),
  body('description').optional({ nullable: true }).isString(),
  body('is_active').optional().isBoolean().toBoolean(),
  provinceIdList
];
