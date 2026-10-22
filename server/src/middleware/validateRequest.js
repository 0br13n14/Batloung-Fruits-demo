import { validationResult } from 'express-validator';
import { AppError } from '../utils/AppError.js';

export function validateRequest(request, response, next) {
  const result = validationResult(request);
  if (result.isEmpty()) {
    next();
    return;
  }

  next(new AppError('Request validation failed.', 422, result.array().map((error) => ({
    field: error.path,
    message: error.msg
  }))));
}
