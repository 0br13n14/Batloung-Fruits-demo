import { body, query } from 'express-validator';
import { MAX_UNSIGNED_INT } from '../constants.js';

export const listSupplierValidators = [
  query('search').optional().isString().trim(),
  query('province').optional().isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Province must be a valid positive integer.')
];

export const supplierBodyValidators = [
  body('name').isString().withMessage('Name is required.')
    .bail().trim().notEmpty().withMessage('Name is required.')
    .isLength({ max: 150 }).withMessage('Name must be 150 characters or fewer.'),
  body('province_id').isInt({ min: 1, max: MAX_UNSIGNED_INT }).withMessage('Province is required and must be a valid positive integer.'),
  body('contact_person').optional({ nullable: true }).isString().isLength({ max: 150 }),
  body('telephone').optional({ nullable: true }).isString().isLength({ max: 40 }),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Enter a valid email address.')
    .isLength({ max: 254 }),
  body('physical_address').optional({ nullable: true }).isString().isLength({ max: 255 })
];
