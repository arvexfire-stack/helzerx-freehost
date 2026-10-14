import test from 'node:test';
import assert from 'node:assert/strict';
import { applySecurityHeaders, createRateLimiter } from '../server/security.js';

function responseMock() {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    body: null,
    setHeader(name, value) { headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('security headers are set without enforcing a breaking CSP yet', () => {
  const req = {};
  const res = responseMock();
  let continued = false;
  applySecurityHeaders(req, res, () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(res.headers['X-Frame-Options'], 'DENY');
  assert.ok(res.headers['Content-Security-Policy-Report-Only']);
  assert.equal(res.headers['Content-Security-Policy'], undefined);
});

test('rate limiter rejects requests above the configured limit', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, limit: 1, keyPrefix: 'test' });
  const req = { ip: '203.0.113.10', socket: {} };
  const first = responseMock();
  let nextCalls = 0;
  limiter(req, first, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1);
  const second = responseMock();
  limiter(req, second, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1);
  assert.equal(second.statusCode, 429);
  assert.equal(second.headers['Retry-After'] !== undefined, true);
});

test('rate limiter keeps different client identities separate', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, limit: 1, keyPrefix: 'test' });
  let nextCalls = 0;
  limiter({ ip: '203.0.113.10', socket: {} }, responseMock(), () => { nextCalls += 1; });
  const second = responseMock();
  limiter({ ip: '203.0.113.11', socket: {} }, second, () => { nextCalls += 1; });
  assert.equal(nextCalls, 2);
  assert.equal(second.statusCode, 200);
});
