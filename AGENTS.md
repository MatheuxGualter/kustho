# Kustho — guia para pessoas e IAs

Gerenciador financeiro Android-first, offline-first. Começa como controle manual completo
(contas, cartões, faturas, entradas e saídas) e evolui para captura de notificações dos
bancos. O plano completo está em [`docs/plano.md`](docs/plano.md); consulte-o antes de
decidir regra de negócio, escopo ou visual.

> `AGENTS.md` é uma cópia exata deste arquivo (o CI confere). Edite os dois juntos.

## Comandos

```bash
pnpm install              # único gerenciador de pacotes; Node em .nvmrc
npx expo install <pkg>    # SEMPRE para adicionar dependências (resolve a versão do SDK)
pnpm android              # build de desenvolvimento num aparelho/emulador (expo run:android)
pnpm start                # Metro para o dev client já instalado
pnpm typecheck            # tsc --noEmit
pnpm lint                 # ESLint (inclui Prettier e a regra de cores soltas)
pnpm format               # Prettier
pnpm test                 # Jest (projetos "unit" e "ui")
pnpm db:generate          # gera migração do Drizzle após mudar src/db/schema.ts
```

Rode `pnpm typecheck && pnpm lint && pnpm test` antes de declarar uma tarefa pronta.
Configurar a máquina e rodar no celular: [`docs/como-rodar.md`](docs/como-rodar.md).
Expo Go não serve: o app usa `expo-dev-client` (módulo nativo na Fase 2). APK do MVP:
perfil `preview` do EAS (`eas.json`).

## Stack

Expo SDK 58 (prebuild/CNG) · React Native 0.88 · TypeScript `strict` · Expo Router ·
NativeWind 4 (Tailwind 3) sobre tokens próprios · Reanimated + Gesture Handler ·
FlashList + `@gorhom/bottom-sheet` · `victory-native` (Skia) · `expo-sqlite` + Drizzle ·
Zustand · `react-hook-form` + `zod` · `lucide-react-native` · Inter · `expo-haptics`.

**O Expo muda a cada SDK; não confie na memória.** Antes de usar uma API do Expo/RN,
leia a versão em `package.json` e a doc versionada
(`https://docs.expo.dev/versions/v58.0.0/`) ou os tipos em `node_modules`. Exemplos já
encontrados no SDK 58: rotas ficam em `src/app/`; abas em JS vêm de `expo-router/js-tabs`;
a barra de abas recebe `emitter` e `navigateToTab` (não `navigation`).
Nunca edite `android/` ou `ios/` à mão: configure por `app.json` e config plugins.

## Estrutura

```
src/
  app/                    # rotas (Expo Router) — só telas, sem lógica
    (tabs)/               # index (Início), lancamentos, cartoes, mais
    lancamento/novo.tsx   # novo lançamento (sheet)
    lancamento/[id].tsx   # editar
    dev/ui.tsx            # catálogo de componentes (só __DEV__)
  db/                     # schema.ts, migrations/ (geradas), client.ts, seed.ts, setup.ts
    repositories/         # CRUD básico por tabela (recebem AppDatabase)
    devSeed.ts            # dados de exemplo (catálogo dev/ui → "Popular dados de exemplo")
    test/testDb.ts        # SQLite real em memória para testes (node:sqlite + migrações)
  domain/                 # types.ts e contracts.ts (contratos) + regras e serviços por domínio
  services/               # registro dos serviços (useServices), useServiceQuery e fakes
  features/<domínio>/     # telas e seções compostas (HomeAccountsSection…)
  ui/                     # tokens.ts, theme.tsx, components/
  lib/                    # money.ts, dates.ts, strings.ts, id.ts, preferences.ts
modules/notification-capture/   # Fase 2 (Kotlin + ponte TS)
docs/                     # plano.md, prompts/
```

Import com alias `@/` → `src/`.

## Convenções (valem desde o dia 1)

- **Dinheiro em centavos inteiros** (`amountCents: number`); nunca float. Formatar só com
  `formatBRL` de `src/lib/money.ts`. Parcelas com `splitInstallments` (resto na 1ª).
- **Datas de lançamento**: string local `YYYY-MM-DD` (`ISODate`); mês `YYYY-MM`
  (`YearMonth`). Use `src/lib/dates.ts`; **nunca** `toISOString()` para datas de
  competência nem converter para UTC antes de calcular fatura ou agrupar por dia.
  Timestamps de criação/alteração: `nowTimestamp()` (ISO 8601).
- **IDs**: UUID v4 do aparelho via `newId()` (`src/lib/id.ts`).
- **Exclusão lógica**: toda tabela tem `deletedAt`; consultas filtram `deleted_at IS NULL`.
  Contas e cartões com lançamentos só são arquivados (`archivedAt`).
- **Regras de negócio** em funções puras em `src/domain/<domínio>/`, testadas sem React.
  Escreva os testes primeiro, a partir das regras de `docs/plano.md`.
- **Telas** leem e escrevem só pelos serviços (`useServices()`, contratos em
  `src/domain/contracts.ts`), nunca importam `@/db`. Leitura reativa com
  `useServiceQuery(() => service.metodo(), [deps])`: recarrega sozinha após qualquer
  escrita. Até a trilha entregar o serviço real, o registro usa o fake em memória
  (`src/services/fakes/`). Ver `docs/fase-1.md`.
- **Acesso ao banco**: repositórios e serviços recebem `db: AppDatabase`
  (`src/db/database.ts`) e sempre usam `await`; assim o mesmo código roda no app
  (expo-sqlite) e nos testes. Teste regra que toca o banco com `createTestDb()`
  (`src/db/test/testDb.ts`): SQLite real com as migrações e as restrições CHECK.
