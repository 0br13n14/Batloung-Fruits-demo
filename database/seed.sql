USE batloung_fruits;

INSERT INTO roles (id, name) VALUES
  (1, 'Administrator'),
  (2, 'Sales');

INSERT INTO provinces (id, name) VALUES
  (1, 'Eastern Cape'),
  (2, 'Free State'),
  (3, 'Gauteng'),
  (4, 'KwaZulu-Natal'),
  (5, 'Limpopo'),
  (6, 'Mpumalanga'),
  (7, 'Northern Cape'),
  (8, 'North West'),
  (9, 'Western Cape');

INSERT INTO fruits (id, name, description) VALUES
  (1, 'Apples', NULL),
  (2, 'Bananas', NULL),
  (3, 'Oranges', NULL),
  (4, 'Mangoes', NULL),
  (5, 'Grapes', NULL);

INSERT INTO box_sizes (id, name) VALUES
  (1, 'Small'),
  (2, 'Medium'),
  (3, 'Large');

INSERT INTO fruit_source_provinces (fruit_id, province_id) VALUES
  (1, 9),
  (1, 2),
  (1, 6),
  (2, 5),
  (2, 4),
  (2, 6),
  (3, 5),
  (3, 6),
  (3, 1),
  (4, 5),
  (4, 6),
  (4, 4),
  (5, 9),
  (5, 7),
  (5, 5);
