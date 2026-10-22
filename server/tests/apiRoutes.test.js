import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

process.env.CLIENT_ORIGIN ??= 'http://localhost:5173';
process.env.JWT_SECRET ??= 'phase2-test-secret-that-is-at-least-32-characters';
process.env.JWT_EXPIRES_IN ??= '8h';
process.env.DB_HOST ??= '127.0.0.1';
process.env.DB_PORT ??= '3306';
process.env.DB_USER ??= 'test';
process.env.DB_PASSWORD ??= '';
process.env.DB_NAME ??= 'batloung_fruits';

const { app } = await import('../src/app.js');
let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

const protectedPaths = [
  '/api/provinces',
  '/api/box-sizes',
  '/api/fruits',
  '/api/products',
  '/api/suppliers',
  '/api/vendors',
  '/api/stock',
  '/api/orders',
  '/api/dashboard',
  '/api/reports/available-stock'
];

for (const path of protectedPaths) {
  test(`${path} requires authentication`, async () => {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401);
  });
}
