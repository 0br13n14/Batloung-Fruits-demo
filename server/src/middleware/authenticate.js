import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

export const authenticate = asyncHandler(async (request, response, next) => {
  const [scheme, token] = (request.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Authentication is required.', 401);
  }

  let claims;
  try {
    claims = jwt.verify(token, env.jwt.secret);
  } catch {
    throw new AppError('The access token is invalid or expired.', 401);
  }

  if (typeof claims === 'string' || !claims.sub) {
    throw new AppError('The access token is invalid or expired.', 401);
  }

  const [users] = await pool.execute(
    `SELECT users.id, users.full_name, users.email, roles.name AS role
     FROM users
     INNER JOIN roles ON roles.id = users.role_id
     WHERE users.id = ? AND users.is_active = TRUE`,
    [claims.sub]
  );

  if (users.length === 0) {
    throw new AppError('The user account is inactive or no longer exists.', 401);
  }

  const user = users[0];
  request.user = {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role
  };

  next();
});
