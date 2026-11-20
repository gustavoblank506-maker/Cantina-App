import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, describe, test } from 'node:test';

// Banco em memória e conta de atendente só para os testes.
process.env.DATABASE_FILE = ':memory:';
process.env.ATTENDANT_USERNAME = 'atendente';
process.env.ATTENDANT_PASSWORD = 'senha-da-atendente';
process.env.CORS_ORIGIN = '';
// Sem lista de matrículas por padrão; um teste liga a lista só para ele.
process.env.STUDENT_LIST_FILE = '';

const { createApp } = await import('../app.js');
const { seedAttendant } = await import('../config/seed.js');
const { config } = await import('../config/env.js');
const { db } = await import('../config/database.js');
const { AuditLog } = await import('../models/AuditLog.js');
const { mkdtempSync, writeFileSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');

let server;
let baseUrl;

before(async () => {
  await seedAttendant();
  server = createApp().listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

// Cliente que guarda o cookie de sessão, como o navegador faz.
function client() {
  const self = {
    cookie: '',
    async call(method, path, body, headers = {}) {
      const response = await fetch(baseUrl + path, {
        method,
        headers: {
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
          ...(self.cookie && { Cookie: self.cookie }),
          ...headers,
        },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) self.cookie = setCookie.split(';')[0];
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers, setCookie };
    },
  };
  return self;
}

const course = 'Desenvolvimento de Sistemas';
const shift = 'Noite';

async function student(username) {
  const user = client();
  const { status } = await user.call('POST', '/auth/register', {
    name: `Aluno ${username}`,
    username,
    password: 'senha-forte-123',
    course,
    shift,
  });
  assert.equal(status, 201);
  return user;
}

// Uma sessão de atendente para a suíte toda: logins repetidos esbarrariam no limite de tentativas.
let staffSession;
async function attendant() {
  if (staffSession) return staffSession;
  const user = client();
  const { status } = await user.call('POST', '/auth/login', { username: 'atendente', password: 'senha-da-atendente' });
  assert.equal(status, 200);
  staffSession = user;
  return user;
}

describe('autenticação', () => {
  test('cadastro cria aluno mesmo se o cliente pedir outro papel', async () => {
    const user = client();
    const res = await user.call('POST', '/auth/register', {
      name: 'Ana Souza',
      username: 'ana',
      password: 'senha-forte-123',
      course,
      shift,
      role: 'atendente',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'aluno');
    assert.equal(res.body.user.course, course);
    assert.equal(res.body.user.shift, shift);
    assert.equal(res.body.user.passwordHash, undefined);
  });

  test('cookie de sessão é HttpOnly e SameSite=Strict', async () => {
    const res = await client().call('POST', '/auth/login', { username: 'ana', password: 'senha-forte-123' });
    assert.equal(res.status, 200);
    assert.match(res.setCookie, /HttpOnly/);
    assert.match(res.setCookie, /SameSite=Strict/);
  });

  test('cadastro valida os campos e não repete matrícula', async () => {
    const weak = await client().call('POST', '/auth/register', { name: 'Bia', username: 'bia', password: '123', course, shift });
    assert.equal(weak.status, 400);
    const invalid = await client().call('POST', '/auth/register', { name: 'Bia', username: "bia' OR 1=1", password: 'senha-forte-123', course, shift });
    assert.equal(invalid.status, 400);
    const repeated = await client().call('POST', '/auth/register', { name: 'Outra', username: 'ANA', password: 'senha-forte-123', course, shift });
    assert.equal(repeated.status, 409);
  });

  test('cadastro só aceita curso e turno da lista da escola', async () => {
    const base = { name: 'Bia', username: 'bia', password: 'senha-forte-123' };
    for (const extra of [
      { shift },
      { course: 'Medicina', shift },
      { course: ['Química'], shift },
      { course },
      { course, shift: 'Madrugada' },
    ]) {
      const res = await client().call('POST', '/auth/register', { ...base, ...extra });
      assert.equal(res.status, 400, JSON.stringify(extra));
    }
  });

  test('a lista de cursos e turnos é pública, para o formulário de cadastro', async () => {
    const res = await client().call('GET', '/school');
    assert.equal(res.status, 200);
    assert.equal(res.body.school.name, 'SENAI Alagoinhas');
    assert.ok(res.body.school.courses.includes(course));
    assert.deepEqual(res.body.school.shifts, ['Manhã', 'Tarde', 'Noite']);
  });

  test('login errado tem a mesma resposta para senha errada e usuário inexistente', async () => {
    const wrongPassword = await client().call('POST', '/auth/login', { username: 'ana', password: 'errada-123' });
    const unknownUser = await client().call('POST', '/auth/login', { username: 'ninguem', password: 'errada-123' });
    assert.equal(wrongPassword.status, 401);
    assert.deepEqual(wrongPassword.body, unknownUser.body);
  });

  test('logout invalida a sessão no servidor', async () => {
    const user = await student('carla');
    const stolenCookie = user.cookie;
    assert.equal((await user.call('POST', '/auth/logout', {})).status, 204);
    const me = await client().call('GET', '/auth/me', undefined, { Cookie: stolenCookie });
    assert.equal(me.body.user, null);
    const reused = await client().call('GET', '/orders', undefined, { Cookie: stolenCookie });
    assert.equal(reused.status, 401);
  });

  test('bloqueia muitas tentativas de login na mesma conta', async () => {
    const attacker = client();
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await attacker.call('POST', '/auth/login', { username: 'alvo', password: `chute-${i}` })).status);
    }
    assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
    assert.equal(statuses[10], 429);
  });
});

describe('permissões', () => {
  test('rotas exigem login', async () => {
    assert.equal((await client().call('GET', '/menu')).status, 401);
    assert.equal((await client().call('GET', '/orders')).status, 401);
  });

  test('aluno não muda situação de pedido nem cardápio', async () => {
    const user = await student('davi');
    assert.equal((await user.call('PATCH', '/orders/1/status', { status: 'Entregue' })).status, 403);
    assert.equal((await user.call('PATCH', '/menu/coxinha', { available: false })).status, 403);
  });

  test('aluno não vê pedido de outro aluno', async () => {
    const owner = await student('eva');
    const other = await student('fabio');
    const { body } = await owner.call('POST', '/orders', { items: [{ id: 'agua', quantity: 1 }] });
    assert.equal((await other.call('GET', `/orders/${body.order.number}`)).status, 404);
    assert.deepEqual((await other.call('GET', '/orders')).body.orders, []);
    assert.equal((await owner.call('GET', `/orders/${body.order.number}`)).status, 200);
  });

  test('atendente não faz pedido em nome de aluno', async () => {
    const staff = await attendant();
    assert.equal((await staff.call('POST', '/orders', { items: [{ id: 'agua', quantity: 1 }] })).status, 403);
  });
});

describe('pedidos', () => {
  test('o servidor calcula o total e ignora preço enviado pelo cliente', async () => {
    const user = await student('gabi');
    const res = await user.call('POST', '/orders', { items: [{ id: 'misto', quantity: 2, price: 0.01 }], totalCents: 1 });
    assert.equal(res.status, 201);
    assert.equal(res.body.order.totalCents, 1200);
    assert.equal(res.body.order.status, 'Em preparo');
    assert.equal(res.body.order.customer, 'Aluno gabi');
    assert.equal(res.body.order.userId, undefined);
  });

  test('valida quantidade, itens e pedido vazio', async () => {
    const user = await student('heitor');
    for (const items of [[], [{ id: 'misto', quantity: 6 }], [{ id: 'misto', quantity: 1.5 }], [{ id: 'pizza', quantity: 1 }], 'tudo']) {
      assert.equal((await user.call('POST', '/orders', { items })).status, 400, JSON.stringify(items));
    }
  });

  test('aluno tem um pedido em andamento por vez', async () => {
    const user = await student('iris');
    assert.equal((await user.call('POST', '/orders', { items: [{ id: 'suco', quantity: 1 }] })).status, 201);
    assert.equal((await user.call('POST', '/orders', { items: [{ id: 'suco', quantity: 1 }] })).status, 409);
  });

  test('atendente muda a situação e o aluno acompanha', async () => {
    const user = await student('joao');
    const staff = await attendant();
    const { body } = await user.call('POST', '/orders', { items: [{ id: 'sanduiche', quantity: 1 }] });
    const number = body.order.number;

    // O painel mostra de que curso e turno vem o pedido.
    const panelOrder = (await staff.call('GET', '/orders')).body.orders.find((order) => order.number === number);
    assert.equal(panelOrder.course, course);
    assert.equal(panelOrder.shift, shift);

    assert.equal((await staff.call('PATCH', `/orders/${number}/status`, { status: 'Perdido' })).status, 400);
    assert.equal((await staff.call('PATCH', `/orders/${number}/status`, { status: 'Pronto' })).status, 200);
    assert.equal((await user.call('GET', `/orders/${number}`)).body.order.status, 'Pronto');

    await staff.call('PATCH', `/orders/${number}/status`, { status: 'Entregue' });
    assert.equal((await user.call('POST', '/orders', { items: [{ id: 'agua', quantity: 1 }] })).status, 201);
  });

  test('item esgotado não pode ser pedido', async () => {
    const user = await student('karen');
    const staff = await attendant();
    assert.equal((await staff.call('PATCH', '/menu/coxinha', { available: false })).body.item.available, false);
    const res = await user.call('POST', '/orders', { items: [{ id: 'coxinha', quantity: 1 }] });
    assert.equal(res.status, 409);
    await staff.call('PATCH', '/menu/coxinha', { available: true });
  });
});

describe('cancelamento', () => {
  test('atendente cancela pedido, o aluno pode pedir de novo e o cancelado não reabre', async () => {
    const user = await student('lia');
    const staff = await attendant();
    const first = (await user.call('POST', '/orders', { items: [{ id: 'suco', quantity: 1 }] })).body.order.number;

    assert.equal((await user.call('PATCH', `/orders/${first}/status`, { status: 'Cancelado' })).status, 403);
    assert.equal((await staff.call('PATCH', `/orders/${first}/status`, { status: 'Cancelado' })).status, 200);
    assert.equal((await user.call('GET', `/orders/${first}`)).body.order.status, 'Cancelado');
    assert.equal((await user.call('POST', '/orders', { items: [{ id: 'agua', quantity: 1 }] })).status, 201);
    assert.equal((await staff.call('PATCH', `/orders/${first}/status`, { status: 'Em preparo' })).status, 409);
  });

  test('reabrir pedido entregue não deixa o aluno com dois pedidos em andamento', async () => {
    const user = await student('mateus');
    const staff = await attendant();
    const first = (await user.call('POST', '/orders', { items: [{ id: 'suco', quantity: 1 }] })).body.order.number;
    await staff.call('PATCH', `/orders/${first}/status`, { status: 'Entregue' });
    assert.equal((await user.call('POST', '/orders', { items: [{ id: 'agua', quantity: 1 }] })).status, 201);
    assert.equal((await staff.call('PATCH', `/orders/${first}/status`, { status: 'Pronto' })).status, 409);
  });
});

describe('lista de matrículas e log', () => {
  test('com a lista da escola, só matrículas da lista criam conta', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'cantina-')), 'matriculas.txt');
    writeFileSync(file, ['# lista de teste', 'NINA2026', '', ''].join('\n'));
    config.studentListFile = file;
    try {
      const data = { name: 'Nina', password: 'senha-forte-123', course, shift };
      const outside = await client().call('POST', '/auth/register', { ...data, username: 'intrusa' });
      assert.equal(outside.status, 403);
      const listed = await client().call('POST', '/auth/register', { ...data, username: 'nina2026' });
      assert.equal(listed.status, 201);
    } finally {
      config.studentListFile = null;
    }
  });

  test('login que falhou não grava o que foi digitado no campo de usuário', async () => {
    await client().call('POST', '/auth/login', { username: 'minhasenha123', password: 'errada-123' });
    const [last] = AuditLog.recent(1);
    assert.equal(last.action, 'auth.login_failed');
    assert.equal(last.details, '{}');
    assert.equal(last.username, null);
  });

  test('registros antigos do log são apagados', async () => {
    db.prepare("INSERT INTO audit_log (action, details, created_at) VALUES ('teste.antigo', '{}', datetime('now', '-120 days'))").run();
    assert.ok(AuditLog.purgeOlderThan(90) >= 1);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'teste.antigo'").get().n, 0);
  });
});

