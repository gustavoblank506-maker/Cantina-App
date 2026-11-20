// Modo demonstração (build para o GitHub Pages, que não roda servidor).
// Imita a API com as mesmas regras, guardando os dados no navegador:
// - localStorage: contas, cardápio, pedidos e aviso (compartilhados entre abas);
// - sessionStorage: quem está logado em cada aba (dá para abrir aluno e atendente lado a lado).
// Não é seguro para uso real: serve só para apresentar o app.
import type { Announcement, MenuItem, Order, Report, Role, School, Status, User } from '../types';
import { ApiError } from './errors';

export const DEMO_ATTENDANT = { username: 'atendente', password: 'cantina123' };

const school: School = {
  name: 'SENAI Alagoinhas',
  courses: [
    'Administração',
    'Automação Industrial',
    'Desenvolvimento de Sistemas',
    'Eletromecânica',
    'Eletrotécnica',
    'Logística',
    'Planejamento e Controle da Produção',
    'Química',
    'Segurança do Trabalho',
    'Aprendizagem Industrial',
    'Outro curso',
  ],
  shifts: ['Manhã', 'Tarde', 'Noite'],
};

type StoredUser = User & { password: string };
type StoredOrder = Omit<Order, 'customer' | 'course' | 'shift'> & { userId: number };
type Data = {
  users: StoredUser[];
  menu: MenuItem[];
  orders: StoredOrder[];
  notice: Announcement | null;
};

const DATA_KEY = 'cantina-demo-v1';
const SESSION_KEY = 'cantina-demo-sessao';
const closed: Status[] = ['Entregue', 'Cancelado'];

function seed(): Data {
  return {
    users: [{ id: 1, name: 'Atendente', role: 'atendente', course: null, shift: null, ...DEMO_ATTENDANT }],
    menu: [
      { id: 'sanduiche', name: 'Sanduíche natural', priceCents: 700, available: true },
      { id: 'misto', name: 'Misto quente', priceCents: 600, available: true },
      { id: 'coxinha', name: 'Coxinha', priceCents: 500, available: true },
      { id: 'suco', name: 'Suco de laranja', priceCents: 400, available: true },
      { id: 'agua', name: 'Água', priceCents: 250, available: true },
    ],
    orders: [],
    notice: null,
  };
}

function load(): Data {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) return JSON.parse(raw) as Data;
  } catch {}
  return seed();
}

function save(data: Data) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch {}
}

function sessionUserId(): number | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    return value ? Number(value) : null;
  } catch {
    return null;
  }
}

function setSession(id: number | null) {
  try {
    if (id === null) sessionStorage.removeItem(SESSION_KEY);
    else sessionStorage.setItem(SESSION_KEY, String(id));
  } catch {}
}

const publicUser = ({ password, ...user }: StoredUser): User => user;

/** Simula a ida ao servidor: lê os dados atuais, roda a regra e grava. */
async function call<T>(work: (data: Data, user: StoredUser | null) => T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const data = load();
  const id = sessionUserId();
  const user = data.users.find((entry) => entry.id === id) ?? null;
  const result = work(data, user);
  save(data);
  return structuredClone(result);
}

function requireUser(user: StoredUser | null, role?: Role) {
  if (!user) throw new ApiError('Faça login para continuar.', 401);
  if (role && user.role !== role) throw new ApiError('Você não tem permissão para isso.', 403);
  return user;
}

function toOrder(data: Data, order: StoredOrder): Order {
  const owner = data.users.find((user) => user.id === order.userId);
  const { userId, ...rest } = order;
  return { ...rest, customer: owner?.name ?? 'Aluno', course: owner?.course ?? null, shift: owner?.shift ?? null };
}

function visibleOrder(data: Data, user: StoredUser, number: number) {
  const order = data.orders.find((entry) => entry.number === number);
  if (!order || (user.role !== 'atendente' && order.userId !== user.id)) throw new ApiError('Pedido não encontrado.', 404);
  return order;
}

