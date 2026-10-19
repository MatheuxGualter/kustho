# Trabalhando no Kustho com o Claude Code

Guia para um dev pegar uma tarefa e avançar junto com o Claude Code (ou outra IA) sem
quebrar o que os outros estão fazendo. As regras do código estão no
[`CLAUDE.md`](../CLAUDE.md), que o Claude lê sozinho em toda sessão; aqui está o **fluxo**.

## 1. Antes da primeira tarefa

1. Máquina configurada e app rodando no celular: [`como-rodar.md`](como-rodar.md).
2. Leia, nesta ordem: [`CLAUDE.md`](../CLAUDE.md) (convenções), o status das fases em
   [`fase-1.md`](fase-1.md) e [`fase-2.md`](fase-2.md) e as regras de negócio em [`plano.md`](plano.md) ("Modelo de
   dados e regras").
3. Combine no grupo qual trilha ou pendência é sua (tabela "Trilhas" no status da fase).

## 2. Ciclo de uma tarefa

```bash
git checkout main && git pull
git checkout -b feat/<assunto-curto>     # ou fix/, docs/, test/
pnpm install                             # se o lockfile mudou
```

1. **Peça a tarefa com contexto.** Diga o que é, de qual trilha e onde está a regra. Os
   modelos de pedido em [`prompts/`](prompts/) já trazem o que o Claude precisa saber.
2. **Testes primeiro** para regra de negócio (função pura em `src/domain/`). Revise os
   casos antes de deixar implementar: é ali que mora o dinheiro.
3. **Confira no celular** (`pnpm start`): tema claro e escuro, fonte grande e celular
   pequeno. Mande print para o Claude quando algo estiver estranho; ele corrige melhor
   vendo a tela.
4. **Antes do commit:** `pnpm typecheck && pnpm lint && pnpm test`.
5. **Commit** em Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`), em português.
6. **PR pequeno** para `main`, preenchendo o modelo (`.github/pull_request_template.md`).
   Se a tarefa fechou um item de `fase-1.md` ou `fase-2.md`, marque o `[x]` no mesmo PR.
7. **Revisão por outro membro.** Obrigatória em regra de dinheiro, migração e Kotlin.

## 3. Para não pisar no trabalho dos outros

- Cada trilha é dona das suas pastas. Mexer na pasta de outra trilha: só com PR revisado
  pelo dono.
- Arquivos de alto conflito (`schema.ts`, `tokens.ts`, `types.ts`, `contracts.ts`,
  `services/app.ts`, `(tabs)/_layout.tsx`): avise o grupo antes e faça um PR só para eles.
- PRs empilhados (um em cima do outro) fazem o merge cair na branch de baixo, não na
  `main`. Prefira sempre abrir a branch a partir da `main` atualizada.
- `CLAUDE.md` e `AGENTS.md` são cópias exatas (o CI confere): edite os dois juntos.

## 4. Passando o bastão (outro dev ou outra sessão do Claude)

Uma sessão do Claude não lembra da anterior. O que precisa sobreviver vai para o
repositório:

- **Status** → `fase-1.md` ou `fase-2.md` (checkbox, linha no histórico e, se testou no
  aparelho, na tabela de validação).
- **Decisão de produto ou regra nova** → `plano.md`, na seção da regra.
- **Convenção de código nova** → `CLAUDE.md` + `AGENTS.md`.
- **Armadilha descoberta** → seção 5 abaixo (ou "Problemas comuns" em `como-rodar.md`, se
  for de máquina).
- **Pedido que funcionou bem** → um arquivo em `prompts/`.
- **Trabalho pela metade** → PR em rascunho com o que falta na descrição.

Para retomar, comece a sessão com: _"Leia `docs/fase-1.md`, `docs/fase-2.md` e o PR #N; continue de onde
parou"_.

## 5. Armadilhas já conhecidas

Coisas que custaram tempo e que o Claude (e você) deve saber de cara:

| Situação                                                   | O que fazer                                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| API do Expo/React Native "não existe" ou mudou             | O projeto está no Expo SDK 58. Confira os tipos em `node_modules` ou a doc versionada, não a memória.                          |
| Mudou ícone, splash, nome ou plugin no `app.json`          | `npx expo prebuild --clean --platform android` e `pnpm android`. Só recompilar não basta.                                      |
| Dependência nova                                           | `npx expo install <pacote>`. Se for nativa, o PR avisa que precisa recompilar.                                                 |
| Teste de componente travando ou "não encontrou o elemento" | RNTL 14: `render`, `fireEvent` e `act` são assíncronos; sempre `await`. Use `renderWithTheme`.                                 |
| Módulo nativo quebra o Jest                                | Mock em `src/test/setup.ui.ts` (já há Reanimated, deslizar, SQLite, kv-store).                                                 |
| Regra que toca o banco                                     | `createTestDb()`: SQLite real com as migrações e as restrições CHECK. Não use mock de banco.                                   |
| ESLint reclama de cor                                      | Hex só em `src/ui/tokens.ts` (e logos em `src/ui/banks/`). Use classes do Tailwind ou `useTheme()`.                            |
| `watch()` do react-hook-form dá erro de lint               | Use `useWatch` (o React Compiler não aceita `watch`).                                                                          |
| Data de lançamento errada em um dia                        | Nunca `toISOString()` para data de competência; use `today()` e `src/lib/dates.ts`.                                            |
| Algo de trás aparece "vazando" num item com opacidade      | No Android a opacidade do pai vale filho a filho. Dê feedback de toque com cor, não com opacidade (ex.: `TransactionRow`).     |
| Texto cortado em telas pequenas                            | `numberOfLines` + `adjustsFontSizeToFit` com `minimumFontScale`; nomes com espaço podem quebrar em duas linhas.                |
| App mostra `Host unreachable` ao abrir                     | O app procura o Metro no IP do Wi-Fi. Use `pnpm start:usb` (cabo) e `a` no terminal.                                           |
| Tabela nova com chave estrangeira                          | Inclua em `clearDevData` (`src/db/devSeed.ts`) na ordem certa; senão os dados de exemplo e o Maestro falham com `FOREIGN KEY`. |
| Arquivo de texto com acentos (CSV) sai errado              | Grave bytes UTF-8 (`TextEncoder`) com BOM; ver `src/features/shared/shareFile.ts`.                                             |
| Regra de limite que soma lançamentos (ex.: estornos)       | Ligue os lançamentos por id (`refundOfId`) e teste a soma, não só o valor isolado.                                             |
| Exportar dados de usuário (diagnóstico)                    | Anonimize e teste com textos reais: bancos mascaram só parte do CPF (`XXX.468.266-XX`).                                        |
| Abrir PR depois de muito tempo na branch                   | `git fetch && git merge origin/main` antes; alguém pode ter mudado os mesmos arquivos na `main`.                               |

## 6. O que o Claude pode e não pode fazer sozinho

- Pode: ler o código, escrever testes e implementação, rodar typecheck/lint/testes,
  criar branch, commitar e abrir PR quando você pedir.
- Não tem: o seu celular. A conferência visual no aparelho é sempre sua; mande prints.
- Não deve: fazer merge na `main`, mudar contrato ou schema sem o grupo saber, nem
  publicar nada fora do repositório.
