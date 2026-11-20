import { transaction } from '../config/database.js';
import { AuditLog } from '../models/AuditLog.js';
import { MenuItem } from '../models/MenuItem.js';
import { CLOSED, Order, STATUSES } from '../models/Order.js';
import { HttpError } from '../utils/httpError.js';

export const MAX_PER_ITEM = 5;

const parseId = (value) => (/^\d{1,9}$/.test(value) ? Number(value) : null);

// Confere o formato do pedido. Preço e nome nunca vêm do cliente: saem do banco.
function parseItems(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, 'Adicione pelo menos um item antes de confirmar.');
  }
  if (value.length > 20) throw new HttpError(400, 'Itens demais no pedido.');
  const seen = new Set();
  return value.map((entry) => {
    const { id, quantity } = entry ?? {};
    if (typeof id !== 'string' || !Number.isInteger(quantity) || seen.has(id)) {
      throw new HttpError(400, 'Pedido com item inválido.');
    }
    if (quantity < 1 || quantity > MAX_PER_ITEM) throw new HttpError(400, `Limite de ${MAX_PER_ITEM} unidades por item.`);
    seen.add(id);
    return { id, quantity };
  });
}

// Aluno só enxerga os próprios pedidos; atendente vê todos.
function findVisibleOrder(req) {
  const id = parseId(req.params.id);
  const order = id && Order.findById(id);
  if (!order || (req.user.role !== 'atendente' && order.userId !== req.user.id)) {
    // 404 em vez de 403: não revela que o pedido de outra pessoa existe.
    throw new HttpError(404, 'Pedido não encontrado.');
  }
  return order;
}

export function list(req, res) {
  const orders = req.user.role === 'atendente' ? Order.listForPanel() : Order.listByUser(req.user.id);
  res.json({ orders: orders.map(Order.toPublic) });
}

export function show(req, res) {
  res.json({ order: Order.toPublic(findVisibleOrder(req)) });
}

export function create(req, res) {
  const requested = parseItems(req.body?.items);

  const order = transaction(() => {
    if (Order.findActiveByUser(req.user.id)) throw new HttpError(409, 'Você já tem um pedido em andamento.');
    const lines = requested.map(({ id, quantity }) => {
      const item = MenuItem.findById(id);
      if (!item) throw new HttpError(400, 'Pedido com item inválido.');
      if (!item.available) throw new HttpError(409, `${item.name} esgotou. Revise seu pedido.`);
      return { menuItemId: item.id, quantity, unitPriceCents: item.priceCents };
    });
    return Order.create(req.user.id, lines);
  });

  AuditLog.record(req, 'order.create', { order: order.number, totalCents: order.totalCents });
  res.status(201).json({ order: Order.toPublic(order) });
}

export function updateStatus(req, res) {
  const order = findVisibleOrder(req);
  const { status } = req.body ?? {};
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Situação inválida.');
  if (order.status === 'Cancelado' && status !== 'Cancelado') {
    throw new HttpError(409, 'Pedido cancelado não pode ser reaberto.');
  }
  // Reabrir um pedido entregue não pode deixar o aluno com dois pedidos em andamento.
  if (CLOSED.includes(order.status) && !CLOSED.includes(status)) {
    const active = Order.findActiveByUser(order.userId);
    if (active && active.number !== order.number) throw new HttpError(409, 'O aluno já tem outro pedido em andamento.');
  }

  const updated = Order.setStatus(order.number, status);
  AuditLog.record(req, 'order.status', { order: order.number, from: order.status, to: status });
  res.json({ order: Order.toPublic(updated) });
}