- **Testes de componente** (`*.test.tsx`, projeto "ui"): use `renderWithTheme`
  (`src/test/render.tsx`). No RNTL 14, `render`, `fireEvent` e `act` são assíncronos:
  sempre `await`. Mocks de módulos nativos ficam em `src/test/setup.ui.ts`.
- **Componentes base** em `src/ui/components/` (veja todos no catálogo `dev/ui`):
  `AppText`, `MoneyText` (todo valor), `Button`, `TextField`, `MoneyField`, `DateField`,
  `SegmentedControl`, `ChipSelect`, `ColorPicker`, `MonthSwitcher`, `Card`, `InstitutionAvatar`,
  `CategoryIcon`, `TransactionRow`, `AmountKeypad`, `EmptyState`, `Skeleton`, `Screen` e
  `showToast(msg, onUndo?)` (aviso com "Desfazer"). Use-os antes de criar outro.
- **Erros de regra**: serviços lançam `DomainError` (`src/domain/errors.ts`); a tela mostra
  `errorMessage(e)` (`src/features/shared/errorMessage.ts`), com textos em
  `strings.errors.domain`.
- **Suítes de contrato** (`src/services/__tests__/contracts/`): o mesmo teste roda contra o
  fake e o serviço real, com os mesmos dados de exemplo. Ao entregar um serviço real,
  mova os testes do fake para uma suíte de contrato.
- **Textos** só em `src/lib/strings.ts` (pt-BR). Moeda única BRL.
- **Visual** só a partir de `src/ui/tokens.ts`: classes do Tailwind (`bg-surface`,
  `text-text-muted`, `p-4`, `rounded-card`, `font-semibold`, `text-lg`) ou `useTheme()`
  quando precisar de hex (ícones, gráficos). Hex solto fora de `tokens.ts` é erro de lint.
  As escalas do Tailwind foram substituídas: só existem os valores dos tokens
  (espaçamento 4/8/12/16/24/32 → `1 2 3 4 6 8`; fonte `xs sm base lg xl display`;
  peso via família `font-regular|medium|semibold|bold`).
- **Valores na tela**: `tabular-nums` (`<AppText numeric>`), verde de receita sempre com
  sinal `+` ou ícone, vermelho só em saídas, respeitar o modo "ocultar valores".
- **Acessibilidade e layout**: alvos de toque ≥ 44 dp (`min-h-touch`), contraste AA,
  fonte do sistema em 130% sem cortar valores, safe areas, `useWindowDimensions` com as
  faixas de `breakpoints` (compacta < 360, expandida ≥ 600 → lista + detalhe).
- **Instituições** com cor e iniciais escolhidas pelo usuário; nunca logos de bancos.

## Modelo de dados (Fase 1)

Tabelas: `accounts`, `credit_cards`, `categories`, `invoices`, `transactions`
(`src/db/schema.ts`). Contratos TS em `src/domain/types.ts`; um teste de tipo garante que
os dois batem — mudou um, mude o outro e rode `pnpm db:generate`.

- `amountCents` é sempre positivo. O sentido vem do `kind`; em `transfer` e `adjustment`
  vem de `direction` (`in`/`out`), obrigatório nesses tipos e proibido nos demais
  (restrição CHECK no banco).
- Transferência = duas pernas (`out` na origem, `in` no destino) ligadas por
  `transferPeerId`; não conta como receita nem despesa.
- Estorno no cartão = `adjustment` com `direction: 'in'` na fatura da compra (ou na
  aberta, se aquela já fechou).

Regras de negócio (todas com testes): ver "Modelo de dados e regras" em `docs/plano.md`.
Resumo: saldo da conta é sempre calculado (inicial + receitas − despesas ± transferências
± ajustes − pagamentos de fatura; só `posted` e não excluídas); compras no cartão não
tocam conta; compra no dia do fechamento ou depois vai para a fatura seguinte; dia
inexistente cai no último dia do mês (`dateInMonth`); mês de referência da fatura = mês do
vencimento; limite disponível = limite − faturas não pagas incluindo parcelas futuras.

## Trabalho em trilhas

Cada fase tem trilhas A–D que só se comunicam por contratos em TypeScript
(`src/domain/types.ts` e assinaturas de serviço). Cada trilha é dona das suas pastas;
o que depende de outra trilha usa um fake que respeita o contrato.

- Arquivos de alto conflito — `src/db/schema.ts`, `src/ui/tokens.ts`,
  `src/app/(tabs)/_layout.tsx`, `src/domain/types.ts`, `src/domain/contracts.ts`,
  `src/services/index.tsx` — só mudam no kickoff ou pelo responsável definido nele
  (exceção: cada trilha troca a própria linha do fake em `src/services/index.tsx`).
- Início e Mais são montadas por seções: cada trilha entrega a sua em
  `src/features/<domínio>/`; só o dono da tela edita a rota.
- Branches por trilha (`fase-1/a-contas`), Conventional Commits (`feat:`, `fix:`,
  `test:`), PRs pequenos com CI verde e revisão de outro membro.
- Revisão humana obrigatória em regras de dinheiro, migrações e código Kotlin.
- Prompts que funcionarem bem vão para `docs/prompts/`.

## Definição de pronto

- [ ] Typecheck, lint e testes passando no CI
- [ ] Regras novas com testes unitários
- [ ] Telas conferidas nos temas claro e escuro, em celular compacto e com fonte em 130%
- [ ] Cores, espaçamentos e fontes só a partir dos tokens; nenhum valor solto
- [ ] Textos em `src/lib/strings.ts`