describe('área da atendente', () => {
  test('atendente cria e edita item do cardápio; aluno não pode', async () => {
    const staff = await attendant();
    const created = await staff.call('POST', '/menu', { name: '  Pão de queijo ', priceCents: 350 });
    assert.equal(created.status, 201);
    assert.equal(created.body.item.id, 'pao-de-queijo');
    assert.equal(created.body.item.name, 'Pão de queijo');

    const edited = await staff.call('PATCH', '/menu/pao-de-queijo', { priceCents: 400 });
    assert.equal(edited.body.item.priceCents, 400);
    assert.equal(edited.body.item.name, 'Pão de queijo');

    for (const body of [{ name: 'X', priceCents: 300 }, { name: 'Bolo', priceCents: 10 }, { name: 'Bolo', priceCents: 3.5 }]) {
      assert.equal((await staff.call('POST', '/menu', body)).status, 400, JSON.stringify(body));
    }
    const user = await student('olga');
    assert.equal((await user.call('POST', '/menu', { name: 'Bolo', priceCents: 300 })).status, 403);
    assert.equal((await user.call('PATCH', '/menu/pao-de-queijo', { priceCents: 1 })).status, 403);
  });

  test('preço novo não muda pedido já feito', async () => {
    const staff = await attendant();
    const user = await student('pedro');
    const order = (await user.call('POST', '/orders', { items: [{ id: 'agua', quantity: 2 }] })).body.order;
    await staff.call('PATCH', '/menu/agua', { priceCents: 300 });
    assert.equal((await user.call('GET', `/orders/${order.number}`)).body.order.totalCents, order.totalCents);
    await staff.call('PATCH', '/menu/agua', { priceCents: 250 });
  });

  test('resumo do dia conta pedidos, faturamento entregue e turnos', async () => {
    const staff = await attendant();
    const before = (await staff.call('GET', '/reports/today')).body.report;
    const user = await student('quiteria');
    const { number } = (await user.call('POST', '/orders', { items: [{ id: 'misto', quantity: 1 }] })).body.order;
    await staff.call('PATCH', `/orders/${number}/status`, { status: 'Entregue' });

    const after = (await staff.call('GET', '/reports/today')).body.report;
    assert.equal(after.delivered, before.delivered + 1);
    assert.equal(after.revenueCents, before.revenueCents + 600);
    assert.ok(after.byShift.some((row) => row.shift === shift));
    assert.ok(after.topItems.length > 0);
    assert.equal((await user.call('GET', '/reports/today')).status, 403);
  });
});

