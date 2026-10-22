# Batloung Fruits Distribution Management System

The application manages fruit distribution from suppliers in South Africa to street vendors in Maseru. This repository contains the MySQL schema, a database-backed Express API with authentication and role-based authorization, and the initial React client shell.

## Stack

- MySQL with InnoDB and the `mysql2` promise connection pool
- Node.js and Express (ES modules)
- JWT authentication, bcrypt password hashing, and role-based authorization
- React and Vite (JavaScript)

## Prerequisites

- Node.js 20 or later and npm
- MySQL 8.0.16 or later (for enforced `CHECK` constraints)

## Setup

1. Create the schema and reference data from the repository root:

   ```sh
   mysql -u root -p < database/schema.sql
   mysql -u root -p batloung_fruits < database/seed.sql
   ```

2. Copy `server/.env.example` to `server/.env` and set the MySQL connection values, a long random `JWT_SECRET`, and the client origin. Never commit `.env`.

3. Install server dependencies:

   ```sh
   cd server
   npm install
   ```

4. Create the first Administrator, using environment variables or command-line options:

   ```sh
   $env:ADMIN_NAME = "Administrator Name"
   $env:ADMIN_EMAIL = "admin@example.com"
   $env:ADMIN_PASSWORD = "use-a-long-unique-password"
   npm run create-admin
   ```

   Alternatively, pass `--name`, `--email`, and `--password` to the script. The password must be at least 5 characters.

5. Start the API:

   ```sh
   npm start
   ```

   The server checks its MySQL connection before listening. API endpoints and permissions are documented in [`docs/api-reference.md`](docs/api-reference.md).

To create both the initial Administrator and Sales accounts from the seed environment variables, set `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_SALES_NAME`, `SEED_SALES_EMAIL`, and `SEED_SALES_PASSWORD` in `server/.env`, then run `npm run seed:users` from `server`. Existing email addresses are skipped, so the command can safely be run again.

6. Configure and start the client:

   ```powershell
   cd ..\client
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```

   The default client API URL is `http://127.0.0.1:3000/api`. The current client includes sign-in and the responsive, role-aware application shell; feature pages are added in later phases.

## Environment variables

See [`server/.env.example`](server/.env.example) for the full list. `DB_PASSWORD` may be empty for local MySQL configurations that do not use a password; all other database connection fields are required. The seed user fields are required when running `npm run seed:users`. The JWT secret, expiry, client origin, and server port are configurable.

## Roles and security

Reference roles are Administrator and Sales. Login returns an access token and a user object without the password hash. Protected requests use `Authorization: Bearer <token>`. The server resolves the active account and current role for authenticated requests, so deactivated users cannot continue using an old token. Role authorization middleware is available for subsequent API modules.

## Backend implementation decisions

- IDs are unsigned auto-incrementing integers; quantities use whole boxes and prices use two-decimal `DECIMAL` values.
- The schema creates and selects the `batloung_fruits` database. Run the seed once after creating the schema; it contains only the reference data allowed by the specification.
- Passwords must be at least 5 characters and are hashed with bcrypt.
- MySQL 8.0.16 or later is required so database `CHECK` constraints are enforced.
