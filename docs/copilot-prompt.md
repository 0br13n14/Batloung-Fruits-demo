# Copilot Prompt: Batloung Fruits Distribution Management System

Paste everything below the line into GitHub Copilot Chat in **Agent mode** (VS Code). If Copilot runs out of room, paste Part 1 first, then send the phase prompts at the bottom one at a time.

---

You are a senior full-stack developer. Build a complete, working, database-driven web application called **Batloung Fruits Distribution Management System**. Work inside the currently open empty folder. Do not ask me questions; where something is unspecified, make the simplest sensible decision and note it in the README.

## 1. Business context

Batloung Fruits buys fruit from suppliers in South Africa's nine provinces (Eastern Cape, Free State, Gauteng, KwaZulu-Natal, Limpopo, Mpumalanga, Northern Cape, North West, Western Cape) and sells it in boxes to street vendors in Maseru, Lesotho.

Fruits sold: Apples, Bananas, Oranges, Mangoes, Grapes. Only these five may initially be sold.

Source provinces per fruit:

| Fruit   | Source provinces                         |
|---------|------------------------------------------|
| Apples  | Western Cape, Free State, Mpumalanga     |
| Bananas | Limpopo, KwaZulu-Natal, Mpumalanga       |
| Oranges | Limpopo, Mpumalanga, Eastern Cape        |
| Mangoes | Limpopo, Mpumalanga, KwaZulu-Natal       |
| Grapes  | Western Cape, Northern Cape, Limpopo     |

Box sizes: Small, Medium, Large. A saleable **product** is a unique combination of Fruit + Box Size (for example Apples + Small). Quantity per box and selling price differ per product.

Problems the system must solve: tracking stock; knowing which supplier supplied which fruit; monitoring purchases by province; recording vendor orders; distinguishing box sizes; calculating order totals; finding the best-selling fruits; monitoring outstanding orders; generating sales reports; avoiding inaccurate or duplicated manual records.

## 2. Tech stack (mandatory)

- **Frontend:** React with plain JavaScript (no TypeScript). Create the project with the latest Vite: run `npm create vite@latest client -- --template react` (this uses vite@latest), then `npm install`.
- **Backend:** Node.js + Express.js REST API, in a `server` folder, with `npm init -y`, using ES modules.
- **Database:** MySQL, accessed through the `mysql2` package (promise API, connection pool). No ORM.
- **Auth:** JWT + bcrypt.
- Folder layout: a root with `client/`, `server/`, `database/` (schema.sql and seed.sql), `docs/`, `README.md`, `.gitignore`.

## 3. Hard rules about data

- **No hardcoded vendors, suppliers, orders, stock, users in the frontend or backend code.** Every list, table, dashboard number, dropdown and chart must come from the API, which reads from MySQL. Empty database means empty tables with a clear empty-state message.
- `database/seed.sql` may only contain reference data the brief itself defines: the 9 provinces, the 5 fruits, the 3 box sizes, the fruit-to-source-province mapping, and the two roles. No sample vendors, suppliers, products' stock or orders.
- The first administrator account is created by a script `server/scripts/createAdmin.js` that reads the email, name and password from environment variables or command-line arguments. Never commit credentials.
- Products (fruit + box size + price + quantity per box) are created by the admin through the UI, not seeded.

## 4. Database (MySQL)

Provide `database/schema.sql` and `database/seed.sql`. Use InnoDB, utf8mb4, snake_case names, primary keys, foreign keys with sensible ON DELETE rules, NOT NULL where required, UNIQUE and CHECK constraints.

Tables:

- `roles` (id, name: Administrator or Sales)
- `users` (id, full_name, email unique, password_hash, role_id FK, is_active, created_at)
- `provinces` (id, name unique): the 9 provinces
- `fruits` (id, name unique, description, is_active)
- `fruit_source_provinces` (fruit_id FK, province_id FK, composite PK)
- `box_sizes` (id, name unique: Small, Medium, Large)
- `products` (id, fruit_id FK, box_size_id FK, quantity_per_box, selling_price, is_active; UNIQUE(fruit_id, box_size_id); CHECK selling_price > 0)
- `suppliers` (id, name, province_id FK, contact_person, telephone, email, physical_address, created_at)
- `purchases` (id, supplier_id FK, product_id FK, quantity_boxes, unit_cost, purchase_date, created_by FK users): records incoming stock; CHECK quantity_boxes > 0
- `stock` (id, product_id FK UNIQUE, quantity_available; CHECK >= 0)
- `street_vendors` (id, vendor_name, business_name, telephone, location_area, latitude DECIMAL(10,7), longitude DECIMAL(10,7), registration_date, status ENUM('Active','Inactive'))
- `orders` (id, vendor_id FK, order_date, status ENUM('Pending','Confirmed','Processing','Ready for Collection/Delivery','Completed','Cancelled'), total_amount, created_by FK users)
- `order_items` (id, order_id FK, product_id FK, quantity_boxes, unit_price, subtotal; CHECK quantity_boxes > 0). `unit_price` is a snapshot of the product price at order time.

