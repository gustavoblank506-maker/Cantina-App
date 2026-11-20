import { AuditLog } from '../models/AuditLog.js';
import { Notice } from '../models/Notice.js';
import { HttpError } from '../utils/httpError.js';

export function show(req, res) {
  res.json({ notice: Notice.get() });
}

// A atendente publica ou apaga (texto vazio) o aviso que os alunos veem no app.
export function update(req, res) {
  const { text } = req.body ?? {};
  if (typeof text !== 'string') throw new HttpError(400, 'Escreva o aviso.');
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length > 200) throw new HttpError(400, 'O aviso pode ter até 200 caracteres.');

  const notice = Notice.set(clean);
  AuditLog.record(req, notice ? 'notice.update' : 'notice.clear', {});
  res.json({ notice });
}
