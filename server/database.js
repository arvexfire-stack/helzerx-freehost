import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(path.join(dataDir, 'helzerx.sqlite'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS app_records (
    collection TEXT NOT NULL,
    record_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (collection, record_id)
  );
  CREATE INDEX IF NOT EXISTS idx_app_records_collection_updated
    ON app_records(collection, updated_at);
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);
`);

const selectAll = db.prepare('SELECT record_id, payload FROM app_records WHERE collection = ? ORDER BY created_at, record_id');
const upsert = db.prepare(`INSERT INTO app_records(collection, record_id, payload, updated_at)
  VALUES (?, ?, ?, datetime('now'))
  ON CONFLICT(collection, record_id) DO UPDATE SET payload=excluded.payload, updated_at=datetime('now')`);
const removeCollection = db.prepare('DELETE FROM app_records WHERE collection = ?');
function transaction(fn, value) {
  db.exec('BEGIN IMMEDIATE');
  try { fn(value); db.exec('COMMIT'); }
  catch (error) { try { db.exec('ROLLBACK'); } catch {} throw error; }
}

export function readCollection(name) {
  return selectAll.all(name).map(row => {
    try { return { id: row.record_id, value: JSON.parse(row.payload) }; }
    catch { throw new Error('Database record is invalid JSON in collection: ' + name); }
  });
}

export function replaceCollection(name, records) {
  transaction(items => {
    removeCollection.run(name);
    for (const item of items) {
      const id = String(item.id ?? '');
      if (!id || id.length > 200) throw new Error('Invalid database record identifier.');
      upsert.run(name, id, JSON.stringify(item.value));
    }
  }, records);
}

export function readState() {
  const result = {};
  for (const name of ['users','claims','inviteClaims','hostingRequests','tickets','plans','auditLogs']) {
    const records = readCollection(name);
    result[name] = name === 'users'
      ? Object.fromEntries(records.map(x => [x.id, x.value]))
      : records.map(x => ({ id: x.id, ...x.value }));
  }
  return result;
}

export function writeState(state) {
  transaction(value => {
    for (const name of ['users','claims','inviteClaims','hostingRequests','tickets','plans','auditLogs']) {
      const items = name === 'users'
        ? Object.entries(value[name] || {}).map(([id, record]) => ({ id, value: record }))
        : (value[name] || []).map(record => {
            const { id, ...payload } = record;
            return { id, value: payload };
          });
      removeCollection.run(name);
      for (const item of items) {
        const id = String(item.id ?? '');
        if (!id || id.length > 200) throw new Error('Invalid database record identifier in ' + name);
        upsert.run(name, id, JSON.stringify(item.value));
      }
    }
  }, state);
}