Relationships to show in the ERD: Supplier → Purchases/Stock; Fruit → Products; Box Size → Products; Street Vendor → Orders; Orders → Order Items; Products → Order Items.

## 5. Business rules (enforce on the server, inside SQL transactions where more than one table changes)

1. Only the five specified fruits may be sold initially.
2. Every product has a box size (Small, Medium or Large) and a selling price greater than zero.
3. An order belongs to a registered, Active street vendor and contains at least one order item.
4. Ordered quantity must be greater than zero.
5. A vendor cannot order more boxes than are in stock (check at order creation, and check again when the order is marked Completed).
6. Stock is reduced only when an order becomes **Completed**. Cancelled orders never reduce stock.
7. Recording a purchase automatically increases the product's stock (create the stock row if missing).
8. A purchase must use a supplier whose province is one of the fruit's allowed source provinces; reject otherwise with a clear message.
9. Unit price, subtotal and order total are calculated **on the server only**, from the product price, and always rounded the same way. Never trust totals sent by the client.
10. Reject invalid or missing required fields with 400/422 and a field-level error list.
11. Block deleting records that other records depend on (return 409 with a clear message); offer deactivation for fruits, products, vendors and users instead.
12. Allowed status flow: Pending → Confirmed → Processing → Ready for Collection/Delivery → Completed. Cancelled is allowed from any status before Completed. A Completed or Cancelled order cannot change status again.

## 6. Backend API

Use Express Router, controller/service/repository separation kept simple (routes → controllers → services → db queries), centralised error-handling middleware, correct HTTP status codes (200, 201, 400, 401, 403, 404, 409, 422, 500), request validation with `express-validator`, parameterised queries only, `helmet`, `cors` restricted to the client origin, rate limiting on login, environment variables via `dotenv` with a committed `.env.example`.

Endpoints (exactly these, plus the extras below):

- `GET/POST /api/fruits`, `GET/PUT/DELETE /api/fruits/:id`
- `GET/POST /api/suppliers`, `GET/PUT/DELETE /api/suppliers/:id`
- `GET/POST /api/vendors`, `GET/PUT/DELETE /api/vendors/:id`
- `GET/POST /api/stock`, `PUT /api/stock/:id`
- `GET/POST /api/orders`, `GET/PUT/DELETE /api/orders/:id`

