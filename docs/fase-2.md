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
      cartões) e suíte de contrato `captures.contract.test.ts`, que roda também contra o
      serviço real.
- [x] `NewTransaction` e `NewCardPurchase` aceitam `source` (padrão `manual`).
- [x] Aba Pendentes com selo (`tabBarBadge` na `TabBar`) e rotas `/captura/permissao` e
      `/captura/diagnostico` (preenchidas pela trilha B).
- [x] Barra de abas: Contas saiu do menu Mais e virou aba à direita, e o + voltou ao
      centro (Início, Lançamentos, Pendentes | + | Cartões, Contas, Mais), só com ícones
      (Pendentes = sino, Lançamentos = setas de entrada e saída). Decisão de out/2026.
- [ ] Cada membro junta notificações reais dos próprios bancos (Diagnóstico → Exportar
      anonimizado; conferir antes do commit). Até agora: um membro, 5 notificações.

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
- [x] Job de JUnit no CI (`kotlin` em `ci.yml`): projeto JVM mínimo em
      `modules/notification-capture/jvm-tests/` roda os testes das regras puras sem Android SDK.
- [x] Ponte conferida pelo JS no aparelho (`getPending`, `onCaptured`, pacotes permitidos)
      pela seção "Captura de notificações" do catálogo dev. Registrada em `src/services/app.ts`.
- [x] Teste de reinício do celular e de um período sem abrir o app (portão da fase):
      capturou nos dois casos (teste no aparelho, out/2026).
- [ ] Revisão humana do Kotlin (obrigatória).

Para testar no aparelho: `pnpm android`, liberar o acesso a notificações do Kustho
(ou `adb shell cmd notification allow_listener app.kustho/app.kustho.notificationcapture.BankListener`)
e rodar `scripts/simulate-notification.sh --exemplos`. Para ler o que foi gravado:
`adb exec-out run-as app.kustho cat databases/kustho_notification_capture.db > cap.db`.

### B · Permissão e saúde

- [x] Tela `/captura/permissao` (`src/features/capture-setup/CaptureSetupScreen.tsx`): o que
      é lido e a privacidade; escolher os bancos (já marca os das contas e cartões; outros
      apps por nome de pacote); liberar o acesso com o passo guiado de "Permitir
      configurações restritas" (abre as informações do app); bateria com o pedido do
      sistema e o caminho por fabricante (Samsung, Xiaomi, Motorola, Oppo, Huawei). Relê o
      estado ao voltar das configurações.
- [x] Pacotes dos apps de banco em `src/domain/captures/bankApps.ts` (12 bancos do
      catálogo; os demais entram à mão até alguém conferir o pacote).
- [x] Saúde em regras puras (`src/domain/captures/health.ts`): sem módulo, sem acesso, sem
      bancos, bateria, ok.
- [x] Aviso na Início (`HomeCaptureNotice`): convite para quem nunca configurou (pode
      dispensar) e alerta quando a leitura configurada para. Pendentes vazia oferece
      "Configurar leitura".
- [x] Diagnóstico `/captura/diagnostico`: estado, apps lidos, resumo por app (lidas e não
      interpretadas), "Buscar notificações agora" e exportação anonimizada no formato das
      fixtures (`src/domain/captures/diagnostics.ts`; nomes, estabelecimentos, finais de
      cartão, documentos e contatos trocados). `listRecent` entrou no `CapturesService`.
- [x] Entradas no menu Mais.
- [x] Configuração conferida no aparelho (bancos, acesso, bateria, aviso na Início,
      diagnóstico). Pacotes conferidos: Itaú, Nubank e Mercado Pago; os demais de
      `bankApps.ts` ainda sem conferência.

### C · Parsers

- [x] Parser genérico de reserva (`src/domain/captures/parsers/generic.ts`): valor com R$,
      tipo por palavras-chave (entrada, débito, cartão, saída), estabelecimento ou pessoa,
      final do cartão. Recusa compra negada, fatura, limite, código, agendamento e estorno
      (estorno fica para a Fase 3). Data = data local da notificação. Confiança 0,6 a 0,8.
