import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Configuração lida das variáveis de ambiente (arquivo .env). Nada de segredo fica no código.
export const rootDir = fileURLToPath(new URL('../../', import.meta.url));

const isProduction = process.env.NODE_ENV === 'production';
const list = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);
const databaseFile = process.env.DATABASE_FILE || 'data/cantina.db';

export const config = {
  isProduction,
  port: Number(process.env.PORT) || 3000,
  databaseFile: databaseFile === ':memory:' ? databaseFile : resolve(rootDir, databaseFile),
  sessionHours: Number(process.env.SESSION_HOURS) || 8,
  // Lista de matrículas da escola (veja config/studentList.js). Vazio desliga a conferência.
  studentListFile:
    process.env.STUDENT_LIST_FILE === '' ? null : resolve(rootDir, process.env.STUDENT_LIST_FILE || 'data/matriculas.txt'),
  // Registros do log de auditoria mais antigos que isso são apagados (LGPD: guardar só pelo tempo necessário).
  auditLogDays: Number(process.env.AUDIT_LOG_DAYS) || 90,
  // Fuso da escola para o resumo do dia. Alagoinhas (BA): UTC−3.
  utcOffsetHours: Number.isInteger(Number.parseInt(process.env.UTC_OFFSET_HOURS)) ? Number.parseInt(process.env.UTC_OFFSET_HOURS) : -3,
  // Em desenvolvimento, libera o servidor do Expo (npm run web) para chamar a API.
  corsOrigins:
    process.env.CORS_ORIGIN !== undefined ? list(process.env.CORS_ORIGIN) : isProduction ? [] : ['http://localhost:8081'],
  trustProxy: Number(process.env.TRUST_PROXY) || false,
  attendant: {
    username: process.env.ATTENDANT_USERNAME?.trim().toLowerCase(),
    password: process.env.ATTENDANT_PASSWORD,
    name: process.env.ATTENDANT_NAME?.trim() || 'Atendente',
  },
};
