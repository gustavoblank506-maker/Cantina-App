import { school } from '../config/school.js';
import { readStudentList } from '../config/studentList.js';
import { readSessionToken, SESSION_COOKIE, sessionCookieOptions } from '../middlewares/auth.js';
import { AuditLog } from '../models/AuditLog.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { hashPassword, placeholderHash, verifyPassword } from '../utils/password.js';

const usernamePattern = /^[a-z0-9._-]{3,30}$/;

function startSession(req, res, user) {
  const previous = readSessionToken(req);
  if (previous) Session.destroy(previous);
  res.cookie(SESSION_COOKIE, Session.create(user.id), sessionCookieOptions());
}

export async function register(req, res) {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const course = req.body?.course;
  const shift = req.body?.shift;

  if (name.length < 2 || name.length > 60) throw new HttpError(400, 'Informe seu nome (2 a 60 caracteres).');
  if (!usernamePattern.test(username)) {
    throw new HttpError(400, 'A matrícula deve ter de 3 a 30 caracteres: letras, números, ponto, hífen ou _.');
  }
  const enrolled = readStudentList();
  if (enrolled && !enrolled.has(username)) {
    throw new HttpError(403, 'Matrícula não encontrada na lista da escola. Procure a secretaria do SENAI.');
  }
  // Só valores da lista da escola: nada de texto livre gravado no banco.
  if (!school.courses.includes(course)) throw new HttpError(400, 'Escolha seu curso na lista.');
  if (!school.shifts.includes(shift)) throw new HttpError(400, 'Escolha seu turno.');
  if (password.length < 8 || password.length > 128) {
    throw new HttpError(400, 'A senha precisa ter de 8 a 128 caracteres.');
  }

  const passwordHash = await hashPassword(password);
  if (User.findByUsername(username)) throw new HttpError(409, 'Essa matrícula já está cadastrada.');
  // O perfil é sempre "aluno": o cliente não escolhe o próprio papel.
  const user = User.create({ name, username, passwordHash, role: 'aluno', course, shift });

  AuditLog.record(req, 'auth.register', {}, user.id);
  startSession(req, res, user);
  res.status(201).json({ user: User.toPublic(user) });
}

export async function login(req, res) {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!username || !password || username.length > 30 || password.length > 128) {
    throw new HttpError(400, 'Informe usuário e senha.');
  }

  const user = User.findByUsername(username);
  const valid = await verifyPassword(password, user?.passwordHash ?? placeholderHash);
  if (!user || !valid) {
    // Grava a conta só se ela existir: o que foi digitado pode ser a senha no campo errado.
    AuditLog.record(req, 'auth.login_failed', {}, user?.id ?? null);
    // Mesma mensagem para usuário inexistente e senha errada.
    throw new HttpError(401, 'Usuário ou senha inválidos.');
  }

  // A tela tem um lado para aluno e outro para atendente. Senha certa, lado errado: avisa e não abre sessão.
  const side = req.body?.as;
  if ((side === 'aluno' || side === 'atendente') && user.role !== side) {
    throw new HttpError(
      403,
      user.role === 'atendente' ? 'Esta é uma conta da cantina. Use a opção Atendente.' : 'Esta é uma conta de aluno. Use a opção Aluno.',
    );
  }

  AuditLog.record(req, 'auth.login', {}, user.id);
  startSession(req, res, user);
  res.json({ user: User.toPublic(user) });
}

export function logout(req, res) {
  const token = readSessionToken(req);
  if (token) Session.destroy(token);
  const { maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE, options);
  res.sendStatus(204);
}

// Escola, cursos e turnos que o formulário de cadastro mostra. Público: o aluno ainda não entrou.
export function schoolOptions(req, res) {
  res.json({ school });
}

// Diz quem está logado. Sem sessão, responde user: null (não é erro: o app só está abrindo).
export function me(req, res) {
  res.json({ user: req.user ? User.toPublic(req.user) : null });
}
