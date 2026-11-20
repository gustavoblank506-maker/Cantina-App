# DESIGN.md — Cantina

**Estilo de origem:** Hyer Aviation, no Refero Styles — https://styles.refero.design/style/f61cf515-ccd5-4494-bdd1-be9fe4d7258c (consultado em 19/11/2026). Este arquivo é a fonte da verdade, não o site.

**Referências de direção (Inspora):**
- [flight-booking](https://www.inspora.design/posts/flight-booking), de Divan Raj: foto cobrindo a página, formulário num painel por cima.
- [sleep-tracking-dashboard-ui](https://www.inspora.design/posts/sleep-tracking-dashboard-ui), de Divan Raj: foto escurecida, painel sóbrio e legível.
- [fintech-landing-page](https://www.inspora.design/posts/fintech-landing-page), de Bogdan: título com serifa, tom editorial.
- [footer-section](https://www.inspora.design/posts/footer-section), de Pranav: contraste forte entre tinta e creme.

## O que foi adaptado do estilo de origem

| No Hyer | Na Cantina | Por quê |
| --- | --- | --- |
| Paleta branco, tinta azulada e argila | Bege, creme, tinta e laranja do app | A paleta atual foi mantida por decisão do projeto |
| Helvetica Now Display (paga), uma só família | Fraunces 900 na marca, DM Sans no resto (Google Fonts) | Fonte livre; a serifa dá o tom editorial escolhido na direção |
| Render 3D de um jatinho | Foto real da cantina, com pessoas | O assunto do app são os alunos no balcão |
| Corpo de texto sempre 18/29 | 18/29 em textos editoriais; 13–15 nos rótulos e campos das telas de pedido | As telas de pedido são densas e cabem num celular |

**Mantido do Hyer:** marca em escala enorme e alinhada à esquerda; frase de efeito que termina com ponto; botões em pílula; painéis sem borda e sem sombra; um único destaque quente por tela; espaço generoso.

**Decidido depois, no projeto:** painéis arredondados (28px) em vez do canto reto do Hyer; logo do SENAI só com o nome, em branco e sem fundo.

## Cores (`src/theme.ts` → `colors`)

| Token | Hex | Papel |
| --- | --- | --- |
| `ink` | `#1E1A16` | Texto principal, botões escuros, fundo atrás da foto enquanto ela carrega |
| `surface` | `#FAF5EC` | Painéis e texto sobre a foto (creme) |
| `page` | `#EADCC3` | Fundo das telas internas |
| `muted` | `#6F675C` | Texto secundário |
| `line` | `#BDB2A0` | Linhas finas e bordas de campo |
| `orange` | `#C8743C` | **Único destaque quente.** Botão principal. Não repetir em outro elemento da mesma tela |
| `error` / `errorSurface` | `#A5301F` / `#F8E1D9` | Mensagens de erro |
| `success` | `#2F6B46` | Confirmação de pedido |

Sombra sobre a foto: `ink` com transparência, em degradê (`assets/sombra-lateral.png` no computador, `assets/sombra-inferior.png` no celular). Texto creme sobre a foto só onde há essa sombra.

## Tipografia

| Papel | Fonte | Tamanho / altura da linha | Espaçamento entre letras |
| --- | --- | --- | --- |
| Marca na capa (computador) | Fraunces 900 | 132 / 132 | −2,6 |
| Marca na capa (celular) | Fraunces 900 | 64 / 64 | −1,2 |
| Frase de efeito | DM Sans 700 | 34 / 36 (celular: 24 / 28) | −0,6 |
| Título de painel | DM Sans 700 | 30 / 32 | −0,4 |
| Corpo editorial | DM Sans 400 | 18 / 29 | 0 |
| Interface (rótulos, campos, botões) | DM Sans 400–700 | 13–15 | 0 |

Títulos a partir de 23px sempre em peso 700 ou mais. Nada de pesos finos em títulos.

## Forma e espaço

- Base de 4px. Espaçamento generoso: 40–56px nas margens da capa, 24px entre colunas de passos.
- **Botões e alternadores:** pílula (`borderRadius: 999`).
- **Painéis sobre a foto:** cantos arredondados (28px), sem borda, sem sombra. O contraste vem da cor, não de elevação.
- **Linha fina:** 1px acima de cada passo, como separador.

## Componentes da capa (`src/views/LoginView.tsx`)

- **Foto de capa:** cobre a página inteira, com a sombra em degradê por cima.
- **Logo do SENAI:** só o nome, em branco com o detalhe laranja, sem fundo, no canto superior esquerdo (`assets/senai-branco.png`, 210 × 56 no computador, 150 × 40 no celular). O azul original não aparece sobre a foto escurecida.
- **Marca:** "Cantina" em escala enorme, entrando letra a letra.
- **Frase e passos:** "Sem fila no intervalo." e os três passos numerados 01, 02 e 03, cada um com uma linha fina acima.
- **Painel de acesso:** creme, arredondado, com título, alternador Entrar/Criar conta, campos e botão laranja.

## Movimento

- A marca sobe letra a letra, saindo de uma máscara. É uma adaptação do `slide-up-text` do Spell UI feita com `Animated` (`SlideUpText` em `src/components/motion.tsx`), porque os componentes do Spell UI são para React com Tailwind e não rodam em React Native.
- O resto entra com `FadeIn` curto e escalonado.
- Com "reduzir movimento" ativado no sistema, nada anima.

## Faça

- Use a foto cobrindo a página na capa, sempre com a sombra em degradê embaixo do texto.
- Termine a frase de efeito com ponto.
- Use o laranja uma vez por tela, no botão principal.

## Não faça

- Sombras em cartões ou botões.
- Brilho neon, efeito de vidro, desfoque de fundo ou degradê roxo.
- Uma segunda cor de destaque.
- Texto creme ou logo branca sobre a foto sem a sombra embaixo.
- Logo do SENAI em azul sobre a foto, ou dentro de um fundo branco.

## Telas internas

As telas internas (cardápio do aluno, acompanhamento e área da atendente) usam cartões com borda fina sobre o fundo bege. Elas seguem as cores, as fontes e os botões em pílula deste sistema, mas não a foto de capa.
