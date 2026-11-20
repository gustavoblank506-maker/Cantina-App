import { User } from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import { config } from './env.js';

// Cria a conta da atendente a partir do .env. Não existe senha padrão no código.
export async function seedAttendant() {
  const { username, password, name } = config.attendant;
  if (!username || !password) {
    if (!User.hasRole('atendente')) {
      console.warn('Aviso: não há conta de atendente. Defina ATTENDANT_USERNAME e ATTENDANT_PASSWORD no .env.');
    }
    return;
  }
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw new Error('ATTENDANT_USERNAME inválido (3 a 30 letras, números, . _ -).');
  if (password.length < 8) throw new Error('ATTENDANT_PASSWORD precisa ter pelo menos 8 caracteres.');
  if (User.findByUsername(username)) return;

  User.create({ name, username, passwordHash: await hashPassword(password), role: 'atendente' });
  console.log(`Conta de atendente "${username}" criada.`);
}
