import type { Order } from './types';

export const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

export const orderNumber = (value: number) => String(value).padStart(3, '0');

export const orderSummary = (order: Order) =>
  order.items.map((item) => `${item.quantity} ${item.name.toLowerCase()}`).join(', ');

export const firstName = (name: string) => name.split(' ')[0];
