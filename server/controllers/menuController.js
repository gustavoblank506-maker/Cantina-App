import { AuditLog } from '../models/AuditLog.js';
import { MenuItem } from '../models/MenuItem.js';
import { HttpError } from '../utils/httpError.js';

const cleanName = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

function checkName(name) {
  if (name.length < 2 || name.length > 40) throw new HttpError(400, 'O nome do item deve ter de 2 a 40 caracteres.');
}

function checkPrice(priceCents) {
  if (!Number.isInteger(priceCents) || priceCents < 50 || priceCents > 100000) {
    throw new HttpError(400, 'O preço deve ficar entre R$ 0,50 e R$ 1.000,00.');
  }
}

export function list(req, res) {
  res.json({ items: MenuItem.list() });
}

export function create(req, res) {
  const name = cleanName(req.body?.name);
  const { priceCents } = req.body ?? {};
  checkName(name);
  checkPrice(priceCents);

  const item = MenuItem.create({ name, priceCents });
  AuditLog.record(req, 'menu.create', { item: item.id, priceCents });
  res.status(201).json({ item });
}

// Muda nome, preço e/ou disponibilidade. Campos ausentes ficam como estão.
export function update(req, res) {
  const item = MenuItem.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Item não encontrado.');
  const body = req.body ?? {};

  const name = body.name === undefined ? item.name : cleanName(body.name);
  const priceCents = body.priceCents === undefined ? item.priceCents : body.priceCents;
  const available = body.available === undefined ? item.available : body.available;
  checkName(name);
  checkPrice(priceCents);
  if (typeof available !== 'boolean') throw new HttpError(400, 'Informe se o item está disponível.');

  const updated = MenuItem.update(item.id, { name, priceCents, available });
  AuditLog.record(req, 'menu.update', { item: item.id, name, priceCents, available });
  res.json({ item: updated });
}
