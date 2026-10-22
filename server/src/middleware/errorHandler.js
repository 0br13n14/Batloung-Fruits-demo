import { AppError } from '../utils/AppError.js';

export function notFoundHandler(request, response, next) {
  next(new AppError(`Route not found: ${request.method} ${request.originalUrl}`, 404));
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error.type === 'entity.parse.failed') {
    response.status(400).json({
      error: {
        message: 'Request body contains invalid JSON.',
        fields: []
      }
    });
    return;
  }

  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = statusCode === 500 ? 'An unexpected server error occurred.' : error.message;

  if (statusCode >= 500) {
    console.error(error);
  }

  response.status(statusCode).json({
    error: {
      message,
      fields: error instanceof AppError ? error.details ?? [] : []
    }
  });
}
