# Plano de Desenvolvimento — Kustho

Oct 17, 2026 · @Matheux

> Este é o plano (visão, regras e fases). O andamento fica em [`fase-1.md`](fase-1.md),
> [`fase-2.md`](fase-2.md) e [`fase-3.md`](fase-3.md); o índice da documentação, em [`README.md`](README.md).

## Visão do produto

O Kustho é um gerenciador financeiro Android-first que nasce como um controle manual completo (contas, cartões, entradas e saídas) e evolui para captura automática por notificações. O Open Finance só entra depois que um spike provar que vale o investimento.

&#91;embedded content: roteiro · 6 fases, 5 portões\]

Cada fase fecha num portão medido no uso real; a Fase 5 só começa se o spike da Fase 4 aprovar.

**Para quem:** pessoas que usam dois ou mais bancos digitais e desistem de apps de finanças porque lançar tudo à mão cansa.

**Princípios de produto**

- **O núcleo manual é o produto.** Cada fase entrega um app usável sozinho; a automação acelera o registro, não o substitui.
- **Automação sugere, o usuário confirma.** Tudo que vem de notificação ou Open Finance entra numa caixa de pendentes antes de mexer no saldo.
- **Lançar um gasto em menos de 5 segundos.** É a meta de UX que guia o formulário principal.
- **Offline-first.** Tudo funciona sem internet e os dados ficam no aparelho até existir backend.
- **Acabamento visível.** Tema claro e escuro, animações curtas, números legíveis e layout que se adapta de celulares compactos a tablets e dobráveis.

**Referências de mercado**

| App | O que observar |
| --- | --- |
| Mobills e Organizze | Fluxo de lançamento, faturas de cartão, categorias |
| Meu Dinheiro | Caixa de notificações capturadas e revisão em lote |
| App do Nubank | Hierarquia visual de saldo e fatura, simplicidade |
| Copilot Money | Acabamento, microinterações, gráficos |

**Fora do escopo inicial:** investimentos, publicação na Play Store, orçamento compartilhado, versão web e captura no iOS (o iPhone entra só com lançamento manual e, depois, Open Finance).

## Stack e arquitetura

React Native com Expo em modo prebuild (CNG), TypeScript estrito e SQLite local como fonte de verdade. O Kotlin aparece só no módulo de captura, e um backend só entra na fase de Open Finance.

&#91;embedded content: arquitetura · app local e backend condicional\]

O Kotlin só lê e guarda notificações; toda interpretação acontece em TypeScript, e as caixas tracejadas só existem se a Fase 5 for aprovada.

**Fluxo em texto** (para quem lê o plano exportado, sem os diagramas)

1. Os apps dos bancos postam notificações no Android.
2. `BankListener` (Kotlin) recebe só as dos pacotes permitidos e grava a versão crua no `RawStore` (SQLite próprio do módulo).
3. Ao abrir o app, ou pelo evento `onCaptured`, o domínio em TypeScript lê as pendentes pela ponte, roda os parsers e cria `captures` no SQLite do app.
4. As telas leem e escrevem só pelo domínio; o SQLite do app (Drizzle) é a fonte de verdade.
5. Fase 5 (condicional): o SQLite sincroniza com o backend (Fastify + Postgres + Better Auth), que conversa com a Pluggy e, por ela, com os bancos via Open Finance.

| Camada | Escolha | Por quê |
| --- | --- | --- |
| App | Expo + React Native, TypeScript `strict` | Um código para Android e iOS, ecossistema maduro |
| Build | `expo-dev-client` + EAS Build (ou `npx expo run:android`) | Necessário para módulo nativo; Expo Go não serve |
| Navegação | Expo Router: abas + pilhas + modais | Rotas por arquivo, deep links de graça |
| Estilo | NativeWind (Tailwind) sobre tokens próprios | Velocidade com consistência; tema claro/escuro |
| Animação e gestos | Reanimated + Gesture Handler | Animações a 60 fps fora da thread JS |
| Listas e sheets | FlashList + `@gorhom/bottom-sheet` | Listas longas fluidas, formulários em sheet |
| Gráficos | `victory-native` (Skia) | Gráficos animados e nativos |
| Banco local | `expo-sqlite` + Drizzle ORM | Migrações versionadas, tipos, consultas reativas (`useLiveQuery`) |
| Estado de UI | Zustand | Filtros, mês selecionado, preferências |
| Formulários | `react-hook-form` + `zod` | Validação tipada e reaproveitável |
| Captura (Fase 2) | Módulo Expo local em Kotlin | `NotificationListenerService` grava notificações cruas |
| Backend (Fase 5) | Node (Fastify) + Postgres + Better Auth + `pluggy-sdk` | Guarda segredos, autentica usuários, recebe webhooks |
| Qualidade | Jest, RN Testing Library, Maestro, ESLint, GitHub Actions | Testes por camada e CI desde o início |

