# API reference

Base URL: `http://127.0.0.1:3000/api`

All routes except login require `Authorization: Bearer <accessToken>`. Request and response fields use the database's `snake_case` names. List endpoints return an object containing the named collection; detail and write endpoints return an object containing the named record. Errors use `{ "error": { "message": "...", "fields": [] } }`. Invalid request fields return `422`; invalid business-state transitions and dependent deletes return `409`.

## Authentication and reference lookups

| Method | Path | Role | Sample request | Sample response |
|---|---|---|---|---|
| POST | `/auth/login` | Public | `{"email":"admin@example.com","password":"secret"}` | `{"accessToken":"<token>","user":{"id":1,"fullName":"Admin","email":"admin@example.com","role":"Administrator"}}` |
| GET | `/auth/me` | Administrator, Sales | — | `{"user":{"id":1,"fullName":"Admin","email":"admin@example.com","role":"Administrator"}}` |
| GET | `/provinces` | Administrator, Sales | — | `{"provinces":[{"id":1,"name":"Eastern Cape"}]}` |
| GET | `/box-sizes` | Administrator, Sales | — | `{"boxSizes":[{"id":1,"name":"Small"}]}` |

## Fruits and products

`source_province_ids` is optional when creating/updating a fruit; when supplied, it replaces its source-province mappings. Fruit and product `DELETE` routes deactivate records so historical dependencies remain intact.

