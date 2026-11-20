# Auditoria de segurança: Cantina

| | |
| --- | --- |
| **Data** | 19/11/2026 |
| **Escopo** | Servidor (`server/`), app (`App.tsx`, `src/`), configuração (`package.json`, `app.json`, `.gitignore`, `.github/workflows/`) |
| **Fora do escopo** | `node_modules/`, `dist/` (gerado), documentos de IHC em `docs/` |
| **Método** | Leitura do código seguindo o caminho de cada dado (entrada → validação → login → permissão → banco), `npm audit`, busca de segredos no Git, 29 testes automatizados da API, teste ponta a ponta no navegador (Edge) e sondagens manuais com `curl` |

**Stack instalada (lockfile):** express@5.3.0 · expo@58.0.21 · react@19.3.0 · react-dom@19.3.0 · react-native@0.88.1 · react-native-web@0.21.4 · Node 24.12 com SQLite embutido (`node:sqlite`)

**Autenticação:** própria (sessão em cookie, senha com scrypt) · **Banco:** SQLite com consultas parametrizadas, sem ORM

**Registry (informativo):** expo@58.0.26 disponível; express já está na última versão.

## 1. Resumo

| Severidade | Achados |
| --- | --- |
| 🔴 Crítico | 0 |
| 🟠 Alto | 0 |
| 🟡 Médio | 1 |
| 🔵 Baixo | 4 |
| ⚪ Informativo | 4 |
| **Total** | **9** |

- **Dependências:** 9 alertas do `npm audit`, todos nas ferramentas de build do Expo. Nenhum no servidor, nenhum no app publicado.
- **Segredos:** nenhuma credencial em arquivos do Git.
- **Falsos positivos descartados:** 7 (seção 6).

Nenhuma vulnerabilidade crítica ou alta foi confirmada. O achado médio é uma regra de negócio que precisa de decisão da escola (quem pode criar conta), não uma falha de código.

### Antes e depois

O protótipo não tinha servidor. Tudo rodava no navegador:

| Risco no protótipo | Como ficou |
| --- | --- |
| Qualquer pessoa virava atendente tocando na aba "Atendente" | Login com papel definido no servidor; o cadastro sempre cria aluno |
| Preço e total calculados no aparelho do aluno | Servidor busca o preço no banco e ignora qualquer valor enviado |
| Pedidos só na memória da aba; recarregar apagava tudo | Banco SQLite |
| Nenhum registro de quem fez o quê | Log de auditoria (`npm run auditoria`) |
| `.env` fora do `.gitignore` | `.env` e `data/` ignorados pelo Git |

## 2. Achados por categoria

### Lógica de negócio

#### 🟡 Médio: cadastro aberto permite contas e pedidos falsos

**Confiança:** alta · **Referência:** OWASP API6:2023 (Unrestricted Access to Sensitive Business Flows)

**Local:** `server/controllers/authController.js`, linha 32 · `server/routes/index.js`, linha 23

```js
const user = User.create({ name, username, passwordHash, role: 'aluno' });
```

**Risco:** qualquer pessoa com o endereço cria conta com uma matrícula inventada. Cada conta pode ter um pedido em andamento, e o limite é de 100 cadastros a cada 15 minutos por IP. Alguém mal-intencionado pode encher o painel com pedidos falsos no intervalo. A atendente não tem como cancelar: só pode marcar como "Entregue".

**Correção sugerida:**
1. Aceitar cadastro só de matrículas de uma lista fornecida pela escola (arquivo fora do Git, lido no servidor).
2. Adicionar a situação "Cancelado" para a atendente descartar pedidos falsos.

**Corrigido (19/11/2026):** com o arquivo `data/matriculas.txt`, só as matrículas da lista criam conta (resposta 403 para as demais). A atendente pode cancelar pedidos, e um pedido cancelado não pode ser reaberto. Sem o arquivo, o cadastro continua aberto e o servidor avisa ao subir. Testes: "com a lista da escola, só matrículas da lista criam conta" e "atendente cancela pedido…".

### Configuração e implantação

#### 🔵 Baixo: proteções de produção dependem de `NODE_ENV=production`

**Confiança:** média (depende de como for publicado)

**Local:** `server/config/env.js`, linhas 7 e 18 · `server/middlewares/auth.js`, linha 12

```js
secure: config.isProduction,
```

**Risco:** se o servidor for publicado sem `NODE_ENV=production`, o cookie de sessão sai sem a flag `Secure` (pode trafegar por HTTP), o HSTS não é enviado e o CORS de desenvolvimento (`http://localhost:8081`) continua liberado.

**Por que não é o padrão:** a flag `Secure` impede o teste no celular com Expo Go, que usa HTTP na rede local.

**Correção:** incluir `NODE_ENV=production` no checklist de publicação (já está no `README.md` e no `.env.example`).

#### 🔵 Baixo: limite de tentativas fica em memória e depende de `TRUST_PROXY`

**Confiança:** média

**Local:** `server/middlewares/rateLimit.js`, linha 4 · `server/app.js`, linha 15

