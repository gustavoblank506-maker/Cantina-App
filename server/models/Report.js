import { db } from '../config/database.js';
import { config } from '../config/env.js';

// O banco guarda as datas em UTC. "Hoje" é o dia no fuso da escola (Alagoinhas: UTC−3, sem horário de verão).
const local = `'${config.utcOffsetHours} hours'`;
const today = `date(orders.created_at, ${local}) = date('now', ${local})`;

const byStatus = db.prepare(`
  SELECT status, COUNT(*) AS orders, COALESCE(SUM(total_cents), 0) AS total_cents
  FROM orders WHERE ${today} GROUP BY status
`);
const byShift = db.prepare(`
  SELECT COALESCE(users.shift, 'Sem turno') AS shift, COUNT(*) AS orders
  FROM orders JOIN users ON users.id = orders.user_id
  WHERE ${today} AND orders.status != 'Cancelado'
  GROUP BY 1 ORDER BY 2 DESC
`);
const topItems = db.prepare(`
  SELECT menu_items.name, SUM(order_items.quantity) AS quantity
  FROM order_items
  JOIN orders ON orders.id = order_items.order_id
  JOIN menu_items ON menu_items.id = order_items.menu_item_id
  WHERE ${today} AND orders.status != 'Cancelado'
  GROUP BY menu_items.id ORDER BY quantity DESC, menu_items.position LIMIT 5
`);

export const Report = {
  /** Resumo do dia para a atendente: pedidos, faturamento, turnos e itens mais pedidos. */
  today() {
    const statuses = Object.fromEntries(byStatus.all().map((row) => [row.status, row]));
    const count = (status) => statuses[status]?.orders ?? 0;
    return {
      orders: count('Em preparo') + count('Pronto') + count('Entregue'),
      open: count('Em preparo') + count('Pronto'),
      delivered: count('Entregue'),
      cancelled: count('Cancelado'),
      // Só pedidos entregues: o pagamento acontece na retirada.
      revenueCents: statuses.Entregue?.total_cents ?? 0,
      byShift: byShift.all().map((row) => ({ shift: row.shift, orders: row.orders })),
      topItems: topItems.all().map((row) => ({ name: row.name, quantity: row.quantity })),
    };
  },
};
