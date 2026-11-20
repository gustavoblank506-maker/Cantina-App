import { createHash, randomBytes } from 'node:crypto';
import { db } from '../config/database.js';
import { config } from '../config/env.js';

// O banco guarda só o hash do token: quem ler o banco não consegue entrar como outro usuário.
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

const insert = db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)');
const findUser = db.prepare(`
  SELECT users.id, users.name, users.username, users.role, users.course, users.shift
  FROM sessions JOIN users ON users.id = sessions.user_id
  WHERE sessions.token_hash = ? AND sessions.expires_at > ?
`);
const remove = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
const removeExpired = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');

export const Session = {
  maxAgeMs: config.sessionHours * 60 * 60 * 1000,

  create(userId) {
    removeExpired.run(Date.now());
    const token = randomBytes(32).toString('base64url');
    insert.run(hashToken(token), userId, Date.now() + this.maxAgeMs);
    return token;
  },

  findUser(token) {
    const row = findUser.get(hashToken(token), Date.now());
    return row
      ? { id: row.id, name: row.name, username: row.username, role: row.role, course: row.course, shift: row.shift }
      : null;
  },

  destroy: (token) => remove.run(hashToken(token)),
};
