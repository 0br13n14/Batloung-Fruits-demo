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
   mysql -u root -p < database/schema.sql
   mysql -u root -p batloung_fruits < database/seed.sql
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
   | `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Optional Administrator seed account inputs. |
   | `SEED_SALES_NAME`, `SEED_SALES_EMAIL`, `SEED_SALES_PASSWORD` | Optional Sales seed account inputs. |

   Keep `.env` files private and do not commit them. The API validates required database, CORS and JWT settings at startup.

3. Install dependencies, create the first Administrator, and start the API on port `3000`:

   ```powershell
   cd server
   npm install
   $env:ADMIN_NAME = "Administrator Name"
   $env:ADMIN_EMAIL = "admin@example.com"
   $env:ADMIN_PASSWORD = "a-unique-password"
   npm run create-admin
   npm start
   ```

   The API base URL is `http://127.0.0.1:3000/api`. The create-admin command also accepts `--name`, `--email` and `--password` options. To provision both seeded roles instead, set the six `SEED_*` variables in `server/.env` and run `npm run seed:users`.

4. In a second terminal, configure and start the client on port `5173`:

   ```powershell
   cd client
   Copy-Item .env.example .env
   npm install
   npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
   ```

   `VITE_API_URL` selects the API base URL and defaults to `http://127.0.0.1:3000/api`. Vite normally serves the app at `http://localhost:5173`.

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

## Development and tests

Run client checks from `client`:

```powershell
npm run lint
npm run build
```

Run API tests from `server`:

```powershell
npm test
```

The optional `server/tests/apiFlow.ps1` exercises a live API and requires Administrator and Sales credentials in `API_ADMIN_EMAIL`, `API_ADMIN_PASSWORD`, `API_SALES_EMAIL` and `API_SALES_PASSWORD`. It creates test records and leaves them in the database; use a disposable test database or manually remove the generated records after the run.

## Project documentation

- [Entity relationship diagram](docs/erd.md)
- [Architecture](docs/architecture.md)
- [Use cases](docs/use-cases.md)
- [API reference](docs/api-reference.md)