describe('aluno e atendente separados', () => {
  test('login pelo lado errado é recusado sem abrir sessão', async () => {
    await student('rita');
    const asStaff = client();
    const wrongSide = await asStaff.call('POST', '/auth/login', { username: 'rita', password: 'senha-forte-123', as: 'atendente' });
    assert.equal(wrongSide.status, 403);
    assert.equal(wrongSide.setCookie, null);
    assert.equal((await asStaff.call('GET', '/auth/me')).body.user, null);

    const staffAsStudent = await client().call('POST', '/auth/login', { username: 'atendente', password: 'senha-da-atendente', as: 'aluno' });
    assert.equal(staffAsStudent.status, 403);
    const right = await client().call('POST', '/auth/login', { username: 'atendente', password: 'senha-da-atendente', as: 'atendente' });
    assert.equal(right.status, 200);
  });

  test('atendente publica e apaga aviso; aluno lê e não altera', async () => {
    const staff = await attendant();
    const user = await student('sara');
    assert.equal((await staff.call('PUT', '/notice', { text: '  Hoje não tem   coxinha. ' })).body.notice.text, 'Hoje não tem coxinha.');
    assert.equal((await user.call('GET', '/notice')).body.notice.text, 'Hoje não tem coxinha.');
    assert.equal((await user.call('PUT', '/notice', { text: 'Tudo grátis' })).status, 403);
    assert.equal((await staff.call('PUT', '/notice', { text: 'x'.repeat(201) })).status, 400);
    assert.equal((await staff.call('PUT', '/notice', { text: '' })).body.notice, null);
    assert.equal((await user.call('GET', '/notice')).body.notice, null);
    assert.equal((await client().call('GET', '/notice')).status, 401);
  });
});

