import 'dotenv/config';
import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';
import { MIN_PASSWORD_LENGTH } from '../src/constants.js';
import { AppError } from '../src/utils/AppError.js';

function readArguments(argumentsList) {
  const options = {};
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (!argument.startsWith('--')) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const name = argument.slice(2);
    const value = argumentsList[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${name}.`);
    }

    options[name] = value;
    index += 1;
  }

  return options;
}

async function createAdmin() {
  const argumentsMap = readArguments(process.argv.slice(2));
  const fullName = argumentsMap.name ?? process.env.ADMIN_NAME;
  const email = argumentsMap.email ?? process.env.ADMIN_EMAIL;
  const password = argumentsMap.password ?? process.env.ADMIN_PASSWORD;

  if (!fullName?.trim() || !email?.trim() || !password) {
    throw new Error(
      'Provide ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD, or pass --name, --email and --password.'
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Provide a valid administrator email address.');
  }
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Administrator password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }

  const [existingUsers] = await pool.execute(
    'SELECT id FROM users WHERE email = ?',
    [email.trim().toLowerCase()]
  );
  if (existingUsers.length > 0) {
    throw new AppError('An account with that email already exists.', 409);
  }

  const [roles] = await pool.execute(
    'SELECT id FROM roles WHERE name = ?',
    ['Administrator']
  );
  if (roles.length === 0) {
    throw new Error('Administrator role is missing. Run database/seed.sql first.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute(
    `INSERT INTO users (full_name, email, password_hash, role_id)
     VALUES (?, ?, ?, ?)`,
    [fullName.trim(), email.trim().toLowerCase(), passwordHash, roles[0].id]
  );

  process.stdout.write(`Administrator account created with user ID ${result.insertId}.\n`);
}

createAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
