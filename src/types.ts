export type Role = 'aluno' | 'atendente';
export type Status = 'Em preparo' | 'Pronto' | 'Entregue' | 'Cancelado';

export type User = { id: number; name: string; username: string; role: Role; course: string | null; shift: string | null };
/** Escola atendida e as opções do cadastro (vêm do servidor). */
export type School = { name: string; courses: string[]; shifts: string[] };
export type MenuItem = { id: string; name: string; priceCents: number; available: boolean };
export type OrderItem = { id: string; name: string; quantity: number; unitPriceCents: number };
export type Order = {
  number: number;
  customer: string;
  course: string | null;
  shift: string | null;
  status: Status;
  totalCents: number;
  createdAt: string;
  items: OrderItem[];
};

/** Resumo do dia para a atendente. Faturamento conta só pedidos entregues (pagamento na retirada). */
export type Report = {
  orders: number;
  open: number;
  delivered: number;
  cancelled: number;
  revenueCents: number;
  byShift: { shift: string; orders: number }[];
  topItems: { name: string; quantity: number }[];
};

/** Aviso que a atendente publica para os alunos. */
export type Announcement = { text: string; updatedAt: string };

/** Quantidade por id do item. */
export type Cart = Record<string, number>;
export type Notice = { message: string; attempt: number };

/** Caminho normal do pedido. "Cancelado" fica de fora: só a atendente usa, com confirmação. */
export const statuses: Status[] = ['Em preparo', 'Pronto', 'Entregue'];
/** Pedido encerrado: o aluno pode fazer outro. */
export const isClosed = (status: Status) => status === 'Entregue' || status === 'Cancelado';
export const maxPerItem = 5;
