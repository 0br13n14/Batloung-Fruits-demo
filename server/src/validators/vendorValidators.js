import { body, query } from 'express-validator';
import { VENDOR_STATUSES } from '../constants.js';

export const listVendorValidators = [
  query('search').optional().isString().trim(),
  query('status').optional().isIn(Object.values(VENDOR_STATUSES))
    .withMessage('Status must be Active or Inactive.')
];

export const vendorBodyValidators = [
  body('vendor_name').isString().withMessage('Vendor name is required.')
    .bail().trim().notEmpty().withMessage('Vendor name is required.')
    .isLength({ max: 150 }),
  body('business_name').optional({ nullable: true }).isString().isLength({ max: 150 }),
  body('telephone').isString().withMessage('Telephone is required.')
    .bail().trim().notEmpty().withMessage('Telephone is required.')
    .isLength({ max: 40 }),
  body('location_area').isString().withMessage('Location area is required.')
    .bail().trim().notEmpty().withMessage('Location area is required.')
    .isLength({ max: 255 }),
  body('latitude').optional({ nullable: true }).isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90.'),
  body('longitude').optional({ nullable: true }).isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180.'),
  body('registration_date').isISO8601().withMessage('Registration date must be a valid date.'),
  body('status').optional().isIn(Object.values(VENDOR_STATUSES))
    .withMessage('Status must be Active or Inactive.')
];
