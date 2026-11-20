import { db } from '../config/database.js';

const toUser = (row) =>
  row && {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    course: row.course,
    shift: row.shift,
    passwordHash: row.password_hash,
  };

const byUsername = db.prepare('SELECT * FROM users WHERE username = ?');
const byRole = db.prepare('SELECT 1 FROM users WHERE role = ? LIMIT 1');
const insert = db.prepare('INSERT INTO users (name, username, password_hash, role, course, shift) VALUES (?, ?, ?, ?, ?, ?)');

export const User = {
  findByUsername: (username) => toUser(byUsername.get(username)),

  hasRole: (role) => Boolean(byRole.get(role)),

  create({ name, username, passwordHash, role, course = null, shift = null }) {
    const { lastInsertRowid } = insert.run(name, username, passwordHash, role, course, shift);
    return { id: Number(lastInsertRowid), name, username, role, course, shift };
  },

  // Só os campos que podem sair na resposta da API (nunca o hash da senha).
  toPublic: ({ id, name, username, role, course = null, shift = null }) => ({ id, name, username, role, course, shift }),
};