- [x] Fixtures rodadas por `parsers/__tests__/fixtures.test.ts` (17 casos **sintéticos** em
      `__fixtures__/generic.json`).
- [ ] Pelo menos 30 notificações **reais** de 3 ou mais bancos, anonimizadas, em
      `__fixtures__/<banco>.json`. Mais → Diagnóstico da captura → Exportar anonimizado gera
      o JSON nesse formato; confira o texto antes do commit. **5 de 30** (Itaú, Nubank,
      Mercado Pago), do teste de out/2026.
- [x] Genérico ajustado às reais: estabelecimento depois das parcelas ("em 1x … em
      iFood"), valor sem centavos ("R$ 10") e "depositou" como entrada.
- [x] Exportação anonimizada troca também os dígitos de CPF já mascarados pelo banco
      (`XXX.468.266-XX`) e o esperado sai do texto anonimizado.
- [ ] Parsers por banco (`parsers/<banco>.ts`, registrados em `parsers/index.ts`) quando
      as fixtures reais mostrarem formatos que o genérico erra.

### D · Caixa de Pendentes

- [x] Serviço real `createCapturesService(db, …)` (`src/domain/captures/service.ts`) com
      repositório próprio; a suíte de contrato roda no fake e no real (inclui duas leituras
      ao mesmo tempo sem duplicar).
- [x] Aba Pendentes: sugestões com valor, tipo, origem e o texto original; confirmar em 1
      toque, "Confirmar N prontas", descartar com "Desfazer". Não interpretada pede
      "Completar".
- [x] Completar/editar (`/pendente/[id]`): tipo, valor, descrição, conta ou cartão, data,
      categoria e parcelas, com a notificação original no topo.
- [x] Aprende a origem (app + final do cartão → conta ou cartão) a cada confirmação.
- [x] `CaptureIngestor` no layout raiz: lê o módulo ao abrir o app e ao voltar ao primeiro
      plano; a aba também lê ao abrir.
- [ ] Lista + detalhe na faixa expandida; conferência com fonte em 130%.

## Validação no aparelho (out/2026)

Testado num Galaxy S24 (SM-S921B), com Itaú, Nubank e Mercado Pago.

| Item                                                                 | Resultado                                 |
| -------------------------------------------------------------------- | ----------------------------------------- |
| Convite na Início e "Agora não"                                      | ok                                        |
| Configuração: bancos sugeridos, acesso, bateria                      | ok                                        |
| Pix/compra real chega em Pendentes e entra no saldo ao confirmar     | ok                                        |
| Diagnóstico e exportação anonimizada                                 | ok; CPF parcial vazava → corrigido no #26 |
| Aviso "A leitura de notificações parou" ao tirar o acesso            | ok                                        |
| Reinício do celular sem abrir o app                                  | ok (capturou)                             |
| Período sem abrir o app                                              | ok (capturou)                             |
| Pacotes de Itaú, Nubank e Mercado Pago                               | ok                                        |
| NuPay sem estabelecimento; depósito do Mercado Pago não interpretado | corrigidos no #26, **reconferir**         |

- [ ] Medir as metas do portão com números: taxa de captura (meta 95%) e precisão de valor
      e tipo (meta 90%) num período combinado, com pelo menos dois membros.

## Histórico de entregas

| PR  | O que entrou                                                           |
| --- | ---------------------------------------------------------------------- |
| #19 | Kickoff e trilhas A, C e D: módulo Kotlin, parser genérico, Pendentes  |
| #21 | Trilha B: permissão, bancos, aviso na Início, diagnóstico e exportação |
| #23 | JUnit do módulo no CI                                                  |
| #26 | Parsers ajustados às notificações reais; anonimização do CPF mascarado |
| #27 | Contas vira aba e o + volta ao centro                                  |
| #28 | Barra só com ícones (sino em Pendentes, setas em Lançamentos)          |
| #29 | Limpar dados de exemplo apaga também as capturas                       |