| Method | Path | Role | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/fruits?search=app&status=Active` | Administrator, Sales | — | `{"fruits":[{"id":1,"name":"Apples","description":null,"is_active":true,"source_provinces":[{"id":9,"name":"Western Cape"}]}]}` |
| GET | `/fruits/:id` | Administrator, Sales | — | `{"fruit":{"id":1,"name":"Apples","description":null,"is_active":true,"source_provinces":[]}}` |
| POST | `/fruits` | Administrator | `{"name":"Apples","description":null,"source_province_ids":[2,6,9]}` | `{"fruit":{"id":1,"name":"Apples","source_province_ids":[2,6,9]}}` |
| PUT | `/fruits/:id` | Administrator | `{"name":"Apples","description":null,"is_active":true,"source_province_ids":[2,6,9]}` | `{"fruit":{"id":1,"name":"Apples","description":null,"is_active":true,"source_province_ids":[2,6,9]}}` |
| DELETE | `/fruits/:id` | Administrator | — | `{"message":"Fruit deactivated."}` |
| GET | `/products?search=apple&fruit=1&boxSize=1` | Administrator, Sales | — | `{"products":[{"id":1,"fruit_id":1,"fruit_name":"Apples","box_size_id":1,"box_size":"Small","quantity_per_box":10,"selling_price":25.5,"is_active":true}]}` |
| GET | `/products/:id` | Administrator, Sales | — | `{"product":{"id":1,"fruit_id":1,"fruit_name":"Apples","box_size_id":1,"box_size":"Small","quantity_per_box":10,"selling_price":25.5,"is_active":true}}` |
| POST | `/products` | Administrator | `{"fruit_id":1,"box_size_id":1,"quantity_per_box":10,"selling_price":25.5}` | `{"product":{"id":1,"fruit_id":1,"fruit_name":"Apples","box_size_id":1,"box_size":"Small","quantity_per_box":10,"selling_price":25.5,"is_active":true}}` |
| PUT | `/products/:id` | Administrator | `{"fruit_id":1,"box_size_id":1,"quantity_per_box":10,"selling_price":25.5,"is_active":true}` | `{"product":{"id":1,"fruit_id":1,"fruit_name":"Apples","box_size_id":1,"box_size":"Small","quantity_per_box":10,"selling_price":25.5,"is_active":true}}` |
| DELETE | `/products/:id` | Administrator | — | `{"message":"Product deactivated."}` |

Fruit/box-size product combinations are unique. The selling price and quantity per box must be greater than zero.
The optional fruit `status` filter accepts `Active` or `Inactive`; the optional `search` parameter matches fruit names.

## Suppliers and street vendors

Supplier `province` filters use a province ID. Vendor status filters accept `Active` or `Inactive`. Latitude and longitude are both optional, but must be provided together when used.

| Method | Path | Role | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/suppliers?search=fruit&province=9` | Administrator | — | `{"suppliers":[{"id":1,"name":"Supplier","province_id":9,"province_name":"Western Cape","contact_person":null,"telephone":null,"email":null,"physical_address":null,"created_at":"2026-01-01T00:00:00.000Z"}]}` |
| GET | `/suppliers/:id` | Administrator | — | `{"supplier":{"id":1,"name":"Supplier","province_id":9,"province_name":"Western Cape","contact_person":null,"telephone":null,"email":null,"physical_address":null}}` |
| POST | `/suppliers` | Administrator | `{"name":"Supplier","province_id":9,"contact_person":"Contact","telephone":"123","email":"contact@example.com","physical_address":"Address"}` | `{"supplier":{"id":1,"name":"Supplier","province_id":9,"contact_person":"Contact","telephone":"123","email":"contact@example.com","physical_address":"Address"}}` |
| PUT | `/suppliers/:id` | Administrator | `{"name":"Supplier","province_id":9,"contact_person":"Contact","telephone":"123","email":"contact@example.com","physical_address":"Address"}` | `{"supplier":{"id":1,"name":"Supplier","province_id":9,"contact_person":"Contact","telephone":"123","email":"contact@example.com","physical_address":"Address"}}` |
| DELETE | `/suppliers/:id` | Administrator | — | `{"message":"Supplier deleted."}`; returns `409` if purchases reference it |
| GET | `/vendors?search=street&status=Active` | Administrator, Sales | — | `{"vendors":[{"id":1,"vendor_name":"Vendor","business_name":null,"telephone":"123","location_area":"Maseru","latitude":-29.3167,"longitude":27.4833,"registration_date":"2026-01-01","status":"Active"}]}` |
| GET | `/vendors/:id` | Administrator, Sales | — | `{"vendor":{"id":1,"vendor_name":"Vendor","business_name":null,"telephone":"123","location_area":"Maseru","latitude":null,"longitude":null,"registration_date":"2026-01-01","status":"Active"}}` |
| POST | `/vendors` | Administrator, Sales | `{"vendor_name":"Vendor","business_name":"Shop","telephone":"123","location_area":"Maseru","latitude":-29.3167,"longitude":27.4833,"registration_date":"2026-01-01"}` | `{"vendor":{"id":1,"vendor_name":"Vendor","business_name":"Shop","telephone":"123","location_area":"Maseru","latitude":-29.3167,"longitude":27.4833,"registration_date":"2026-01-01","status":"Active"}}` |
| PUT | `/vendors/:id` | Administrator | `{"vendor_name":"Vendor","business_name":"Shop","telephone":"123","location_area":"Maseru","latitude":-29.3167,"longitude":27.4833,"registration_date":"2026-01-01","status":"Active"}` | `{"vendor":{"id":1,"vendor_name":"Vendor","business_name":"Shop","telephone":"123","location_area":"Maseru","latitude":-29.3167,"longitude":27.4833,"registration_date":"2026-01-01","status":"Active"}}` |
| DELETE | `/vendors/:id` | Administrator | — | `{"message":"Vendor deactivated."}` |

## Stock and orders

Posting to `/stock` records a purchase; stock is increased atomically. Completing an order checks stock again and reduces it once. Prices in order-item rows and order totals are computed from the product's current selling price, never from client-supplied totals.

