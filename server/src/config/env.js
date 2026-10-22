import 'dotenv/config';

function requiredValue(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function positiveInteger(name, defaultValue) {
  const value = Number(process.env[name] ?? defaultValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: positiveInteger('PORT', 3000),
  clientOrigin: requiredValue('CLIENT_ORIGIN'),
  database: Object.freeze({
    host: requiredValue('DB_HOST'),
    port: positiveInteger('DB_PORT', 3306),
    user: requiredValue('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    name: requiredValue('DB_NAME'),
    connectionLimit: positiveInteger('DB_CONNECTION_LIMIT', 10)
  }),
  jwt: Object.freeze({
    secret: requiredValue('JWT_SECRET'),
    expiresIn: requiredValue('JWT_EXPIRES_IN')
  })
});

if (env.jwt.secret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long.');
}
