import 'dotenv/config';
import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';
import { MIN_PASSWORD_LENGTH } from '../src/constants.js';

const usersToSeed = [
  {
    role: 'Administrator',
    nameVariable: 'SEED_ADMIN_NAME',
    emailVariable: 'SEED_ADMIN_EMAIL',
    passwordVariable: 'SEED_ADMIN_PASSWORD'
  },
  {
    role: 'Sales',
    nameVariable: 'SEED_SALES_NAME',
    emailVariable: 'SEED_SALES_EMAIL',
    passwordVariable: 'SEED_SALES_PASSWORD'
  }
];

function readSeedUsers() {
  const users = usersToSeed.map(({ role, nameVariable, emailVariable, passwordVariable }) => {
    const fullName = process.env[nameVariable]?.trim();
    const email = process.env[emailVariable]?.trim().toLowerCase();
    const password = process.env[passwordVariable];
    const missingVariables = [
      [nameVariable, fullName],
      [emailVariable, email],
      [passwordVariable, password]
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);


    // Validate required environment variables
    if (missingVariables.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}.`);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`${emailVariable} must contain a valid email address.`);
    }


    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`${passwordVariable} must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    }

    return { role, fullName, email, password };
  });

  if (users[0].email === users[1].email) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_SALES_EMAIL must be different.');
  }

  return users;
}

// The seedUsers function is responsible for seeding the database with users defined in the .env file. It reads the user data, checks for existing users, and inserts new users into the database.
async function seedUsers() {
  const users = readSeedUsers();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [roles] = await connection.execute(
      'SELECT id, name FROM roles WHERE name IN (?, ?)',
      ['Administrator', 'Sales']
    );
    const roleIds = new Map(roles.map((role) => [role.name, role.id]));

    for (const user of users) {
      if (!roleIds.has(user.role)) {
        throw new Error(`${user.role} role is missing. Run database/seed.sql first.`);
      }
    }

    const [existingUsers] = await connection.execute(
      'SELECT email FROM users WHERE email IN (?, ?)',
      users.map((user) => user.email)
    );
    const existingEmails = new Set(existingUsers.map((user) => user.email.toLowerCase()));
    const results = [];

    for (const user of users) {
      if (existingEmails.has(user.email)) {
        results.push(`Skipped ${user.role}: a user with that email already exists.`);
        continue;
      }

      const passwordHash = await bcrypt.hash(user.password, 12);
      await connection.execute(
        `INSERT INTO users (full_name, email, password_hash, role_id)
         VALUES (?, ?, ?, ?)`,
        [user.fullName, user.email, passwordHash, roleIds.get(user.role)]
      );
      results.push(`Created ${user.role} user.`);
    }
    
    await connection.commit();
    for (const result of results) {
      process.stdout.write(`${result}\n`);
    }
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Run the seedUsers function if this script is executed directly
seedUsers()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
