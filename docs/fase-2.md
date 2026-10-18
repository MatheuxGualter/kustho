# Fase 2 — Leitura de notificações (status)

**Portão:** a captura é confiável nos bancos do grupo e sobrevive a reinício do celular e
a um período sem abrir o app. Metas no teste de uso: 95% de captura e 90% de precisão.

Documento vivo da fase, no mesmo formato de [`fase-1.md`](fase-1.md): quem fechar um item
marca o `[x]` **no mesmo PR**. Escopo e trilhas: "Fase 2" em [`plano.md`](plano.md).

> A Fase 2 começou com pendências da Fase 1 em aberto (Maestro, teste de uso, lista +
> detalhe, conferência de acessibilidade, `FLAG_SECURE`, exportar arquivo). Decisão do
> grupo em out/2026: seguir em paralelo. Elas continuam marcadas em `fase-1.md`.

## Kickoff de contratos

- [x] API do módulo nativo: `modules/notification-capture/src/NotificationCapture.types.ts`
      (`NotificationCaptureApi`, `RawNotification`, evento `onCaptured`). Em relação ao
      plano, entraram `requestRebind()` (religar o serviço ao abrir o app) e
      `getAllowedPackages()`; `getPending` e `markProcessed` são assíncronos (leem o banco).
- [x] Fake em memória do módulo: `createFakeNotificationCapture()` em
      `modules/notification-capture/src/fake.ts` (`post()` simula um banco notificando).
- [ ] Tipo `Capture` em `src/domain/types.ts` e tabela `captures` (migração).
- [ ] Contrato `CapturesService` em `src/domain/contracts.ts` e fake.
- [ ] Aba Pendentes (com selo) e rotas vazias de permissão e diagnóstico.
- [ ] Cada membro junta notificações reais dos próprios bancos (anonimizar antes do
      commit: nomes, finais de cartão e estabelecimentos).

## Trilhas

| Trilha                 | Pastas                                                    |
| ---------------------- | --------------------------------------------------------- |
| A · Módulo nativo      | `modules/notification-capture/`                           |
| B · Permissão e saúde  | `src/features/capture-setup/`                             |
| C · Parsers            | `src/domain/captures/parsers/` e fixtures                 |
| D · Caixa de Pendentes | `src/domain/captures/` (serviço), `src/features/pending/` |

### A · Módulo nativo

- [ ] `BankListener` (`NotificationListenerService`) e `RawStore` (SQLite próprio do
      módulo); dedupe por `sbn.key` + hash do conteúdo; lista de pacotes permitidos;
      `com.android.shell` só em build de depuração.
- [ ] Ponte para o TS com a interface do kickoff.
- [ ] Testes JUnit (dedupe e filtro por pacote).
- [ ] `scripts/simulate-notification.sh` com `adb`.
