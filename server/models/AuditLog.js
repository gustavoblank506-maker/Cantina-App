import { db } from '../config/database.js';

const insert = db.prepare('INSERT INTO audit_log (user_id, action, details, ip) VALUES (?, ?, ?, ?)');
const recent = db.prepare(`
  SELECT audit_log.created_at, audit_log.action, audit_log.details, audit_log.ip, users.username
  FROM audit_log LEFT JOIN users ON users.id = audit_log.user_id
  ORDER BY audit_log.id DESC LIMIT ?
`);

const purge = db.prepare("DELETE FROM audit_log WHERE created_at < datetime('now', ?)");

// Registro de quem fez o quê: logins, cadastros, pedidos e mudanças feitas pela atendente.
export const AuditLog = {
  record(req, action, details = {}, userId = req.user?.id ?? null) {
    insert.run(userId, action, JSON.stringify(details), req.ip ?? null);
  },

  recent: (limit = 50) => recent.all(limit),

  /** Apaga registros mais antigos que `days` dias. Devolve quantos foram apagados. */
  purgeOlderThan: (days) => Number(purge.run(`-${days} days`).changes),
};
