# Batloung Fruits Distribution Management System

A role-aware fruit distribution management application for suppliers, stock, street vendors and orders in Maseru. It includes a MySQL database, an authenticated Express API, and a React client.

## Stack and prerequisites

- Node.js 20 or later and npm
- MySQL 8.0.16 or later
- MySQL with InnoDB, `mysql2`, Express, JWT and bcrypt
- React, Vite, React Router, Recharts, Leaflet and `react-leaflet`

## Setup

1. Create the database and load the reference data from the repository root:

   ```powershell
Get-Content -Raw .\database\schema.sql | mysql -u root -p
Get-Content -Raw .\database\seed.sql | mysql -u root -p batloung_fruits
   ```

2. Configure the API. Copy `server/.env.example` to `server/.env` and set:

   | Variable | Purpose |
   | --- | --- |
   | `NODE_ENV` | Runtime environment; defaults to `development`. |
   | `PORT` | API listening port; defaults to `3000`. |
   | `CLIENT_ORIGIN` | Browser origin allowed by CORS, normally `http://localhost:5173`. |
   | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection settings. `DB_PORT` defaults to `3306`; an empty database password is supported. |
   | `DB_CONNECTION_LIMIT` | Maximum MySQL pool connections; defaults to `10`. |
   | `JWT_SECRET` | A unique random secret of at least 32 characters. |
   | `JWT_EXPIRES_IN` | JWT lifetime, for example `8h`. |
   | `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Optional Administrator seed account inputs used by `npm run seed:users`. |
   | `SEED_SALES_NAME`, `SEED_SALES_EMAIL`, `SEED_SALES_PASSWORD` | Optional Sales seed account inputs used by `npm run seed:users`. |

   Keep `.env` files private and do not commit them. The API validates required database, CORS and JWT settings at startup.

3. In `server`, install dependencies and create the first Administrator. Provide the `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` values as shown, or use the corresponding `--name`, `--email`, and `--password` command-line options:

   ```powershell
   cd server
   npm install
   $env:ADMIN_NAME = "Administrator Name"
   $env:ADMIN_EMAIL = "admin@example.com"
   $env:ADMIN_PASSWORD = "a-unique-password"
   npm run create-admin
   ```

   Start the API in the same terminal after the account is created:

   ```powershell
   npm start
   ```

   The API base URL is `http://127.0.0.1:3000/api`. To provision both seeded roles instead, set the six `SEED_*` variables in `server/.env` and run `npm run seed:users`.

4. In a second terminal, configure and start the client on port `5173`:

   ```powershell
   cd client
   Copy-Item .env.example .env
   npm install
   npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
   ```

   `VITE_API_URL` in `client/.env` selects the API base URL and defaults to `http://127.0.0.1:3000/api`. Vite normally serves the app at `http://localhost:5173`.

## Roles and permissions

| Capability | Administrator | Sales |
| --- | --- | --- |
| Dashboard | All summary cards, sales and status charts, recent orders | Permitted operational summaries and recent orders; no sales summary value or charts |
| Fruits and products | View, create, edit and deactivate | View |
| Suppliers, purchases and stock adjustments | Manage | Not permitted |
| Available stock | View and manage | View |
| Street vendors | Manage, edit and deactivate | Register and view |
| Orders | Create, view, update and delete subject to status rules | Create and view; advance orders along the permitted flow or cancel Pending/Confirmed orders |
| Reports | View, print and export | Not permitted |

The server enforces permissions on every protected route; hiding navigation and actions in the client is not the security boundary. Order status changes and stock effects are validated by the API. See [the API reference](docs/api-reference.md) for endpoint details.

## Vendor map picker

The vendor form requires an area name and offers an optional **Select on map** action. The picker opens a Leaflet map centred on Maseru with OpenStreetMap tiles. Users can search Lesotho locations using the Nominatim service, choose a result, click the map, or drag the marker. Reverse geocoding suggests an editable area name. Confirming saves the selected area and coordinates with the vendor; canceling or declining to choose a point leaves coordinates optional. If geocoding is unavailable, users can still select a point or enter the area name themselves. Internet access is needed for map tiles and Nominatim.

## Development checks

Run the client lint and production build from `client`:

```powershell
cd client
npm run lint
npm run build
```

## Environment variables

The server variables are documented in `server/.env.example`: `NODE_ENV`, `PORT`, `CLIENT_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_CONNECTION_LIMIT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_SALES_NAME`, `SEED_SALES_EMAIL`, and `SEED_SALES_PASSWORD`. `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are optional process variables for `npm run create-admin` when not using its command-line options. The client variable in `client/.env.example` is `VITE_API_URL`.

## Project documentation

- [Entity relationship diagram](docs/erd.md)
- [Architecture](docs/architecture.md)
- [Use cases](docs/use-cases.md)
- [API reference](docs/api-reference.md)
