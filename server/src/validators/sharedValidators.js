import { param } from 'express-validator';
import { MAX_UNSIGNED_INT } from '../constants.js';

export const idParamValidator = [
  param('id').isInt({ min: 1, max: MAX_UNSIGNED_INT })
    .withMessage('ID must be a valid positive integer.')
];