Extras:

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/provinces`, `GET /api/box-sizes`, `GET/POST/PUT /api/products` (products are a fruit + box size + price)
- `GET /api/dashboard` (all dashboard figures in one call)
- `GET /api/reports/:reportName` for: available-stock, sales-by-fruit, sales-by-box-size, sales-by-vendor, purchases-by-province, pending-orders, completed-orders, total-sales-by-date (the date report accepts `from` and `to` query params)
- List endpoints support `search` and filter query params (supplier `province`, product `fruit` and `boxSize`, order `status`, `vendor`, `from`, `to`) and are computed in SQL, not in the browser.

## 7. Roles and security (RBAC)

- **Administrator:** manage suppliers, fruits, box sizes, products, stock/purchases, street vendors (including edit and deactivate), orders; view reports; manage users.
- **Sales:** view products, register street vendors, create orders, view orders, update order status (forward along the allowed flow, or cancel a Pending/Confirmed order). Sales cannot delete anything, cannot edit suppliers/fruits/stock, and cannot view reports.
- Enforce with an `authenticate` middleware (JWT) and an `authorizeRoles(...)` middleware on every route. The frontend also hides navigation and buttons the role cannot use, but the backend is the real gate.
- Hash passwords with bcrypt. Never return `password_hash`. JWT secret and expiry from environment variables.

## 8. Frontend

Plain JavaScript React. Use `react-router-dom` for routing and the browser `fetch` API through one small `services/api.js` wrapper that adds the token and handles errors. Use plain CSS with CSS variables (one `styles/` folder: variables, base, layout, components), no UI framework and no Tailwind.

**Layout:** a fixed **side panel navigation** (dark green background, white text) with the app name at the top, links for Dashboard, Orders, Street Vendors, Fruits, Box Sizes and Products, Stock, Suppliers, Reports (Admin only) and a logout control at the bottom showing the user's name and role. A top bar shows the current page title. On small screens the side panel collapses behind a menu button.

**Pages:** Login, Dashboard, Orders, Street Vendors, Fruits, Box Sizes and Products, Stock (record incoming stock + view available stock), Suppliers, Reports.

**Dashboard:** summary cards for total fruits, total suppliers, total registered vendors, available stock (boxes), total orders, pending orders, completed orders, sales value; a bar chart of sales by fruit; a chart of orders by status; a table of the most recent orders. Use `recharts` with the green palette.

**Modals for actions:** every add and edit form opens in a modal. Deleting or deactivating opens a confirmation modal. Viewing an order opens a detail modal with its items. Build one reusable `Modal` component (focus trap, closes on Escape and on the close button, scroll locked behind it) and one reusable `ConfirmModal`.

**Order creation modal:** pick a registered vendor (searchable select loaded from the API), add one or more rows of fruit + box size + number of boxes, show available stock and unit price per row, show subtotals and the running total (display only; the server recalculates), prevent quantities above available stock, and show server validation errors next to the fields.

**Tables:** every table has search, relevant filters (supplier province; fruit, box size; order status; vendor), loading, empty and error states. Filtering happens through the API.

**Forms:** client-side validation (required fields, email format, phone format, positive numbers) with inline error messages under each field, plus display of server-side errors.

### 8.1 Vendor location picker with a map (important)

In the vendor registration and edit modal, the **Location / area in Maseru** field must work like this:

1. Next to the field there is a button **"Select on map"**. Clicking it opens a second modal containing an interactive map.
2. Use **Leaflet with `react-leaflet` and OpenStreetMap tiles** (free, no API key). Install `leaflet` and `react-leaflet`, import `leaflet/dist/leaflet.css`, and fix the default marker icon paths for Vite by importing the marker images explicitly.
3. The map opens centred on Maseru, Lesotho (latitude -29.3167, longitude 27.4833) at a city-level zoom.
4. The user can search for a place or street by typing into a search box above the map. Use the Nominatim API (`https://nominatim.openstreetmap.org/search`) restricted to Lesotho (`countrycodes=ls`), debounced to avoid more than one request per second, with the required identifying request headers/parameters, and show the results in a list the user can click.
5. The user can also click anywhere on the map, or drag the marker, to set the position.
6. After a position is chosen, call Nominatim reverse geocoding to suggest a readable area or address name, and let the user edit that text.
7. Show the chosen latitude and longitude on screen, with "Confirm location" and "Cancel" buttons. Confirming closes the map modal and fills the form's location text, latitude and longitude.
8. Save `location_area`, `latitude` and `longitude` to MySQL. When editing a vendor, the map opens at the saved coordinates with the marker in place. On the vendor list and detail views, show the area name and offer a "View on map" action that opens the same map modal in read-only mode.
9. Handle failure states: geocoding service unavailable, no search results, and a user who declines to pick a location (latitude and longitude are optional, but the area name is required). Never block the form because of a map error.

### 8.2 Visual design and UX (strict)

- **Primary colour: green.** Use a CSS variable palette: dark green for the side panel, a mid green for primary buttons and active states, a pale green tint for selected rows and table headers, white page cards on a very light grey background, dark grey text. Use red only for destructive actions and errors, amber and green for status badges.
- **No hover effects of any kind** (no hover colour changes, no transforms, no shadows on hover, no underline-on-hover). Keep clear keyboard `:focus-visible` outlines for accessibility, and a visible `:active` pressed state is allowed.
- **No gradients**, no glassmorphism or blur, no glow or box-shadow decoration, no multicolour side tabs, no purple or blue accent colours.
- **No emojis anywhere**, including headings, buttons and empty states. No decorative icon library. Use clear text labels; where an icon is genuinely needed (close, menu), use a simple hand-written inline SVG.
- **Do not use the Inter font.** Use a system font stack or "Source Sans 3" / "IBM Plex Sans" loaded locally or from Google Fonts. Set a clear type scale: page title 24px semibold, section heading 18px, body 15px regular (400 or 500 weight, never thin), table text 14px, line-height around 1.5.
- Corner radius: 4px on buttons, inputs, cards and modals. Nothing fully rounded except status badges if needed.
- Use an 8px spacing scale consistently (8, 16, 24, 32). Align forms in a clean one- or two-column grid with labels above inputs.
- No status dots on non-data elements. Status badges are plain text pills ("Pending", "Completed") with a colour and a border.
- No hero images, no stock photos, no marketing slogans. Microcopy must be plain and specific: "Add supplier", "Record incoming stock", "No orders found."
- Every button and link must do something real. Do not create placeholder buttons or dead routes.
- Tables: sticky header, right-aligned numbers, currency formatted as Maluti (M) with two decimals, dates formatted consistently.
- Responsive: usable at 360px width; tables scroll horizontally inside a container on small screens; modals become near full-screen on phones.
- Accessibility: labelled inputs, aria attributes on modals, sufficient contrast, logical tab order.

