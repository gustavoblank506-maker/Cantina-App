import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
// Parâmetros de 16 MiB recomendados pela OWASP para scrypt.
const params = { N: 2 ** 14, r: 8, p: 5 };
const keyLength = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, keyLength, params);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored).split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = await scryptAsync(password, Buffer.from(salt, 'hex'), expected.length, params);
  return timingSafeEqual(actual, expected);
}

// Usado quando o usuário não existe: o login leva o mesmo tempo e não revela quais contas existem.
export const placeholderHash = `scrypt$${'00'.repeat(16)}$${'00'.repeat(keyLength)}`;