**Risco:**
- Atrás de um proxy (Render, Railway…) sem `TRUST_PROXY`, todos os acessos parecem vir do mesmo IP. O limite de 100 tentativas por IP pode bloquear a escola inteira.
- Com `TRUST_PROXY` maior que o número real de proxies, o cabeçalho `X-Forwarded-For` pode ser falsificado para escapar do limite. Sem `TRUST_PROXY`, ele é ignorado (testado).
- Reiniciar o servidor zera os contadores.
- As rotas autenticadas (cardápio e pedidos) não têm limite próprio.

**Correção:** definir `TRUST_PROXY` com o número exato de proxies na hospedagem. Para mais de um servidor, guardar os contadores no banco.

#### 🔵 Baixo: dependências de build do Expo com alertas

Ver seção 3.

### Dados e privacidade

#### 🔵 Baixo: log de auditoria grava o usuário digitado em logins que falharam, e o IP

**Confiança:** média · **Referência:** OWASP Logging Cheat Sheet · LGPD (art. 15, término do tratamento)

**Local:** `server/controllers/authController.js`, linha 49

```js
AuditLog.record(req, 'auth.login_failed', { username }, null);
```

**Risco:** quem digita a senha no campo de usuário por engano deixa a senha gravada no log. O IP é dado pessoal e não há prazo para apagar os registros.

**Corrigido (19/11/2026):** o login que falhou grava só o id da conta, e só quando ela existe; o texto digitado não vai para o log. Registros com mais de 90 dias (`AUDIT_LOG_DAYS`) são apagados ao subir o servidor e uma vez por dia. Testes: "login que falhou não grava o que foi digitado…" e "registros antigos do log são apagados".

### Informativos

- ⚪ **Matrícula já cadastrada é revelada no cadastro** (`authController.js`, linha 30, resposta 409). Aceito: matrícula não é segredo, e o cadastro tem limite por IP. No login, a mensagem é a mesma para usuário inexistente e senha errada (testado).
- ⚪ **`node:sqlite` ainda é experimental no Node 24.** Risco operacional, não de segurança: fixar a versão do Node na hospedagem.
- ⚪ **GitHub Actions referenciadas por versão (`@v4`), não por hash do commit.** Fixar o hash protege contra uma ação comprometida.
- ⚪ **Não há troca nem recuperação de senha.** Para redefinir a senha da atendente, é preciso alterar o banco.

## 3. Dependências

Resultado de `npm audit --omit=dev`: 9 alertas (2 altos, 7 moderados).

| Pacote (instalado) | Alerta | Vem de |
| --- | --- | --- |
| zod@3.25.76 | GHSA-mrhx-c7xc-m3w5 (alto): consumo de memória ao validar coleções grandes | `expo` → `@expo/cli` |
| node-forge@1.4.2 | GHSA-6889-vf6x-f3g5, GHSA-w4xr-hqv8-ch44, GHSA-6cv4-p8m7-4r25, GHSA-j8rw-jp99-435v (moderados) | `expo` → `@expo/cli` |
| glob@13.0.6 | GHSA-3g3m-2fjr-6pw4 (moderado) | ferramentas do Expo |
| minimatch | GHSA-g3hv-75wg-m249 (moderado) | ferramentas do Expo |

**Severidade ajustada para baixa.** Esses pacotes só rodam no computador de quem desenvolve, durante `expo start` ou `expo export`, com arquivos do próprio projeto. Não fazem parte do servidor (a árvore do Express está limpa) nem do app publicado: a busca por `zod` e `node-forge` no bundle gerado retornou 0 ocorrências.

**Correção:** `npm audit fix` corrige parte sem quebrar (testado com `--dry-run`: node-forge 1.4.3, glob 13.0.7 e pacotes `@expo/*`). O restante sai ao atualizar o Expo para 58.0.26 (`npx expo install expo@~58.0.26 --fix`). Depois de atualizar, rodar `npm test` e `npm run build:web`.

O CI (`.github/workflows/verificar.yml`) barra qualquer vulnerabilidade crítica.

**Atualizado (19/11/2026):** Expo atualizado para 58.0.26 e `npm audit fix` aplicado. Restam 3 alertas moderados do `minimatch`, que vem de `expo` → `@expo/fingerprint` (ferramenta de build). A correção só existe via `npm audit fix --force`, que faz mudanças incompatíveis; fica para a próxima versão do Expo.

## 4. Segredos e exposição

✅ Nenhum segredo nos arquivos do Git. Buscas feitas: chaves Stripe/AWS/GitHub/Google, chaves privadas, strings de conexão com senha, e arquivos `.env`, `.pem`, `.key`, `credentials` no `git ls-files`.

- **`.gitignore`:** o protótipo não ignorava `.env`. Corrigido: agora ignora `.env`, `.env*.local` e `data/` (banco).
- **Senha da atendente:** não existe senha padrão no código. A conta é criada a partir de `ATTENDANT_PASSWORD` no `.env`, com mínimo de 8 caracteres.
- **App publicado:** só variáveis `EXPO_PUBLIC_*` entram no bundle. A busca por `ATTENDANT` e `DATABASE_FILE` no bundle retornou 0 ocorrências.

