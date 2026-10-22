import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export async function login(email, password) {
  const [users] = await pool.execute(
    `SELECT users.id, users.full_name, users.email, users.password_hash, roles.name AS role
     FROM users
     INNER JOIN roles ON roles.id = users.role_id
     WHERE users.email = ? AND users.is_active = TRUE`,
    [email]
  );

  const user = users[0];
  const passwordMatches = user
    ? await bcrypt.compare(password, user.password_hash)
    : false;

  if (!user || !passwordMatches) {
    throw new AppError('Email or password is incorrect.', 401);
  }

  const accessToken = jwt.sign(
    { sub: String(user.id) },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );

  return {
    accessToken,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role
    }
  };
}

export function getCurrentUser(user) {
  return user;
}