| Method | Path | Role | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/stock?search=apple&fruit=1&boxSize=1` | Administrator | — | `{"stock":[{"id":1,"product_id":1,"fruit_id":1,"fruit_name":"Apples","box_size_id":1,"box_size":"Small","quantity_per_box":10,"selling_price":25.5,"is_active":true,"quantity_available":8}]}` |
| POST | `/stock` | Administrator | `{"supplier_id":1,"product_id":1,"quantity_boxes":10,"unit_cost":12.5,"purchase_date":"2026-01-01"}` | `{"purchase":{"id":1,"supplier_id":1,"product_id":1,"quantity_boxes":10,"unit_cost":12.5,"purchase_date":"2026-01-01","created_by":1,"quantity_available":10}}` |
| PUT | `/stock/:id` | Administrator | `{"quantity_available":8}` | `{"stock":{"id":1,"product_id":1,"quantity_available":8,"fruit_name":"Apples","box_size":"Small"}}` |
| GET | `/orders?status=Pending&vendor=1&from=2026-01-01&to=2026-01-31` | Administrator, Sales | — | `{"orders":[{"id":1,"vendor_id":1,"vendor_name":"Vendor","order_date":"2026-01-01T00:00:00.000Z","status":"Pending","total_amount":51,"created_by":1}]}` |
| GET | `/orders/:id` | Administrator, Sales | — | `{"order":{"id":1,"vendor_id":1,"vendor_name":"Vendor","order_date":"2026-01-01T00:00:00.000Z","status":"Pending","total_amount":51,"created_by":1,"items":[{"id":1,"product_id":1,"fruit_name":"Apples","box_size":"Small","quantity_boxes":2,"unit_price":25.5,"subtotal":51}]}}` |
| POST | `/orders` | Administrator, Sales | `{"vendor_id":1,"items":[{"product_id":1,"quantity_boxes":2}]}` | `{"order":{"id":1,"vendor_id":1,"vendor_name":"Vendor","status":"Pending","total_amount":51,"items":[{"product_id":1,"quantity_boxes":2,"unit_price":25.5,"subtotal":51}]}}` |
| PUT | `/orders/:id` | Administrator, Sales | `{"status":"Confirmed"}` | `{"order":{"id":1,"status":"Confirmed","total_amount":51,"items":[]}}` |
| DELETE | `/orders/:id` | Administrator | — | `{"message":"Order deleted."}`; completed orders return `409` |

Status progression is `Pending` → `Confirmed` → `Processing` → `Ready for Collection/Delivery` → `Completed`. `Cancelled` is permitted before completion; Sales users can cancel only Pending or Confirmed orders. Completed and Cancelled are terminal statuses.

## Dashboard and reports

Dashboard and reports are Administrator-only. Dashboard response includes the `summary`, `sales_by_fruit`, `orders_by_status` and `recent_orders` properties.

| Method | Path | Role | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/dashboard` | Administrator | — | `{"summary":{"total_fruits":5,"total_suppliers":1,"total_registered_vendors":1,"available_stock":8,"total_orders":1,"pending_orders":0,"completed_orders":1,"sales_value":51},"sales_by_fruit":[],"orders_by_status":[],"recent_orders":[]}` |
| GET | `/reports/available-stock` | Administrator | — | `{"report":"available-stock","data":[{"product_id":1,"fruit_name":"Apples","box_size":"Small","quantity_available":8}]}` |
| GET | `/reports/sales-by-fruit` | Administrator | — | `{"report":"sales-by-fruit","data":[{"fruit_id":1,"fruit_name":"Apples","boxes_sold":2,"sales_value":51}]}` |
| GET | `/reports/sales-by-box-size` | Administrator | — | `{"report":"sales-by-box-size","data":[{"box_size_id":1,"box_size":"Small","boxes_sold":2,"sales_value":51}]}` |
| GET | `/reports/sales-by-vendor` | Administrator | — | `{"report":"sales-by-vendor","data":[{"vendor_id":1,"vendor_name":"Vendor","boxes_sold":2,"sales_value":51}]}` |
| GET | `/reports/purchases-by-province` | Administrator | — | `{"report":"purchases-by-province","data":[{"province_id":9,"province_name":"Western Cape","boxes_purchased":10,"total_cost":125}]}` |
| GET | `/reports/pending-orders` | Administrator | — | `{"report":"pending-orders","data":[]}` |
| GET | `/reports/completed-orders` | Administrator | — | `{"report":"completed-orders","data":[{"id":1,"vendor_id":1,"vendor_name":"Vendor","status":"Completed","total_amount":51}]}` |
| GET | `/reports/total-sales-by-date?from=2026-01-01&to=2026-01-31` | Administrator | — | `{"report":"total-sales-by-date","data":[{"sale_date":"2026-01-01","sales_value":51}]}` |

Sales reports include Completed orders only. The date report accepts optional inclusive `from` and `to` calendar dates.

## End-to-end check

`server/tests/apiFlow.ps1` exercises Administrator and Sales login, role enforcement, supplier/product/purchase/vendor/order creation, stock changes, dashboard data, and all eight reports. Set `API_ADMIN_EMAIL`, `API_ADMIN_PASSWORD`, `API_SALES_EMAIL`, and `API_SALES_PASSWORD` in the process environment, then run:

```powershell
.\tests\apiFlow.ps1
```

Run it from the `server` directory while the API is listening on port 3000.