## 5. Controles implementados e como foram verificados

| Risco (OWASP Top 10 2021) | Controle | Onde | Verificado por |
| --- | --- | --- | --- |
| A01 Controle de acesso | Toda rota de dados exige login; ações da atendente exigem o papel `atendente` | `server/routes/index.js`, `middlewares/auth.js` | testes "rotas exigem login", "aluno não muda situação…" |
| A01 IDOR | Aluno só vê os próprios pedidos; pedido de outra pessoa responde 404 | `orderController.js` (`findVisibleOrder`) | teste "aluno não vê pedido de outro aluno" |
| A01 Mass assignment | O cadastro ignora `role` enviado pelo cliente | `authController.js`, linha 32 | teste "cadastro cria aluno…" |
| A01 CSRF | Cookie `SameSite=Strict`; escrita só aceita JSON; CORS restrito a uma lista | `middlewares/auth.js`, `middlewares/security.js` | testes "escrita sem JSON é recusada", "CORS não libera origens desconhecidas" |
| A02 Criptografia | Senha com scrypt (16 MiB, sal aleatório, comparação em tempo constante); token de sessão de 256 bits guardado como SHA-256 | `utils/password.js`, `models/Session.js` | leitura do código |
| A03 Injeção (SQL) | Todas as consultas usam parâmetros (`?`) | `server/models/*` | sondagem com `1 OR 1=1`; teste com matrícula `bia' OR 1=1` |
| A03 Injeção (XSS) | React escapa todo texto; CSP com `script-src 'self'` | `middlewares/security.js` | E2E no Edge sem violações de CSP |
| A04 Regra de negócio | Preço vem do banco; 1 a 5 unidades por item; um pedido em andamento por aluno; item esgotado é recusado | `orderController.js` | testes da seção "pedidos" |
| A05 Configuração | Cabeçalhos CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; sem `X-Powered-By`; HSTS em produção; respostas da API com `no-store`; erros sem detalhes técnicos | `middlewares/security.js`, `middlewares/errors.js` | teste "cabeçalhos de segurança"; `curl -I` |
| A05 Abuso de recursos | Corpo limitado a 10 KB; até 20 itens por pedido | `app.js`, `orderController.js` | teste "JSON malformado e corpo grande demais…" |
| A07 Autenticação | Mensagem única para senha errada e usuário inexistente, com o mesmo tempo de resposta; limite de 10 tentativas por usuário e 100 por IP a cada 15 minutos; sessão expira em 8 h; logout apaga a sessão no servidor; cookie `HttpOnly` | `authController.js`, `routes/index.js` | testes de autenticação; E2E mostrou `document.cookie` vazio |
| A09 Registro | Log de auditoria de cadastro, login (com falhas), pedido criado, mudança de situação e de disponibilidade | `models/AuditLog.js` | `npm run auditoria` |

## 6. Falsos positivos descartados

- **SQL montado com template em `server/models/Order.js`, linhas 9–13** (`${selectOrder}`): interpola uma constante do código, não dado do usuário.
- **`style-src 'unsafe-inline'` na CSP:** o react-native-web aplica estilos inline. Scripts continuam restritos ao próprio site.
- **Duas ocorrências de `eval` no bundle gerado:** código do Metro para carregar bundles divididos e um fallback para Node. Nenhuma das duas roda no navegador, e a CSP sem `unsafe-eval` foi testada no Edge sem violações.
- **Senhas em `server/tests/api.test.js`:** dados de teste com banco em memória.
- **`fetch` em `src/services/api.ts`, linha 32:** endereço fixo mais caminho montado pelo código (ids com `encodeURIComponent`). Não é SSRF.
- **`console.error(error)` em `server/middlewares/errors.js`:** só para erros inesperados, no log do servidor. Não grava senha nem token.
- **Ausência do pacote `helmet`:** os cabeçalhos equivalentes são aplicados em `middlewares/security.js` e testados. Uma dependência a menos.

## 7. Cobertura e próximos passos

**Arquivos analisados:** 36 (21 do servidor, 14 do app, `App.tsx`) e a configuração do projeto.

**Ferramentas:** leitura do código, `npm audit`, `git ls-files`, `node:test` (29 testes), Edge headless (fluxo completo de aluno e atendente) e `curl`.

**Próximos passos, por prioridade:**
1. ~~Lista de matrículas e situação "Cancelado" (achado médio).~~ Feito: falta a escola entregar o arquivo `data/matriculas.txt`.
2. Ao publicar: `NODE_ENV=production`, `TRUST_PROXY` correto e HTTPS.
3. ~~Atualizar o Expo para 58.0.26 e rodar `npm audit fix`.~~ Feito (restam 3 alertas moderados de build, ver seção 3).
4. ~~Prazo para o log de auditoria e não gravar o usuário digitado em logins que falharam.~~ Feito.

**Limitação:** auditoria feita por quem escreveu o código. Não substitui uma revisão independente nem um pentest.
