import { config } from '../config/env.js';
import { Session } from '../models/Session.js';
import { HttpError } from '../utils/httpError.js';

export const SESSION_COOKIE = 'cantina_session';

// HttpOnly: o JavaScript da página não lê o cookie (protege contra roubo por XSS).
// SameSite=Strict: o navegador não envia o cookie em requisições vindas de outros sites (protege contra CSRF).
export const sessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: config.isProduction,
  path: '/',
  maxAge: Session.maxAgeMs,
});

export function readSessionToken(req) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return value.join('=');
  }
  return null;
}

// Descobre quem está logado a partir do cookie de sessão.
export function authenticate(req, res, next) {
  const token = readSessionToken(req);
  req.user = token ? Session.findUser(token) : null;
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) throw new HttpError(401, 'Faça login para continuar.');
  next();
}

export const requireRole = (role) => (req, res, next) => {
  if (!req.user) throw new HttpError(401, 'Faça login para continuar.');
  if (req.user.role !== role) throw new HttpError(403, 'Você não tem permissão para isso.');
  next();
};
