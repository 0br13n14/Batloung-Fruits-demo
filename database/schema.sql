CREATE DATABASE IF NOT EXISTS batloung_fruits
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE batloung_fruits;

CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name),
  CONSTRAINT chk_roles_name CHECK (name IN ('Administrator', 'Sales'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_role_id (role_id),
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS provinces (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_provinces_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fruits (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fruits_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fruit_source_provinces (
  fruit_id INT UNSIGNED NOT NULL,
  province_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (fruit_id, province_id),
  KEY ix_fruit_source_provinces_province_id (province_id),
  CONSTRAINT fk_fruit_source_provinces_fruit
    FOREIGN KEY (fruit_id) REFERENCES fruits (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_fruit_source_provinces_province
    FOREIGN KEY (province_id) REFERENCES provinces (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS box_sizes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_box_sizes_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fruit_id INT UNSIGNED NOT NULL,
  box_size_id INT UNSIGNED NOT NULL,
  quantity_per_box INT UNSIGNED NOT NULL,
  selling_price DECIMAL(12, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_fruit_box_size (fruit_id, box_size_id),
  KEY ix_products_box_size_id (box_size_id),
  CONSTRAINT chk_products_quantity_per_box CHECK (quantity_per_box > 0),
  CONSTRAINT chk_products_selling_price CHECK (selling_price > 0),
  CONSTRAINT fk_products_fruit
    FOREIGN KEY (fruit_id) REFERENCES fruits (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_products_box_size
    FOREIGN KEY (box_size_id) REFERENCES box_sizes (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS suppliers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  province_id INT UNSIGNED NOT NULL,
  contact_person VARCHAR(150) NULL,
  telephone VARCHAR(40) NULL,
  email VARCHAR(254) NULL,
  physical_address VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_suppliers_province_id (province_id),
  CONSTRAINT fk_suppliers_province
    FOREIGN KEY (province_id) REFERENCES provinces (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchases (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  supplier_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity_boxes INT UNSIGNED NOT NULL,
  unit_cost DECIMAL(12, 2) NOT NULL,
  purchase_date DATE NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY ix_purchases_supplier_id (supplier_id),
  KEY ix_purchases_product_id (product_id),
  KEY ix_purchases_created_by (created_by),
  KEY ix_purchases_purchase_date (purchase_date),
  CONSTRAINT chk_purchases_quantity_boxes CHECK (quantity_boxes > 0),
  CONSTRAINT chk_purchases_unit_cost CHECK (unit_cost >= 0),
  CONSTRAINT fk_purchases_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_purchases_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_purchases_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED NOT NULL,
  quantity_available INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stock_product_id (product_id),
  CONSTRAINT chk_stock_quantity_available CHECK (quantity_available >= 0),
  CONSTRAINT fk_stock_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS street_vendors (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  vendor_name VARCHAR(150) NOT NULL,
  business_name VARCHAR(150) NULL,
  telephone VARCHAR(40) NOT NULL,
  location_area VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  registration_date DATE NOT NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  PRIMARY KEY (id),
  KEY ix_street_vendors_status (status),
  CONSTRAINT chk_street_vendors_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (
      latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND
      latitude BETWEEN -90 AND 90
      AND longitude BETWEEN -180 AND 180
    )
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  vendor_id INT UNSIGNED NOT NULL,
  order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM(
    'Pending',
    'Confirmed',
    'Processing',
    'Ready for Collection/Delivery',
    'Completed',
    'Cancelled'
  ) NOT NULL DEFAULT 'Pending',
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  created_by INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY ix_orders_vendor_id (vendor_id),
  KEY ix_orders_created_by (created_by),
  KEY ix_orders_status_order_date (status, order_date),
  CONSTRAINT chk_orders_total_amount CHECK (total_amount >= 0),
  CONSTRAINT fk_orders_vendor
    FOREIGN KEY (vendor_id) REFERENCES street_vendors (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_orders_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity_boxes INT UNSIGNED NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_order_items_order_id (order_id),
  KEY ix_order_items_product_id (product_id),
  CONSTRAINT chk_order_items_quantity_boxes CHECK (quantity_boxes > 0),
  CONSTRAINT chk_order_items_unit_price CHECK (unit_price > 0),
  CONSTRAINT chk_order_items_subtotal CHECK (subtotal > 0),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