**Convenções que valem desde o dia 1**

- Dinheiro sempre em **centavos inteiros** (`amount_cents`); nunca `float`. Formatação com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Datas em ISO (`YYYY-MM-DD` para competência, timestamp para criação).
- Regras de negócio em funções puras dentro de `src/domain`, testadas sem React.
- Exclusão lógica (`deleted_at`) para permitir desfazer e, no futuro, sincronizar.

**Detalhes que o código deve seguir**

- IDs: UUID v4 gerado no aparelho (`expo-crypto`), para a sincronização futura não exigir reescrita.
- Datas de lançamento: string local `YYYY-MM-DD` no fuso do aparelho; nunca converter para UTC antes de calcular fatura ou agrupar por dia.
- Moeda única: BRL. Idioma único: pt-BR, com textos da interface centralizados em `src/lib/strings.ts`.
- Ícones: `lucide-react-native`. Fonte: Inter via `@expo-google-fonts/inter`. Vibração: `expo-haptics`.
- Instituições: os 20 bancos mais usados aparecem com o logo oficial num círculo padronizado (catálogo em `src/ui/banks/`); as demais, com cor e iniciais escolhidas pelo usuário. *Decisão revista em out/2026: antes eram só iniciais.*
- Gerenciador de pacotes único para o grupo (sugestão: `pnpm`) e versão do Node fixada em `.nvmrc`.
- Expo: a versão estável mais recente no dia do `create-expo-app`, fixada e atualizada só em conjunto.

**Estrutura de pastas**

```
app/                          # rotas (Expo Router)
  (tabs)/index.tsx            # Início
  (tabs)/lancamentos.tsx
  (tabs)/cartoes.tsx
  (tabs)/mais.tsx
  lancamento/[id].tsx         # editar
  lancamento/novo.tsx         # sheet de novo lançamento
  dev/ui.tsx                  # catálogo de componentes (só debug)
src/
  db/        schema.ts, migrations/, client.ts, seed.ts
  domain/    accounts/, cards/, invoices/, transactions/, categories/
  features/  telas compostas por domínio
  ui/        tokens.ts, theme.ts, components/
  lib/       money.ts, dates.ts
modules/
  notification-capture/       # Fase 2 (Kotlin + ponte TS)
```

## Design system e UX

O visual é calmo e confiável: base neutra, verde como cor de marca, um verde semântico diferente para entradas e vermelho só para saídas, e números com dígitos tabulares. Tema claro e escuro existem desde a Fase 0.

**Tokens**

