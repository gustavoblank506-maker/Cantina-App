import { Platform } from 'react-native';
import type { Announcement, MenuItem, Order, Report, Role, School, Status, User } from '../types';

import { demoApi } from './demo';
import { ApiError } from './errors';

export { ApiError, errorMessage } from './errors';

/** Build de demonstração (GitHub Pages): sem servidor, os dados ficam no navegador. */
export const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';

// No navegador, o app é servido pelo próprio servidor (mesmo endereço).
// Em desenvolvimento, o Expo roda na porta 8081 e a API na 3000.
// No celular (Expo Go), defina EXPO_PUBLIC_API_URL com o IP do computador.
function apiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (Platform.OS === 'web') return __DEV__ ? `${window.location.protocol}//${window.location.hostname}:3000` : '';
  return 'http://localhost:3000';
}

const baseUrl = `${apiUrl()}/api`;

let onUnauthorized = () => {};
/** Chamado quando a sessão expira no meio do uso. */
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

async function request<T>(method: string, path: string, body?: unknown, { quiet401 = false } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(baseUrl + path, {
      method,
      // Envia o cookie de sessão (HttpOnly: o JavaScript não consegue lê-lo).
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Sem conexão com o servidor. Tente de novo.', 0);
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !quiet401) onUnauthorized();
    throw new ApiError(data?.error ?? 'Algo deu errado. Tente de novo.', response.status);
  }
  return data as T;
}

const serverApi = {
  me: () => request<{ user: User | null }>('GET', '/auth/me').then((data) => data.user),

  /** `as`: lado escolhido na tela (aluno ou atendente). O servidor recusa se a conta for do outro lado. */
  login: (username: string, password: string, as: Role) =>
    request<{ user: User }>('POST', '/auth/login', { username, password, as }, { quiet401: true }).then((data) => data.user),

  announcement: () =>
    request<{ notice: Announcement | null }>('GET', '/notice').then((data) => data.notice),

  setAnnouncement: (text: string) =>
    request<{ notice: Announcement | null }>('PUT', '/notice', { text }).then((data) => data.notice),

  register: (data: { name: string; username: string; password: string; course: string; shift: string }) =>
    request<{ user: User }>('POST', '/auth/register', data, { quiet401: true }).then((result) => result.user),

  school: () => request<{ school: School }>('GET', '/school', undefined, { quiet401: true }).then((data) => data.school),

  logout: () => request<null>('POST', '/auth/logout', {}, { quiet401: true }),

  menu: () => request<{ items: MenuItem[] }>('GET', '/menu').then((data) => data.items),

  createItem: (name: string, priceCents: number) =>
    request<{ item: MenuItem }>('POST', '/menu', { name, priceCents }).then((data) => data.item),

  updateItem: (id: string, changes: Partial<Pick<MenuItem, 'name' | 'priceCents' | 'available'>>) =>
    request<{ item: MenuItem }>('PATCH', `/menu/${encodeURIComponent(id)}`, changes).then((data) => data.item),

  report: () => request<{ report: Report }>('GET', '/reports/today').then((data) => data.report),

  orders: () => request<{ orders: Order[] }>('GET', '/orders').then((data) => data.orders),

  order: (number: number) => request<{ order: Order }>('GET', `/orders/${number}`).then((data) => data.order),

  createOrder: (items: { id: string; quantity: number }[]) =>
    request<{ order: Order }>('POST', '/orders', { items }).then((data) => data.order),

  setStatus: (number: number, status: Status) =>
    request<{ order: Order }>('PATCH', `/orders/${number}/status`, { status }).then((data) => data.order),
};

export const api: typeof serverApi = DEMO ? demoApi : serverApi;
