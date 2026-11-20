import { db } from '../config/database.js';

export const STATUSES = ['Em preparo', 'Pronto', 'Entregue', 'Cancelado'];
// Situações em que o pedido acabou: o aluno pode fazer outro.
export const CLOSED = ['Entregue', 'Cancelado'];

const selectOrder = `
  SELECT orders.*, users.name AS customer, users.course AS course, users.shift AS shift
  FROM orders JOIN users ON users.id = orders.user_id
`;
const byId = db.prepare(`${selectOrder} WHERE orders.id = ?`);
const activeByUser = db.prepare(
  `${selectOrder} WHERE orders.user_id = ? AND orders.status NOT IN ('Entregue', 'Cancelado') LIMIT 1`,
);
const byUser = db.prepare(`${selectOrder} WHERE orders.user_id = ? ORDER BY orders.id DESC LIMIT 20`);
// Painel: pedidos em aberto primeiro, os mais novos no topo.
const forPanel = db.prepare(
  `${selectOrder} ORDER BY orders.status IN ('Entregue', 'Cancelado'), orders.id DESC LIMIT 50`,
);
const itemsOf = db.prepare(`
  SELECT order_items.menu_item_id AS id, menu_items.name, order_items.quantity, order_items.unit_price_cents
  FROM order_items JOIN menu_items ON menu_items.id = order_items.menu_item_id
  WHERE order_items.order_id = ?
  ORDER BY menu_items.position
`);
const insertOrder = db.prepare('INSERT INTO orders (user_id, total_cents) VALUES (?, ?)');
const insertItem = db.prepare(
  'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)',
);
const updateStatus = db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?");

function toOrder(row) {
  if (!row) return null;
  return {
    number: row.id,
    userId: row.user_id,
    customer: row.customer,
    // Curso e turno de quem pediu: a atendente vê de que turma vem o pedido e em qual intervalo.
    course: row.course,
    shift: row.shift,
    status: row.status,
    totalCents: row.total_cents,
    createdAt: row.created_at,
    items: itemsOf.all(row.id).map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
    })),
  };
}

export const Order = {
  findById: (id) => toOrder(byId.get(id)),

  findActiveByUser: (userId) => toOrder(activeByUser.get(userId)),

  listByUser: (userId) => byUser.all(userId).map(toOrder),

  listForPanel: () => forPanel.all().map(toOrder),

  // Deve rodar dentro de transaction(): o pedido e seus itens entram juntos.
  create(userId, lines) {
    const total = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
    const id = Number(insertOrder.run(userId, total).lastInsertRowid);
    for (const line of lines) insertItem.run(id, line.menuItemId, line.quantity, line.unitPriceCents);
    return this.findById(id);
  },

  setStatus(id, status) {
    updateStatus.run(status, id);
    return this.findById(id);
  },

  // O id do dono fica no servidor; a resposta leva só o que a tela precisa.
  toPublic: ({ userId, ...order }) => order,
};