| Token | Valores | Regra |
| --- | --- | --- |
| Cor neutra | `bg`, `surface`, `surface-raised`, `border`, `text`, `text-muted` | Toda tela é montada só com esses tons |
| Marca | Verde-petróleo: #0F766E no tema claro, #2DD4BF no escuro | Botão principal, aba ativa, foco |
| Semântica | `income` (#15803D claro, #4ADE80 escuro; o #16A34A original não passava AA no claro), `expense` (#DC2626 claro, #F87171 escuro), `warning`, `info` | O verde de entradas precisa ter tom distinto do verde da marca e sempre vem com sinal + ou ícone; vermelho só em saídas |
| Cor de conta/cartão | Paleta de 10 cores escolhidas pelo usuário | Identifica origem em listas e gráficos |
| Tipografia | Inter; escala 12 / 14 / 16 / 20 / 28 / 36 | 36 só para o saldo; valores com `tabular-nums` |
| Espaçamento | Grade de 4: 4, 8, 12, 16, 24, 32 | Nada fora da grade |
| Raio | 8 (inputs), 12 (cards), 20 (sheets) |  |
| Movimento | 150–250 ms, springs | Respeitar a opção de reduzir movimento do sistema |

**Responsividade**

- Três faixas de largura (em dp): compacta `< 360`, padrão `360–599`, expandida `≥ 600`.
- Na faixa expandida (tablet, dobrável aberto), listas viram **lista + detalhe** lado a lado.
- Layout lido de `useWindowDimensions`, nunca de tamanhos fixos; safe areas em todas as telas.
- O app precisa funcionar com fonte do sistema em 130% sem cortar valores.
- Alvos de toque de no mínimo 44 dp e contraste AA nos dois temas.

**Componentes base**

| Componente | Onde aparece | Acabamento esperado |
| --- | --- | --- |
| `MoneyText` | Todo valor | Sinal, cor semântica, modo "ocultar valores" |
| `AmountKeypad` | Novo lançamento | Teclado próprio em centavos (digitar 4590 vira R$ 45,90), vibração leve |
| `BalanceHeader` | Início | Saldo total grande, olho para ocultar, variação do mês |
| `AccountCard` | Início, Contas | Ícone e cor da instituição, saldo |
| `CreditCardVisual` | Cartões | Cartão estilizado, barra de limite usado, fatura atual e vencimento |
| `TransactionRow` | Listas | Ícone da categoria, descrição, origem, valor; deslizar para editar/excluir |
| `CategoryPicker` | Lançamento, filtros | Grade de ícones coloridos, busca |
| `MonthSwitcher` | Listas, relatórios | Troca de mês por toque e gesto |
| `EmptyState`, `Skeleton`, `UndoToast` | Todas as telas | Nunca uma tela em branco; toda exclusão pode ser desfeita |
| Gráficos | Início, Relatórios | Rosca por categoria; barras receitas × despesas |

**Telas da Fase 1**

1. **Início:** saldo total, cartões com fatura atual, resumo do mês, últimos lançamentos.
2. **Lançamentos:** lista do mês agrupada por dia, filtros e busca.
3. **Cartões:** cartões, fatura aberta, faturas anteriores e pagamento.
4. **Mais:** categorias, leitura de notificações, exportar dados, configurações.
5. **Novo lançamento:** sheet aberto pelo botão central, com valor, descrição e origem visíveis de cara; o resto fica em "mais opções".

A Fase 2 acrescenta a aba **Pendentes**, com selo de contagem. Para o botão + continuar no
centro, **Contas** saiu do Mais e virou aba (out/2026). A barra mostra só ícones (os nomes
ficam no rótulo de acessibilidade): Início, Lançamentos, Pendentes | + | Cartões, Contas, Mais.

## Modelo de dados e regras

O saldo de uma conta é sempre calculado a partir das transações, nunca guardado. Compras no cartão não tocam nenhuma conta: entram na fatura, e só o pagamento da fatura debita a conta.

**Tabelas da Fase 1**

| Tabela | Campos principais |
| --- | --- |
| `accounts` | `id`, `name`, `type` (corrente, poupança, carteira digital, dinheiro), `institution`, `color`, `icon`, `initial_balance_cents`, `archived_at` |
| `credit_cards` | `id`, `name`, `institution`, `color`, `limit_cents`, `closing_day`, `due_day`, `payment_account_id`, `archived_at` |
| `categories` | `id`, `name`, `kind` (despesa ou receita), `icon`, `color`, `parent_id` |
| `invoices` | `id`, `card_id`, `reference_month` (`YYYY-MM`), `closing_date`, `due_date`, `status` (aberta, fechada, paga, parcial) |
| `transactions` | `id`, `kind`, `amount_cents` (sempre positivo), `date`, `description`, `category_id`, `account_id?`, `card_id?`, `invoice_id?`, `transfer_peer_id?`, `installment_group_id?`, `installment_number?`, `installment_total?`, `status`, `source`, `notes`, `created_at`, `updated_at`, `deleted_at` |

- `kind`: `income`, `expense`, `transfer`, `card_purchase`, `invoice_payment`, `adjustment`.
- `status`: `posted` (efetivada), `scheduled` (futura), `pending` (aguardando confirmação, usado a partir da Fase 2).
- `source`: `manual`, `notification`, `open_finance`. Já existe na Fase 1 para não precisar migrar depois.

**Tabelas que entram depois**

| Fase | Tabela | Para quê |
| --- | --- | --- |
| 2 | `captures` | Sugestão extraída de uma notificação: valor, estabelecimento, data, tipo provável, conta ou cartão provável, confiança, status, `transaction_id` |
| 3 | `merchant_rules` | Estabelecimento → categoria e origem aprendidas a partir das confirmações |
| 5 | `external_accounts`, `external_transactions` | Espelho dos dados do Open Finance e vínculo com transações locais |

**Regras de negócio** (todas em funções puras com testes)

1. **Saldo da conta** = saldo inicial + receitas − despesas ± transferências − pagamentos de fatura, considerando só `posted` e não excluídas.
2. **Saldo total** = soma das contas não arquivadas. Cartões não entram; a Início mostra a fatura atual separada.
3. **Fatura de uma compra:** se a data da compra é anterior à data de fechamento do mês, entra na fatura daquele mês; caso contrário, na seguinte.
4. **Parcelamento:** uma compra em N vezes gera N transações ligadas por `installment_group_id`, uma em cada fatura seguinte. O resto da divisão em centavos vai na primeira parcela (R$ 100,00 em 3x = 33,34 + 33,33 + 33,33).
5. **Limite disponível** = limite − soma de todas as faturas não pagas, incluindo parcelas futuras.
6. **Pagamento de fatura:** uma transação `invoice_payment` que debita a conta escolhida; pagamento parcial deixa a fatura como `partial` e o restante visível.
7. **Transferência:** duas pernas ligadas por `transfer_peer_id`; não conta como receita nem despesa em relatórios.
8. **Ajuste de saldo:** quando o usuário corrige o saldo de uma conta, o app cria uma transação `adjustment` com a diferença, preservando o histórico.
   O mesmo vale para a **fatura atual do cartão** (ao criar ou editar o cartão): o valor a pagar informado (total − pago) vira um `adjustment` "Ajuste da fatura" na fatura em que cai uma compra de hoje (`out` soma, `in` abate). Entra no limite disponível, mas não conta como gasto do mês nem toca a conta que paga.

**Regras complementares** (casos de borda que os testes precisam cobrir)

- **Dia do fechamento:** compra feita no próprio dia de fechamento entra na fatura seguinte.
- **Dia inexistente:** fechamento ou vencimento no dia 29, 30 ou 31 em mês mais curto cai no último dia daquele mês.
- **Mês de referência da fatura** = mês do vencimento. Se o vencimento é anterior ao fechamento no calendário, ele cai no mês seguinte ao fechamento.
- **Lançamento futuro (`scheduled`):** não entra no saldo atual; aparece como previsto e soma no "saldo previsto do mês". Quando a data chega, o app pergunta se foi efetivado.
- **Estorno no cartão:** transação `adjustment` com sinal de crédito na mesma fatura da compra, ou na fatura aberta se aquela já fechou.
- **Exclusão:** conta, cartão ou categoria com lançamentos só pode ser arquivada; categoria excluída exige mover os lançamentos para outra antes.

## Como trabalhar em paralelo

Cada fase é dividida em quatro trilhas (A, B, C e D) que só se comunicam por contratos em TypeScript. Assim cada membro, com apoio de IA, avança sem esperar pelos outros.

**Ciclo de cada fase**

1. **Kickoff de contratos (todos juntos):** definir tipos, assinaturas de funções, tabelas e rotas da fase e fazer o commit em `main` antes de abrir as trilhas.
2. **Trilhas em paralelo:** cada pessoa trabalha na própria branch e nas próprias pastas; o que depende de outra trilha usa um fake que respeita o contrato.
3. **Integração (todos juntos):** trocar os fakes pelas implementações reais, rodar os testes ponta a ponta, fazer o teste de uso e a demo da fase.

**Regras para ninguém travar**

- Cada trilha é dona das suas pastas; mexer na pasta de outra trilha só por PR revisado pelo dono.
- Contrato mudou? Avisar o grupo e atualizar o tipo em `main` antes de qualquer outra coisa.
- Arquivos de alto conflito (`schema.ts`, `tokens.ts`, layout das abas) só mudam no kickoff ou pelo responsável definido nele.
- PRs pequenos, revisados por outro membro, com CI verde.

**Uso de IA**

- Um `CLAUDE.md` na raiz (lido automaticamente pelo Claude Code, com cópia em `AGENTS.md` para outras ferramentas) resume as convenções deste plano (centavos, pastas, tokens, padrão de testes) para todas as ferramentas de IA do grupo seguirem o mesmo padrão.
- Cada módulo começa pedindo à IA os testes a partir das regras deste documento; a implementação vem depois.
- Revisão humana obrigatória em regras de dinheiro, migrações de banco e código Kotlin.
- Prompts que funcionarem bem vão para `docs/prompts/`, para o grupo reaproveitar.

**Telas compartilhadas por várias trilhas**

A Início e a aba Mais são montadas por seções: cada trilha entrega a sua seção como componente em `src/features/<domínio>/` (por exemplo `HomeAccountsSection`, `HomeCardsSection`, `HomeMonthSummary`), e só o dono da tela edita o arquivo da rota. Assim duas trilhas nunca disputam o mesmo arquivo.

**Git**

- Branches por trilha: `fase-1/a-contas`, `fase-1/c-cartoes`.
- Commits no padrão Conventional Commits (`feat:`, `fix:`, `test:`).

**Definição de pronto** (vale para todo PR)

- [ ] Typecheck, lint e testes passando no CI
- [ ] Regras novas com testes unitários
- [ ] Telas conferidas nos temas claro e escuro, em celular compacto e com fonte em 130%
- [ ] Cores, espaçamentos e fontes só a partir dos tokens; nenhum valor solto
- [ ] Textos em `src/lib/strings.ts`

## Fase 0 — Fundação

A Fase 0 termina quando o app abre num Android físico, alterna tema claro e escuro, mostra o catálogo de componentes base e o CI está verde. É a única fase com um passo sequencial: o esqueleto do repositório precisa existir antes das trilhas.

**Kickoff (todos juntos)**

- [x] Criar o projeto com `create-expo-app` (TypeScript + Expo Router), a estrutura de pastas e o repositório no GitHub
- [x] Escrever o `AGENTS.md` com as convenções deste plano
- [x] Combinar os nomes dos tokens (`ui/tokens.ts` com valores provisórios) e os tipos de domínio da Fase 1 (`src/domain/types.ts`)

**Trilhas**

| Trilha | Módulo | Pastas | Entrega |
| --- | --- | --- | --- |
| A | Build e qualidade | raiz, `.github/` | `expo-dev-client`, build num aparelho real, perfil de build que gera o APK do MVP, ESLint, Prettier, Jest e CI rodando typecheck e testes |
| B | Tema | `src/ui/tokens.ts`, `src/ui/theme.ts` | Valores finais dos tokens, tema claro e escuro, NativeWind, fonte Inter |
| C | Banco local | `src/db/` | `expo-sqlite` + Drizzle, schema completo da Fase 1, primeira migração, seed de categorias, seed de desenvolvimento com dados realistas (3 contas, 2 cartões, 3 meses de lançamentos) para telas e demos, repositórios básicos |
| D | Componentes base | `src/ui/components/`, `src/lib/`, `app/dev/` | `lib/money.ts` com testes e catálogo `dev/ui` com `MoneyText`, botões, inputs, cards, `TransactionRow`, `AmountKeypad` |

D começa com os tokens provisórios do kickoff e só troca os valores quando B termina.

**Integração e teste de produto:** abrir o catálogo num celular compacto e num tablet (ou emulador) e conferir legibilidade, contraste e espaçamento nos dois temas.

## Fase 1 — CRUD financeiro

A Fase 1 termina quando o saldo de cada conta e a fatura de cada cartão no app batem com os do banco, num teste com gastos reais de pelo menos dois membros. É a fase que define o produto.

**Kickoff de contratos**

- [x] Assinaturas dos serviços de domínio, por exemplo:

```ts
// contas
getAccountBalance(accountId: string, until?: string): number   // centavos
listAccountsWithBalance(): AccountWithBalance[]
// lançamentos
createTransaction(input: NewTransaction): Transaction
useMonthTransactions(month: string, filters?: TxFilters): DayGroup[]
// cartões
resolveInvoice(cardId: string, purchaseDate: string): Invoice
createCardPurchase(input: NewCardPurchase): Transaction[]       // N parcelas
payInvoice(invoiceId: string, accountId: string, amountCents: number): Transaction
```

- [x] Abas e rotas criadas (Início, Lançamentos, Cartões, Mais) com telas vazias, para ninguém disputar o arquivo de navegação
- [x] Um fake em memória de cada serviço, para as telas funcionarem antes da implementação real

**Trilhas**

| Trilha | Módulo | Entrega |
| --- | --- | --- |
| A | Contas | Regras de saldo, transferência e ajuste (1, 2, 7 e 8 do modelo de dados); CRUD de contas; cards de conta e saldo total na Início |
| B | Lançamentos | Sheet de novo lançamento com `AmountKeypad`; lista do mês agrupada por dia; editar, excluir e desfazer; filtros e busca |
| C | Cartões e faturas | Regras 3 a 6 (fatura, parcelas, limite, pagamento); CRUD de cartões; tela da fatura; pagar fatura; campos de compra no cartão que B encaixa no sheet |
| D | Categorias e visão geral | CRUD de categorias e `CategoryPicker`; `MonthSwitcher`; resumo do mês e rosca na Início; onboarding; exportar CSV e JSON; modo ocultar valores; bloqueio do app por biometria ou PIN (expo-local-authentication), com bloqueio automático em segundo plano e conteúdo oculto na tela de apps recentes |

**Checklist de polimento** (cada trilha aplica nas suas telas)

- [x] Estados vazios e skeletons; nenhuma tela em branco
- [x] Vibração leve nas ações principais; desfazer em toda exclusão
- [ ] Lista + detalhe na faixa expandida (tablet e dobrável): feito em Lançamentos; falta nas demais
- [ ] Fonte em 130%, rótulos de acessibilidade e contraste AA (contraste AA dos tokens coberto por teste)

**Integração e testes**

- Cada trilha entrega os testes unitários das suas regras (C: fechamento em datas-limite, parcelas com resto, pagamento parcial; A: transferência e ajuste).
- Juntos: testes ponta a ponta com Maestro (lançar despesa; compra em 3x aparece em 3 faturas; pagar fatura reduz o saldo).
- **Teste de uso:** cada membro lança os próprios gastos reais por um período combinado. Cronometrem 10 lançamentos (meta: menos de 5 s cada) e registrem os atritos num documento comum. Depois, cada membro observa uma pessoa de fora executando tarefas guiadas ("registre uma compra de R$ 120 em 4x no cartão") sem ajudar.

## Fase 2 — Leitura de notificações

A Fase 2 captura, interpreta e mostra as notificações dos bancos numa caixa de **Pendentes**; nada vira lançamento sem um toque do usuário. Ela termina quando a captura é confiável nos bancos do grupo e sobrevive a reinício do celular e a um período sem abrir o app.

**Kickoff de contratos**

- [x] API do módulo nativo (B e C usam um fake dela até A terminar):

```ts
isPermissionGranted(): boolean
openPermissionSettings(): void
isIgnoringBatteryOptimizations(): boolean
requestIgnoreBatteryOptimizations(): void
setAllowedPackages(packages: string[]): void
getPending(limit: number): RawNotification[]
markProcessed(ids: string[]): void
addListener('onCaptured', cb): Subscription
```

- [x] Tipos `RawNotification` (pacote, título, texto, horário) e `Capture` (valor em centavos, tipo provável, estabelecimento, data, final do cartão, origem sugerida, confiança, status)
- [x] Migração da tabela `captures`
- [ ] Cada membro começa a juntar notificações reais dos próprios bancos: quatro pessoas cobrem mais bancos

**Trilhas**

| Trilha | Módulo | Entrega |
| --- | --- | --- |
| A | Módulo nativo | `BankListener` e `RawStore` em Kotlin (dedupe por `sbn.key` + hash, lista de pacotes permitidos, `com.android.shell` só em debug); ponte para o TS; testes JUnit; script `simulate-notification.sh` com `adb` |
| B | Permissão e saúde do serviço | Tela explicando o que é lido e a privacidade; passo guiado para "Permitir configurações restritas" (necessário no APK em Android 13+); abrir a configuração e conferir ao voltar; passo de bateria por fabricante; aviso na Início com o serviço desligado; tela de diagnóstico que exporta notificações anonimizadas |
| C | Parsers | Fixtures com pelo menos 30 notificações reais de 3 ou mais bancos, anonimizadas antes do commit (nomes, finais de cartão e estabelecimentos trocados); parser genérico de reserva; parsers por banco; notificação não reconhecida vira "não interpretada", nunca é descartada |
| D | Caixa de Pendentes | Aba com selo de contagem; confirmar em 1 toque, editar, descartar, confirmar vários; aprender a origem ("app X com final 1234 vai para o cartão Y") |

**Integração e testes**

- Juntos: trocar o fake pelo módulo real e rodar o fluxo completo com o script `adb` (notificação → captura → Pendentes → lançamento).
- Regra de C: toda notificação que falhar no parser vira uma fixture nova.
- **Teste de uso:** cada membro usa a captura nos próprios bancos, mantendo também o registro manual. Medir a **taxa de captura** (transações reais que chegaram em Pendentes) e a **precisão** (valor e tipo corretos). Metas iniciais: 95% e 90%. Conferir o consumo de bateria nas configurações do Android.

## Fase 3 — Conciliação semi e automática

A conciliação evolui em três níveis, e cada nível só é liberado quando o anterior prova precisão no uso real.

| Nível | Comportamento | Liberado quando |
| --- | --- | --- |
| 1. Assistido | Captura vira sugestão em Pendentes; usuário confirma (já entregue na Fase 2) | Fim da Fase 2 |
| 2. Semiautomático | Sugestão chega com categoria e origem preenchidas; vincula a lançamentos manuais existentes; confirmação em lote | Precisão ≥ 90% no nível 1 |
| 3. Automático por fonte | Usuário liga "lançar automaticamente" por banco; lançamento entra com selo "automático" e pode ser desfeito; resumo diário do que entrou | Pelo menos 95% das confirmações sem edição naquela fonte |

**Algoritmo de vínculo**

1. **Candidatos:** lançamentos não conciliados com o mesmo valor, na mesma conta ou cartão, com data até 2 dias de distância.
2. **Pontuação:** valor igual é obrigatório; mesma origem soma; distância de dias subtrai; descrição parecida com o estabelecimento soma.
3. **Decisão:** acima do limiar, sugerir "vincular" em vez de criar outro lançamento; abaixo, sugerir lançamento novo.
4. **Duplicatas da mesma transação** (ex.: push do app e SMS do banco): mesmo valor em até 5 minutos vira um único item.

**Kickoff de contratos**

```ts
findCandidates(capture: Capture): Transaction[]
scoreMatch(capture: Capture, tx: Transaction): number   // 0 a 1
decide(capture: Capture): { action: 'link' | 'create'; txId?: string; score: number }
```

**Trilhas**

| Trilha | Módulo | Entrega |
| --- | --- | --- |
| A | Matcher | `matcher.ts` puro com candidatos, pontuação e decisão; testes por cenário (lançamento manual já existente, dois gastos iguais no mesmo dia) |
| B | Regras aprendidas | Tabela `merchant_rules` (estabelecimento → categoria e origem), alimentada a cada confirmação; sugestões chegam pré-preenchidas |
| C | Casos especiais | Duplicata push + SMS em até 5 minutos; estorno vinculado à compra original; parcelado capturado gera as parcelas pelas regras da Fase 1 |
| D | Experiência | Sugestão "vincular" em Pendentes; confirmação em lote; nível automático configurável por fonte, com histórico de precisão; resumo do que entrou automaticamente |
| E | Comprovantes compartilhados (decidido em out/2026) | Kustho no menu "Compartilhar" do Android; o comprovante de um Pix (texto, imagem ou PDF) é lido no aparelho (OCR local) e vira sugestão em Pendentes. Cobre os bancos que não notificam o Pix enviado |

**Integração e testes**

- Juntos: rodar os cenários de A, B e C contra as fixtures da Fase 2.
- **Teste de uso:** registrar, por banco, a porcentagem de pendentes confirmadas sem edição. Esse número decide se o nível 3 pode ser ligado para aquela fonte.

## Fase 4 — Spike de viabilidade do Open Finance

O spike é um experimento curto que termina num documento de decisão: seguir para a Fase 5 ou não. Todo o código é descartável e fica fora do app.

**Experimentos em paralelo**

| Trilha | Experimento | Resultado |
| --- | --- | --- |
| A | Sandbox da Pluggy: modelo de Item, Account e Transaction e fluxo de webhooks com dados sintéticos | Nota técnica de como os dados chegariam ao app |
| B | Meu Pluggy com contas reais: cada membro conecta o próprio CPF (gratuito) e puxa os últimos 90 dias | Lista de bancos e cartões cobertos no grupo |
| C | Script em Node que cruza as transações do Open Finance com o que o app já tem (manual + notificações) | Relatório de cobertura, atraso e qualidade |
| D | Cronometrar alguém conectando um banco do zero; levantar preços atuais dos agregadores e as regras do Banco Central para parceiros não regulados | Tempo de onboarding e custo estimado por usuário |

O spike fecha com uma decisão conjunta, usando os critérios abaixo.

**Critérios de decisão**

| Critério | Seguir se |
| --- | --- |
| Cobertura | Todos os seus bancos principais disponíveis, incluindo cartões |
| Atraso | Transações aparecem em até 24 h |
| Qualidade | Valor, data e descrição corretos em pelo menos 95% das transações comparadas |
| Faturas | Dados de fatura e parcelas utilizáveis para conferir o cartão |
| Onboarding | Conectar um banco leva no máximo 3 minutos |
| Custo | Cabe no modelo do app (uso pessoal gratuito ou plano pago justificado) |

Se só parte dos critérios passar, uma saída intermediária é usar o Open Finance apenas para conferência mensal, sem sincronização contínua.

## Fase 5 — Open Finance completo (só se o spike aprovar)

A Fase 5 transforma o Open Finance na fonte oficial: a notificação continua dando velocidade, e o Open Finance confirma e corrige.

**Kickoff de contratos**

- [ ] Especificação OpenAPI dos endpoints (`POST /connect-token`, `POST /webhooks/pluggy`, `GET /sync?since=`) e um servidor mock gerado a partir dela, para o app avançar sem o backend real
- [ ] Migração de `external_accounts` e `external_transactions` no app

* [ ] Gerar com o CLI do Better Auth as tabelas de usuário e sessão no schema Drizzle do backend e aplicar com `drizzle-kit migrate`

**Trilhas**

| Trilha | Módulo | Entrega |
| --- | --- | --- |
| A | Backend base | Fastify + Postgres + Drizzle; login com Better Auth (código por e-mail e Google) usando a mesma instância do Drizzle do backend, `POST /connect-token`, segredos só no servidor, exclusão completa dos dados a pedido do usuário (LGPD) |
| B | Ingestão | `POST /webhooks/pluggy`, armazenamento de transações externas, `GET /sync`; testes de contrato contra o sandbox e replay de webhooks gravados |
| C | Conexão no app | Tela "Conectar banco" com o widget, status de cada conexão, aviso de reconexão quando o consentimento expirar; cliente de sync offline-first; telas de login com o plugin @better-auth/expo; envio dos dados locais no primeiro login |
| D | Conciliação e iOS | Transações externas passando pelo `matcher` da Fase 3; selo "confirmado pelo banco"; build iOS sem o módulo de captura |

**Integração e testes**

- Juntos: trocar o mock pelo backend real e rodar o fluxo conectar → sincronizar → conciliar.
- **Teste de uso:** comparar o que veio por notificação com o que veio por Open Finance e registrar cada divergência.

**Cuidados com o Better Auth:** com o Postgres atrás de um pooler (PgBouncer, Supabase, Neon), usar `prepare: false` no `postgres.js`; nunca criar uma segunda conexão do Drizzle só para a autenticação; configurar um provedor de e-mail (Resend, por exemplo) para os códigos de login.

## Estratégia de testes

Cada fase fecha com testes automáticos das regras e um teste de uso real; o teste de uso é o que decide se a fase acabou.

| Camada | Ferramenta | O que cobre | Quando roda |
| --- | --- | --- | --- |
| Unitário | Jest | Dinheiro, saldo, faturas, parcelas, parsers, matcher | Todo push (CI) |
| Componente | React Native Testing Library | Formulários, listas, estados vazios | Todo push (CI) |
| Nativo | JUnit no módulo Kotlin | Deduplicação e filtro por pacote | Todo push na Fase 2+ |
| Ponta a ponta | Maestro | Fluxos críticos em emulador | Antes de cada versão interna |
| Simulação | Script com `adb` | Notificação → captura → Pendentes | Durante a Fase 2 e 3 |
| Uso real | Os 4 membros + pessoas de fora | Atrito, tempo de lançamento, precisão | Fim de cada fase |

**Distribuição do MVP:** APK instalado direto no celular de poucos usuários, gerado por um perfil de build `preview` no EAS Build (ou build de release local). Instalado por APK, o Android 13+ trata o acesso a notificações como **configuração restrita**: antes de liberar o acesso, o usuário precisa abrir Informações do app, tocar no menu ⋮ e escolher "Permitir configurações restritas". O onboarding da Fase 2 guia esse passo.

**Como conduzir os testes com outras pessoas**

- Dê tarefas, não instruções: "registre o almoço de hoje", "pague metade da fatura".
- Observe sem ajudar e anote onde a pessoa hesita.
- No fim, aplique o questionário SUS (10 perguntas, nota de 0 a 100) para comparar fases.

## Riscos, decisões em aberto e próximos passos

O maior risco técnico é a captura de notificações falhar em silêncio; o maior risco de produto é o escopo crescer antes de o CRUD estar redondo.

| Risco | Efeito | Mitigação |
| --- | --- | --- |
| Fabricante encerra o serviço em segundo plano | Gastos não capturados | Passo de bateria no onboarding, aviso na Início quando o serviço cair, pedido de religação ao abrir o app |
| Banco muda o texto da notificação | Parser deixa de reconhecer | Parser genérico de reserva, fixtures, contador de "não interpretadas" por banco |
| Android oculta conteúdo sensível | Texto vem escondido | Tratar como não interpretada, sem quebrar o fluxo |
| Política do Google Play para acesso a notificações | Publicação recusada | Não afeta o MVP (APK); se o app for para a loja no futuro, justificar como função central e publicar política de privacidade |
| Custo do Open Finance | Fase 5 inviável | Spike curto e descartável; Meu Pluggy para uso pessoal |
| Escopo cresce | Nada fica pronto | Cada fase fecha com app usável; ideias novas vão para um backlog separado |
| Logos de bancos são marcas de terceiros | Recusa na Play Store ou pedido de remoção | Uso só para identificar a instituição do próprio usuário; revisar (ou trocar por iniciais) antes de publicar na loja |
| Dados financeiros guardados no aparelho | Exposição se o celular for acessado ou o backup vazar | Bloqueio por biometria ou PIN; avaliar criptografia do SQLite (SQLCipher); decidir se o banco entra no backup automático do Android; fixtures sempre anonimizadas |

**Decisões em aberto**

- Nome: Kustho (decidido). Cor de marca: verde-petróleo #0F766E (decidido).
- Estilo: NativeWind adotado, salvo decisão contrária no kickoff da Fase 0.
- Distribuição (decidido): MVP em APK para poucos usuários; Play Store só no futuro, se o produto vingar.
- Login (decidido): sem conta até a Fase 5, com o app protegido por biometria ou PIN; na Fase 5, Better Auth no backend.

**Próximos passos**

- [x] Fechar a paleta completa a partir do verde-petróleo e validar contraste AA nos dois temas (todos os tokens de texto com AA ≥ 4,5 nos dois temas, conferido por teste)
- [ ] Definir os donos das trilhas A a D (ver `fase-1.md`)
- [x] Primeira sessão juntos: `schema.ts` do Drizzle e `lib/money.ts` com testes

**Artefatos para preparar antes de codar com o Claude Code**

- [x] `CLAUDE.md` (e cópia `AGENTS.md`) com stack, convenções, pastas por trilha, regras de negócio e definição de pronto
- [x] `src/domain/types.ts` inicial com os tipos de `Account`, `CreditCard`, `Invoice`, `Category` e `Transaction`
- [ ] Telas de referência (Início, Lançamentos, Cartões, Fatura e sheet de novo lançamento) nos temas claro e escuro, para guiar o acabamento visual
- [x] Este plano exportado em Markdown dentro do repositório (`docs/plano.md`), para o Claude Code consultar
