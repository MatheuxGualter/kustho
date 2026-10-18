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
- [x] Tipos `Capture`, `ParsedNotification` e `CaptureOriginRule` em `src/domain/types.ts`;
      tabelas `captures` e `capture_origin_rules` (migração `0001_captures`, **revisão
      humana obrigatória**).
- [x] Contratos em `src/domain/contracts.ts`: `NotificationParser` (trilha C) e
      `CapturesService` (trilha D). Regras puras em `src/domain/captures/rules.ts` (escolher
      o parser, montar a sugestão, completar a confirmação, aprender a origem).
- [x] Fake `createFakeCapturesService` (cria os lançamentos pelos serviços de lançamentos e
      cartões) e suíte de contrato `captures.contract.test.ts`. O app usa o fake sobre os
      serviços reais até a trilha D entregar o real: capturas em memória, lançamentos no SQLite.
- [x] `NewTransaction` e `NewCardPurchase` aceitam `source` (padrão `manual`).
- [x] Aba Pendentes com selo (`tabBarBadge` na `TabBar`) e rotas vazias
      `/captura/permissao` e `/captura/diagnostico`.
- [ ] Decidir a barra com 5 abas: o botão + saiu do centro (3 à esquerda, 2 à direita) e
      "Lançamentos" encolhe. Opções: Pendentes no lugar de Cartões dentro de Início, ou
      ícones sem rótulo na faixa compacta.
- [ ] Cada membro junta notificações reais dos próprios bancos (anonimizar antes do
      commit: nomes, finais de cartão e estabelecimentos).

## Trilhas

| Trilha                 | Pastas                                                    |
| ---------------------- | --------------------------------------------------------- |
| A · Módulo nativo      | `modules/notification-capture/`                           |
| B · Permissão e saúde  | `src/features/capture-setup/`                             |
| C · Parsers            | `src/domain/captures/parsers/` e fixtures                 |
| D · Caixa de Pendentes | `src/domain/captures/` (serviço), `src/features/pending/` |

Decisões do kickoff:

- Captura não é lançamento: fica em `captures` até o usuário confirmar. O status `pending`
  de `transactions` continua sem uso na Fase 2.
- Captura confirmada vira lançamento com `source: 'notification'` e guarda o
  `transactionId`; a origem confirmada vira regra (`capture_origin_rules`) para o mesmo app
  e final de cartão.
- Notificação não reconhecida entra com `parser: null` ("não interpretada") e nunca é
  descartada sozinha.

### A · Módulo nativo

- [x] `BankListener` (`NotificationListenerService`) e `RawStore` (SQLite próprio do
      módulo, `kustho_notification_capture.db`); dedupe por `sbn.key` + hash do conteúdo;
      lista de pacotes permitidos; `com.android.shell` só em build de depuração. Resumos de
      grupo são ignorados; ao conectar, o serviço grava o que já está na bandeja.
- [x] Ponte para o TS (`modules/notification-capture/index.ts`, API v2 do Expo 58).
- [x] Testes JUnit das regras puras (`CaptureRules`: filtro, texto, hash do dedupe):
      `cd android && ./gradlew :notification-capture:testDebugUnitTest`.
- [x] `scripts/simulate-notification.sh` com `adb` (`--exemplos` posta três casos).
- [ ] Job de JUnit no CI (precisa de JDK e Android SDK no runner).
- [x] Ponte conferida pelo JS no aparelho (`getPending`, `onCaptured`, pacotes permitidos)
      pela seção "Captura de notificações" do catálogo dev. Registrada em `src/services/app.ts`.
- [ ] Teste de reinício do celular e de um período sem abrir o app (portão da fase).
- [ ] Revisão humana do Kotlin (obrigatória).

Para testar no aparelho: `pnpm android`, liberar o acesso a notificações do Kustho
(ou `adb shell cmd notification allow_listener app.kustho/app.kustho.notificationcapture.BankListener`)
e rodar `scripts/simulate-notification.sh --exemplos`. Para ler o que foi gravado:
`adb exec-out run-as app.kustho cat databases/kustho_notification_capture.db > cap.db`.
