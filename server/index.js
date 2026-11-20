import { createApp } from './app.js';
import { config } from './config/env.js';
import { seedAttendant } from './config/seed.js';
import { readStudentList } from './config/studentList.js';
import { AuditLog } from './models/AuditLog.js';

await seedAttendant();

if (!readStudentList()) {
  console.warn('Aviso: sem a lista de matrículas (data/matriculas.txt), qualquer pessoa pode criar conta de aluno.');
}

// Apaga o log de auditoria antigo ao subir e depois uma vez por dia.
const purgeAuditLog = () => AuditLog.purgeOlderThan(config.auditLogDays);
purgeAuditLog();
setInterval(purgeAuditLog, 24 * 60 * 60 * 1000).unref();

createApp().listen(config.port, () => {
  console.log(`Cantina rodando em http://localhost:${config.port}`);
});
