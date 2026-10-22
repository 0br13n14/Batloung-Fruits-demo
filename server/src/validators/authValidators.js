import { body } from 'express-validator';
import { MIN_PASSWORD_LENGTH } from '../constants.js';

export const loginValidators = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .bail()
    .isEmail().withMessage('Enter a valid email address.'),
  body('password')
    .isString().withMessage('Password is required.')
    .bail()
    .isLength({ min: MIN_PASSWORD_LENGTH })
    .withMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`)
];
