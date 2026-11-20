import { db } from '../config/database.js';

const toItem = (row) =>
  row && { id: row.id, name: row.name, priceCents: row.price_cents, available: row.available === 1 };

const all = db.prepare('SELECT * FROM menu_items ORDER BY position');
const byId = db.prepare('SELECT * FROM menu_items WHERE id = ?');
const nextPosition = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS position FROM menu_items');
const insert = db.prepare('INSERT INTO menu_items (id, name, price_cents, position) VALUES (?, ?, ?, ?)');
const update = db.prepare('UPDATE menu_items SET name = ?, price_cents = ?, available = ? WHERE id = ?');

// Id legível a partir do nome: "Pão de queijo" vira "pao-de-queijo" (ou "pao-de-queijo-2" se já existir).
function newId(name) {
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30) || 'item';
  let id = base;
  for (let n = 2; byId.get(id); n++) id = `${base}-${n}`;
  return id;
}

export const MenuItem = {
  list: () => all.all().map(toItem),

  findById: (id) => toItem(byId.get(id)),

  create({ name, priceCents }) {
    const id = newId(name);
    insert.run(id, name, priceCents, nextPosition.get().position);
    return this.findById(id);
  },

  // O preço novo vale só para pedidos novos: cada pedido guarda o preço da hora em que foi feito.
  update(id, { name, priceCents, available }) {
    update.run(name, priceCents, available ? 1 : 0, id);
    return this.findById(id);
  },
};