describe('proteções gerais', () => {
  test('cabeçalhos de segurança', async () => {
    const { headers } = await client().call('GET', '/menu');
    assert.match(headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(headers.get('x-content-type-options'), 'nosniff');
    assert.equal(headers.get('x-frame-options'), 'DENY');
    assert.equal(headers.get('cache-control'), 'no-store');
    assert.equal(headers.get('x-powered-by'), null);
  });

  test('escrita sem JSON é recusada (proteção contra CSRF por formulário)', async () => {
    const user = await student('lucas');
    const res = await user.call('POST', '/orders', 'items=agua', { 'Content-Type': 'application/x-www-form-urlencoded' });
    assert.equal(res.status, 415);
  });

  test('JSON malformado e corpo grande demais não derrubam o servidor', async () => {
    const user = await student('maria');
    assert.equal((await user.call('POST', '/orders', '{"items": [')).status, 400);
    assert.equal((await user.call('POST', '/orders', JSON.stringify({ items: 'x'.repeat(20_000) }))).status, 413);
  });

  test('CORS não libera origens desconhecidas', async () => {
    const { headers } = await client().call('GET', '/menu', undefined, { Origin: 'https://site-malicioso.com' });
    assert.equal(headers.get('access-control-allow-origin'), null);
  });
});
