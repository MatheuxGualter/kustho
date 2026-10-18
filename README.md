# Kustho

Gerenciador financeiro Android-first e offline-first: contas, cartões, faturas, entradas e
saídas, com captura de notificações dos bancos nas próximas fases.

- Plano de desenvolvimento: [`docs/plano.md`](docs/plano.md)
- Convenções para o time e para IAs: [`CLAUDE.md`](CLAUDE.md) (cópia em `AGENTS.md`)

## Começando

Pré-requisitos: Node (versão em `.nvmrc`), pnpm 10, Android Studio ou um Android físico
com depuração USB.

```bash
pnpm install
pnpm android        # gera e instala o dev client (expo run:android) e abre o Metro
```

Depois da primeira instalação, `pnpm start` basta para continuar desenvolvendo. O Expo Go
não funciona com este projeto.

APK para testes internos: `npx eas-cli@latest build --profile preview --platform android`.

## Scripts

| Script             | O que faz                                                |
| ------------------ | -------------------------------------------------------- |
| `pnpm typecheck`   | Checagem de tipos                                        |
| `pnpm lint`        | ESLint + Prettier + regra de cores só dos tokens         |
| `pnpm test`        | Jest (regras puras e componentes)                        |
| `pnpm db:generate` | Gera a migração do Drizzle após mudar `src/db/schema.ts` |
| `pnpm format`      | Formata o código                                         |

## Status

Fase 0 (fundação) em andamento. Ver o roteiro em `docs/plano.md`.
