import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './env.js';

if (config.databaseFile !== ':memory:') mkdirSync(dirname(config.databaseFile), { recursive: true });

export const db = new DatabaseSync(config.databaseFile);

const ordersTable = (name) => `
  CREATE TABLE ${name} (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'Em preparo' CHECK (status IN ('Em preparo', 'Pronto', 'Entregue', 'Cancelado')),
    total_cents INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`;

db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('aluno', 'atendente')),
    course TEXT,
    shift TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),
    position INTEGER NOT NULL
  );

  ${ordersTable('IF NOT EXISTS orders')};

  CREATE TABLE IF NOT EXISTS order_items (
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 5),
    unit_price_cents INTEGER NOT NULL,
    PRIMARY KEY (order_id, menu_item_id)
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    details TEXT,
    ip TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Valores avulsos da cantina, como o aviso para os alunos.
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);
  CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
`);

// Curso e turno entraram depois da primeira versão: bancos já criados recebem as colunas aqui.
// Ficam vazios para a atendente e para alunos cadastrados antes.
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((column) => column.name);
if (!userColumns.includes('course')) db.exec('ALTER TABLE users ADD COLUMN course TEXT');
if (!userColumns.includes('shift')) db.exec('ALTER TABLE users ADD COLUMN shift TEXT');

// "Cancelado" entrou depois: em bancos antigos a regra da coluna status não aceita esse valor.
// O SQLite não altera essa regra, então a tabela é recriada com os mesmos dados.
const { sql: ordersSql } = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'orders'").get();
if (!ordersSql.includes('Cancelado')) {
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec(`
    BEGIN;
    ${ordersTable('orders_new')};
    INSERT INTO orders_new (id, user_id, status, total_cents, created_at, updated_at)
      SELECT id, user_id, status, total_cents, created_at, updated_at FROM orders;
    DROP TABLE orders;
    ALTER TABLE orders_new RENAME TO orders;
    CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);
    COMMIT;
  `);
  db.exec('PRAGMA foreign_keys = ON');
}

// Cardápio inicial. Preços em centavos para não ter erro de arredondamento.
const seedItem = db.prepare('INSERT OR IGNORE INTO menu_items (id, name, price_cents, position) VALUES (?, ?, ?, ?)');
[
  ['sanduiche', 'Sanduíche natural', 700],
  ['misto', 'Misto quente', 600],
  ['coxinha', 'Coxinha', 500],
  ['suco', 'Suco de laranja', 400],
  ['agua', 'Água', 250],
].forEach(([id, name, price], position) => seedItem.run(id, name, price, position));

// Executa várias escritas como uma só: ou todas entram, ou nenhuma.
export function transaction(work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