function checkItem(name: string, priceCents: number) {
  if (name.length < 2 || name.length > 40) throw new ApiError('O nome do item deve ter de 2 a 40 caracteres.', 400);
  if (!Number.isInteger(priceCents) || priceCents < 50 || priceCents > 100000) {
    throw new ApiError('O preço deve ficar entre R$ 0,50 e R$ 1.000,00.', 400);
  }
}

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export const demoApi = {
  me: () => call((_, user) => (user ? publicUser(user) : null)),

  login: (username: string, password: string, as: Role) =>
    call((data) => {
      const user = data.users.find((entry) => entry.username === username.trim().toLowerCase());
      if (!user || user.password !== password) throw new ApiError('Usuário ou senha inválidos.', 401);
      if (user.role !== as) {
        throw new ApiError(
          user.role === 'atendente' ? 'Esta é uma conta da cantina. Use a opção Atendente.' : 'Esta é uma conta de aluno. Use a opção Aluno.',
          403,
        );
      }
      setSession(user.id);
      return publicUser(user);
    }),

  register: (form: { name: string; username: string; password: string; course: string; shift: string }) =>
    call((data) => {
      const name = form.name.trim().replace(/\s+/g, ' ');
      const username = form.username.trim().toLowerCase();
      if (name.length < 2 || name.length > 60) throw new ApiError('Informe seu nome (2 a 60 caracteres).', 400);
      if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
        throw new ApiError('A matrícula deve ter de 3 a 30 caracteres: letras, números, ponto, hífen ou _.', 400);
      }
      if (!school.courses.includes(form.course)) throw new ApiError('Escolha seu curso na lista.', 400);
      if (!school.shifts.includes(form.shift)) throw new ApiError('Escolha seu turno.', 400);
      if (form.password.length < 8) throw new ApiError('A senha precisa ter de 8 a 128 caracteres.', 400);
      if (data.users.some((user) => user.username === username)) throw new ApiError('Essa matrícula já está cadastrada.', 409);

      const user: StoredUser = {
        id: Math.max(0, ...data.users.map((entry) => entry.id)) + 1,
        name,
        username,
        password: form.password,
        role: 'aluno',
        course: form.course,
        shift: form.shift,
      };
      data.users.push(user);
      setSession(user.id);
      return publicUser(user);
    }),

  school: () => call(() => school),

  logout: () =>
    call(() => {
      setSession(null);
      return null;
    }),

  menu: () => call((data, user) => (requireUser(user), data.menu)),

  createItem: (name: string, priceCents: number) =>
    call((data, user) => {
      requireUser(user, 'atendente');
      const clean = name.trim().replace(/\s+/g, ' ');
      checkItem(clean, priceCents);
      const base =
        clean
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'item';
      let id = base;
      for (let n = 2; data.menu.some((item) => item.id === id); n++) id = `${base}-${n}`;
      const item = { id, name: clean, priceCents, available: true };
      data.menu.push(item);
      return item;
    }),

  updateItem: (id: string, changes: Partial<Pick<MenuItem, 'name' | 'priceCents' | 'available'>>) =>
    call((data, user) => {
      requireUser(user, 'atendente');
      const item = data.menu.find((entry) => entry.id === id);
      if (!item) throw new ApiError('Item não encontrado.', 404);
      const next = { ...item, ...changes, name: (changes.name ?? item.name).trim().replace(/\s+/g, ' ') };
      checkItem(next.name, next.priceCents);
      Object.assign(item, next);
      return item;
    }),

  report: () =>
    call((data, user): Report => {
      requireUser(user, 'atendente');
      const today = data.orders.filter((order) => isToday(order.createdAt));
      const count = (status: Status) => today.filter((order) => order.status === status).length;
      const valid = today.filter((order) => order.status !== 'Cancelado').map((order) => toOrder(data, order));
      const byShift = new Map<string, number>();
      const items = new Map<string, number>();
      for (const order of valid) {
        byShift.set(order.shift ?? 'Sem turno', (byShift.get(order.shift ?? 'Sem turno') ?? 0) + 1);
        for (const item of order.items) items.set(item.name, (items.get(item.name) ?? 0) + item.quantity);
      }
      return {
        orders: count('Em preparo') + count('Pronto') + count('Entregue'),
        open: count('Em preparo') + count('Pronto'),
        delivered: count('Entregue'),
        cancelled: count('Cancelado'),
        revenueCents: today.filter((order) => order.status === 'Entregue').reduce((sum, order) => sum + order.totalCents, 0),
        byShift: [...byShift].map(([shift, orders]) => ({ shift, orders })).sort((a, b) => b.orders - a.orders),
        topItems: [...items]
          .map(([name, quantity]) => ({ name, quantity }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5),
      };
    }),

  announcement: () => call((data, user) => (requireUser(user), data.notice)),

  setAnnouncement: (text: string) =>
    call((data, user) => {
      requireUser(user, 'atendente');
      const clean = text.trim().replace(/\s+/g, ' ');
      if (clean.length > 200) throw new ApiError('O aviso pode ter até 200 caracteres.', 400);
      data.notice = clean ? { text: clean, updatedAt: new Date().toISOString() } : null;
      return data.notice;
    }),

  orders: () =>
    call((data, user) => {
      const current = requireUser(user);
      const list =
        current.role === 'atendente'
          ? [...data.orders].sort((a, b) => Number(closed.includes(a.status)) - Number(closed.includes(b.status)) || b.number - a.number)
          : data.orders.filter((order) => order.userId === current.id).sort((a, b) => b.number - a.number);
      return list.slice(0, 50).map((order) => toOrder(data, order));
    }),

  order: (number: number) =>
    call((data, user) => toOrder(data, visibleOrder(data, requireUser(user), number))),

  createOrder: (items: { id: string; quantity: number }[]) =>
    call((data, user) => {
      const current = requireUser(user, 'aluno');
      if (!items.length) throw new ApiError('Adicione pelo menos um item antes de confirmar.', 400);
      if (data.orders.some((order) => order.userId === current.id && !closed.includes(order.status))) {
        throw new ApiError('Você já tem um pedido em andamento.', 409);
      }
      const lines = items.map(({ id, quantity }) => {
        const item = data.menu.find((entry) => entry.id === id);
        if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > 5) throw new ApiError('Pedido com item inválido.', 400);
        if (!item.available) throw new ApiError(`${item.name} esgotou. Revise seu pedido.`, 409);
        return { id: item.id, name: item.name, quantity, unitPriceCents: item.priceCents };
      });
      const order: StoredOrder = {
        number: Math.max(0, ...data.orders.map((entry) => entry.number)) + 1,
        userId: current.id,
        status: 'Em preparo',
        totalCents: lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0),
        createdAt: new Date().toISOString(),
        items: lines,
      };
      data.orders.push(order);
      return toOrder(data, order);
    }),

  setStatus: (number: number, status: Status) =>
    call((data, user) => {
      const order = visibleOrder(data, requireUser(user, 'atendente'), number);
      if (order.status === 'Cancelado' && status !== 'Cancelado') throw new ApiError('Pedido cancelado não pode ser reaberto.', 409);
      if (closed.includes(order.status) && !closed.includes(status)) {
        const other = data.orders.find((entry) => entry.userId === order.userId && entry.number !== number && !closed.includes(entry.status));
        if (other) throw new ApiError('O aluno já tem outro pedido em andamento.', 409);
      }
      order.status = status;
      return toOrder(data, order);
    }),
};
