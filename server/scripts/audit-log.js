// Mostra as últimas ações registradas: npm run auditoria
import { AuditLog } from '../models/AuditLog.js';

console.table(AuditLog.recent(Number(process.argv[2]) || 50));
