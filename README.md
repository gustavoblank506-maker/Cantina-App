# Cantina-App

Aplicativo da cantina do **SENAI Alagoinhas**: o aluno faz o pedido pelo celular ou pelo computador, acompanha a situação e retira no balcão.

Na tela inicial, a pessoa escolhe o lado: **Aluno** ou **Atendente**.

- **Aluno (faz o pedido):** entra ou cria conta com nome, matrícula, curso e turno; monta o pedido; acompanha até ficar pronto; vê o aviso da cantina.
- **Atendente (gerencia e informa):** só entra, sem cadastro (a conta vem do `.env`). Recebe os pedidos por situação, com curso e turno de quem pediu e filtro por turno; marca Pronto, Entregue ou Cancelado; gerencia o cardápio (criar item, mudar nome e preço, marcar esgotado); publica avisos para os alunos; e vê o resumo do dia (pedidos, faturamento, turnos e itens mais pedidos).

Uma conta de aluno não entra pelo lado da atendente, nem o contrário: o servidor confere.

## Publicar (link para os usuários)

[![Publicar no Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/gustavoblank506-maker/Cantina-App)

O botão usa o [render.yaml](render.yaml): entre com o GitHub, escolha a senha da atendente e confirme. O link fica no formato `https://cantina-senai-alagoinhas.onrender.com`. No plano gratuito, contas e pedidos zeram quando o serviço reinicia (depois de 15 minutos sem uso), e a primeira abertura depois disso leva cerca de 1 minuto.

## Como rodar

Precisa do **Node.js 22.13 ou mais novo** (recomendado: 24).

```bash
npm install
cp .env.example .env      # no Windows: copy .env.example .env
```

Abra o `.env` e escolha uma senha para a atendente em `ATTENDANT_PASSWORD` (mínimo 8 caracteres). Depois:

```bash
npm run build:web   # gera o app web
npm start           # sobe o servidor
```

Acesse http://localhost:3000.

- **Aluno:** toque em "Criar conta".
- **Atendente:** entre com o usuário e a senha do `.env`.

### Lista de matrículas

Para só alunos da escola conseguirem criar conta, crie o arquivo `data/matriculas.txt` com uma matrícula por linha (linhas com `#` são comentários). O arquivo fica fora do Git e é relido a cada cadastro, então a secretaria pode atualizá-lo sem reiniciar o servidor. Sem ele, o cadastro fica aberto e o servidor avisa ao subir.

Os cursos e turnos do cadastro ficam em `server/config/school.js`. A lista atual é a dos cursos técnicos do SENAI Alagoinhas no 2º semestre de 2026; confira com a secretaria a cada edital.

Para ver os dois ao mesmo tempo, abra a atendente numa janela anônima.

O layout se adapta à tela:
- **Celular:** o app ocupa a tela toda.
- **Tablet:** aparece numa moldura de celular.
- **Computador (a partir de 900px):** layout em colunas. O aluno vê o cardápio em grade com o pedido ao lado. A atendente vê os pedidos separados por situação.

### Desenvolvimento

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor que reinicia ao salvar |
| `npm run web` | App no navegador com recarga automática (porta 8081, chama a API na 3000) |
| `npm run app` | App no celular com Expo Go (veja o `.env.example` para apontar o IP do computador) |
| `npm test` | Testes da API, incluindo os de segurança |
| `npm run typecheck` | Checagem de tipos do app |
| `npm run auditoria` | Últimas ações registradas: logins, pedidos, mudanças da atendente |

## Estrutura (MVC)

```
server/                 API em Node.js + Express
├── models/             M: acesso ao banco (usuários, sessões, cardápio, pedidos, auditoria)
├── controllers/        C: regras e validação de cada ação
├── routes/             liga cada endereço da API ao seu controller e às permissões
├── middlewares/        login, permissões, limite de tentativas, cabeçalhos de segurança, erros
├── config/             variáveis de ambiente, banco SQLite e conta da atendente
└── tests/              testes automatizados da API

src/                    V: app Expo (React Native), roda no celular e no navegador
├── views/              telas: login, cardápio, revisão, acompanhamento, painel e pedido (computador)
├── components/         botões, campos, animações, grade, peças de cardápio e pedido
├── services/api.ts     comunicação com a API
└── hooks/              layout (celular ou computador), atualização automática e mensagens

App.tsx                 abre a tela certa conforme quem está logado
data/                   banco SQLite (criado ao rodar, fora do Git)
```

### API

| Método e rota | Quem pode | O que faz |
| --- | --- | --- |
| `GET /api/school` | qualquer pessoa | escola, cursos e turnos do cadastro |
| `POST /api/auth/register` | qualquer pessoa | cria conta de aluno (nome, matrícula, curso, turno, senha) |
| `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` | qualquer pessoa | sessão |
| `GET /api/menu` | logado | cardápio |
| `POST /api/menu` | atendente | cria item |
| `PATCH /api/menu/:id` | atendente | muda nome, preço ou disponibilidade |
| `GET /api/reports/today` | atendente | resumo do dia |
| `GET /api/notice` | logado | aviso da cantina |
| `PUT /api/notice` | atendente | publica o aviso (texto vazio apaga) |
| `GET /api/orders` | logado | aluno: os seus pedidos · atendente: todos |
| `GET /api/orders/:id` | dono ou atendente | um pedido |
| `POST /api/orders` | aluno | faz pedido (o preço é calculado no servidor) |
| `PATCH /api/orders/:id/status` | atendente | muda a situação (Em preparo, Pronto, Entregue, Cancelado) |

## Segurança

Resumo do que foi feito e do que ainda falta: [docs/auditoria-de-seguranca.md](docs/auditoria-de-seguranca.md).

Ao publicar na internet, defina na hospedagem:
- `NODE_ENV=production`
- `ATTENDANT_USERNAME` e `ATTENDANT_PASSWORD`
- `TRUST_PROXY` (se houver proxy na frente)

Use HTTPS.

## Protótipo de IHC

A versão de protótipo, sem servidor e com aluno e atendente lado a lado, continua em https://gustavoblank506-maker.github.io/Cantina-App/

Documentação da atividade: [docs/portfolio-ihc.md](docs/portfolio-ihc.md)
