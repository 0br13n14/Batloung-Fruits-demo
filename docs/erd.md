# Entity relationship diagram

This diagram reflects the tables, primary keys and foreign-key relationships in [`database/schema.sql`](../database/schema.sql).

```mermaid
erDiagram
    roles {
        INT id PK
        VARCHAR name UK
    }
    users {
        INT id PK
        VARCHAR full_name
        VARCHAR email UK
        VARCHAR password_hash
        INT role_id FK
        BOOLEAN is_active
        TIMESTAMP created_at
    }
    provinces {
        INT id PK
        VARCHAR name UK
    }
    fruits {
        INT id PK
        VARCHAR name UK
        TEXT description
        BOOLEAN is_active
    }
    fruit_source_provinces {
        INT fruit_id PK, FK
        INT province_id PK, FK
    }
    box_sizes {
        INT id PK
        VARCHAR name UK
    }
    products {
        INT id PK
        INT fruit_id FK
        INT box_size_id FK
        INT quantity_per_box
        DECIMAL selling_price
        BOOLEAN is_active
    }
    suppliers {
        INT id PK
        VARCHAR name
        INT province_id FK
        VARCHAR contact_person
        VARCHAR telephone
        VARCHAR email
        VARCHAR physical_address
        TIMESTAMP created_at
    }
    purchases {
        INT id PK
        INT supplier_id FK
        INT product_id FK
        INT quantity_boxes
        DECIMAL unit_cost
        DATE purchase_date
        INT created_by FK
    }
    stock {
        INT id PK
        INT product_id FK, UK
        INT quantity_available
    }
    street_vendors {
        INT id PK
        VARCHAR vendor_name
        VARCHAR business_name
        VARCHAR telephone
        VARCHAR location_area
        DECIMAL latitude
        DECIMAL longitude
        DATE registration_date
        ENUM status
    }
    orders {
        INT id PK
        INT vendor_id FK
        TIMESTAMP order_date
        ENUM status
        DECIMAL total_amount
        INT created_by FK
    }
    order_items {
        INT id PK
        INT order_id FK
        INT product_id FK
        INT quantity_boxes
        DECIMAL unit_price
        DECIMAL subtotal
    }

    roles ||--o{ users : grants
    users ||--o{ purchases : records
    users ||--o{ orders : creates
    provinces ||--o{ suppliers : located_in
    fruits ||--o{ fruit_source_provinces : has_source
    provinces ||--o{ fruit_source_provinces : supplies_from
    fruits ||--o{ products : sold_as
    box_sizes ||--o{ products : packaged_as
    suppliers ||--o{ purchases : provides
    products ||--o{ purchases : purchased_as
    products ||--o| stock : tracked_as
    street_vendors ||--o{ orders : places
    orders ||--|{ order_items : contains
    products ||--o{ order_items : ordered_as
```

The `fruit_source_provinces` table joins fruits to allowed source provinces. A product has at most one stock row, enforced by the unique key on `stock.product_id`.
