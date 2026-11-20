import { db } from '../config/database.js';

const read = db.prepare("SELECT value, updated_at FROM settings WHERE key = 'aviso'");
const write = db.prepare(`
  INSERT INTO settings (key, value) VALUES ('aviso', ?)
  ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
`);
const remove = db.prepare("DELETE FROM settings WHERE key = 'aviso'");

/** Aviso da cantina para os alunos (um por vez). */
export const Notice = {
  get() {
    const row = read.get();
    return row ? { text: row.value, updatedAt: row.updated_at } : null;
  },

  /** Texto vazio apaga o aviso. */
  set(text) {
    if (text) write.run(text);
    else remove.run();
    return this.get();
  },
};
