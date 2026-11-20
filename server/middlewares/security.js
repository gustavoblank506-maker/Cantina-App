import { config } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  // O react-native-web aplica estilos inline em tempo de execução.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function securityHeaders(req, res, next) {
  res.set({
    'Content-Security-Policy': contentSecurityPolicy,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (config.isProduction) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

// Respostas da API têm dados pessoais: não devem ficar guardadas em cache.
export function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

// Só as origens da lista (o Expo em desenvolvimento) podem chamar a API de outro endereço.
export function cors(req, res, next) {
  const origin = req.headers.origin;
  if (origin && config.corsOrigins.includes(origin)) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    });
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

// Toda escrita precisa vir como JSON. Formulários de outros sites não conseguem enviar JSON
// sem passar pelo CORS, o que reforça a proteção contra CSRF.
export function requireJson(req, res, next) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !req.is('application/json')) {
    throw new HttpError(415, 'Envie os dados em JSON.');
  }
  next();
}
