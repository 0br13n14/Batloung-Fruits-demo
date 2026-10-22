import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

process.env.CLIENT_ORIGIN ??= 'http://localhost:5173';
process.env.JWT_SECRET ??= 'phase1-test-secret-that-is-at-least-32-characters';
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

test('login rejects missing fields with field-level validation errors', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.ok(body.error.fields.some((field) => field.field === 'email'));
  assert.ok(body.error.fields.some((field) => field.field === 'password'));
});

test('login rejects passwords below the shared minimum length', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: '1234' })
  });
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.ok(body.error.fields.some((field) => field.field === 'password'));
});

test('current-user endpoint rejects requests without a bearer token', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.message, 'Authentication is required.');
});

test('unknown API routes return a structured not-found error', async () => {
  const response = await fetch(`${baseUrl}/api/not-implemented`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.message, 'Route not found: GET /api/not-implemented');
});
