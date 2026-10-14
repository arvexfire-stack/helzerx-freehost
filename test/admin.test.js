import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('private admin page includes secure login and main management sections', () => {
  const html = fs.readFileSync(new URL('../private/admin.html', import.meta.url), 'utf8');
  for (const term of ['login-form', 'data-view="users"', 'data-view="plans"', 'data-view="hosting"', 'data-view="tickets"', 'data-view="audit"', '/api/admin/users', '/api/admin/plans', '/api/admin/tickets']) {
    assert.ok(html.includes(term), 'missing admin feature: ' + term);
  }
});

test('private admin inline JavaScript parses', () => {
  const html = fs.readFileSync(new URL('../private/admin.html', import.meta.url), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  assert.ok(scripts.length > 0, 'expected an inline application script');
  for (const [index, script] of scripts.entries()) { try { new vm.Script(script, { filename: 'private/admin.html:inline-script-' + index }); } catch (error) { assert.fail(error.stack || error.message); } }
});

test('database layer uses native SQLite and transactional writes', () => {
  const source = fs.readFileSync(new URL('../server/database.js', import.meta.url), 'utf8');
  assert.match(source, /from 'node:sqlite'/);
  assert.match(source, /BEGIN IMMEDIATE/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS app_records/);
  assert.match(source, /function writeState/);
});

test('server exposes admin APIs for member, plans, tickets and VPS lifecycle', () => {
  const source = fs.readFileSync(new URL('../server/index.js', import.meta.url), 'utf8');
  for (const route of [
    '/api/admin/users/:id/balance',
    '/api/admin/users/:id/status',
    '/api/admin/plans',
    '/api/admin/tickets/:id/messages',
    '/api/admin/hosting-requests/manual',
    '/api/admin/hosting-requests/:id/action'
  ]) assert.ok(source.includes(route), 'missing route ' + route);
});
