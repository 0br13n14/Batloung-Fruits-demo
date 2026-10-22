import { AppError } from '../utils/AppError.js';

export function authorizeRoles(...allowedRoles) {
  return function authorizeUserRole(request, response, next) {
    if (!request.user) {
      next(new AppError('Authentication is required.', 401));
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      next(new AppError('You do not have permission to perform this action.', 403));
      return;
    }

    next();
  };
}