## 9. Code quality rules (strict)

- Meaningful names (`getAvailableStockByProduct`, not `getData`), consistent 2-space indentation, one purpose per function, short functions, no deeply nested logic.
- DRY: reuse components (`Modal`, `ConfirmModal`, `DataTable`, `SearchFilterBar`, `FormField`, `StatusBadge`, `MapPicker`) and shared helpers (`formatCurrency`, `formatDate`, query-building helpers, `asyncHandler`). No copy-pasted CRUD pages; use shared hooks such as `useFetch` and `useCrudResource` where it reduces repetition without over-abstracting.
- Comments only where they explain **why** (for example why stock is reduced on completion), never what the line does.
- No dead code, no unused imports, no commented-out code, no `console.log` left in, no TODO placeholders, no magic strings (put order statuses and roles in constants shared by name on both sides).
- Frontend structure: `src/components`, `src/pages`, `src/services`, `src/hooks`, `src/context` (auth), `src/utils`, `src/styles`, `src/constants`.
- Backend structure: `src/config`, `src/routes`, `src/controllers`, `src/services`, `src/middleware`, `src/validators`, `src/utils`, `scripts`.

## 10. Documentation and GitHub

- `README.md`: project description, stack, prerequisites, step-by-step setup (create MySQL database, run `schema.sql` and `seed.sql`, copy `.env.example` to `.env`, create the first admin with the script, start server and client), environment variables, role permissions, and how the map picker works.
- `docs/`: an ERD as a Mermaid diagram (`erd.md`), a system architecture diagram (React → Express → MySQL), a use-case diagram for Administrator and Sales, and an API reference table of every endpoint with method, path, role and a sample request and response.
- `.gitignore` covering `node_modules`, `.env`, build output. Make small, meaningful commits with clear messages (for example `feat(orders): create order with stock validation`).

## 11. How to work

1. Build in this order: database, backend, auth and RBAC, frontend shell and navigation, each module, dashboard and reports, documentation.
2. After each stage, run the code (install dependencies, start the server, hit the endpoints, start the client) and fix errors before moving on. Do not leave anything half-built.
3. Verify at the end: log in as Administrator, add a supplier, add a product, record incoming stock, register a vendor using the map picker, create an order, move it through every status, confirm that stock drops only on Completed and not on Cancelled, and confirm every report and dashboard figure matches the data.
4. At the end, give me a short summary of what was built, how to run it, and any decisions you made that were not specified.

---

## Phase prompts (use these if you prefer to go step by step)

**Phase 1: Database and backend foundation**
> Following the full specification above, create the `database/` scripts and the Express server skeleton (config, db pool, error middleware, auth with JWT, RBAC middleware, the createAdmin script). Run it and confirm the server connects to MySQL.

**Phase 2: Backend modules**
> Implement all REST endpoints, validation, business rules, transactions, dashboard and report endpoints exactly as specified. Test each endpoint and fix errors.

**Phase 3: Frontend shell**
> Create the Vite React client, global styles following the design rules, the side panel layout, routing, login, auth context, role-based navigation, and the reusable Modal, ConfirmModal, DataTable, FormField and StatusBadge components.

**Phase 4: Frontend modules**
> Build the Fruits, Box Sizes and Products, Suppliers, Stock, Street Vendors (including the map location picker from section 8.1) and Orders pages, all connected to the API with validation, search and filters.

**Phase 5: Dashboard, reports, documentation**
> Build the Dashboard and Reports pages, then write the README and the docs (ERD, architecture and use-case diagrams, API reference). Do a final end-to-end check as described in section 11.
