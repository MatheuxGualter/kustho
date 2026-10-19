# Fase 3 — Conciliação semi e automática (status)

**Portão:** por banco, a porcentagem de pendentes confirmadas **sem edição** é medida no
uso real; o nível automático só é ligado para a fonte que passar de 95%.

Documento vivo da fase, no formato de [`fase-1.md`](fase-1.md) e [`fase-2.md`](fase-2.md):
quem fechar um item marca o `[x]` no mesmo PR. Escopo: "Fase 3" em [`plano.md`](plano.md).

| Nível                   | Comportamento                                                                                           | Liberado quando                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1. Assistido            | Captura vira sugestão em Pendentes; o usuário confirma (Fase 2)                                         | Entregue                                   |
| 2. Semiautomático       | Sugestão chega com categoria e origem; vincula a lançamentos manuais já existentes; confirmação em lote | Precisão ≥ 90% no nível 1                  |
| 3. Automático por fonte | "Lançar automaticamente" por banco; entra com selo "automático" e "Desfazer"; resumo do que entrou      | ≥ 95% das confirmações sem edição na fonte |

## Kickoff

- [x] Colunas novas em `captures` (migração `0003_fase3_conciliacao`, **revisão humana**):
      `channel` (`notification` | `receipt`), `suggestedCategoryId`, `installments`,
      `matchTransactionId` + `matchScore`, `duplicateOfId`, `editedOnConfirm`,
      `autoConfirmed`. Capturas antigas recebem os padrões.
- [x] Tabelas `merchant_rules` (estabelecimento → categoria e origem, trilha B) e
      `capture_sources` (nível automático por fonte, trilha D). Entram em `clearDevData`.
- [x] `source: 'receipt'` nos lançamentos (trilha E).
- [x] `captureExtrasDefaults` em `src/domain/captures/rules.ts`: campos da Fase 3 numa
      captura nova.
- [x] Contratos de cada trilha entram junto com a trilha (abaixo), no fake e no real, com
      suíte de contrato.

## Trilhas

| Trilha                  | Entrega                                                                                                                    | Pastas                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| A · Matcher             | `matcher.ts` puro: candidatos, pontuação, decisão "vincular" × "criar"; `linkCapture` no serviço                           | `src/domain/captures/matcher.ts`                        |
| B · Regras aprendidas   | `merchant_rules` alimentada a cada confirmação; sugestões chegam com categoria e origem                                    | `src/domain/captures/` (regras), repositório            |
| C · Casos especiais     | Duplicata (mesmo valor em até 5 min de fontes diferentes); estorno ligado à compra; parcelado gera as parcelas             | `src/domain/captures/`, parsers                         |
| D · Experiência         | "Vincular" em Pendentes; confirmação em lote; automático por fonte com histórico de precisão; resumo do que entrou sozinho | `src/features/pending/`, `src/features/capture-setup/`  |
| E · Comprovantes (nova) | Compartilhar o comprovante de um Pix (texto, imagem ou PDF) com o Kustho vira captura em Pendentes                         | `modules/receipt-reader/`, `src/domain/receipts/`, rota |

### A · Matcher

- [x] Candidatos: lançamentos não conciliados com o mesmo valor e tipo, na mesma conta ou
      cartão (quando a captura tem origem), até 2 dias de distância
      (`src/domain/captures/matcher.ts`).
- [x] Pontuação 0–1: base 0,5; mesma origem +0,2; descrição parecida até +0,3; −0,1 por
      dia de distância. Limiar para vincular: 0,7.
- [x] Decisão: acima do limiar, `matchTransactionId` na captura; empate fica com o
      lançamento mais antigo, para cada captura pegar um.
- [x] Testes por cenário: lançamento manual já existente; dois gastos iguais no mesmo dia;
      candidato fraco vira "criar".
- [x] `linkCapture` no `CapturesService` (fake e real, suíte de contrato): confirma ligando
      ao lançamento existente, sem criar outro, e aprende a origem. Lançamento já ligado:
      `already_linked`.
- [x] Pendentes mostra "Parece ser…" com **Vincular** e "É outro, criar"; "Confirmar N
      prontas" vincula as que têm sugestão.

### B · Regras aprendidas

- [x] `merchantKey` normalizado (sem acento, caixa, números, pontuação e "LTDA"/"S.A."); regra
      atualizada a cada confirmação e a cada vínculo, com categoria e origem
      (`src/domain/captures/merchantRules.ts`, `upsertMerchantRule` soma `hits`).
- [x] Captura nova (notificação ou comprovante) chega com a categoria da regra; a origem da
      regra só entra quando a captura não tem origem e ela serve ao tipo (cartão não vale
      para entrada). A regra de origem por app da Fase 2 continua valendo antes dela.
- [x] `editedOnConfirm` gravado ao confirmar (`confirmationEdited`): base da precisão por
      fonte da trilha D.

### C · Casos especiais

- [x] Duplicata: mesmo valor e tipo de **outra** fonte (outro app ou canal) em até 5 minutos
      (60 com comprovante) vira um item só; a segunda fica descartada com `duplicateOfId`.
      Vale contra pendentes e confirmadas; o mesmo app duas vezes são duas compras
      (`findDuplicate` em `src/domain/captures/special.ts`). Comprovante de um Pix já
      confirmado avisa "Já está no Kustho".
- [x] Estorno capturado: o genérico lê "estorno" (no cartão vira o tipo `card_refund`; Pix
      estornado, entrada). `findRefundTarget` acha a compra (mesmo cartão, até 120 dias
      antes, saldo a estornar que cubra o valor, loja parecida ou valor exato) e grava em
      `matchTransactionId`; confirmar chama `refundCardPurchase`. Sem compra: incompleta.
      Pendentes mostra "Estorno da compra:". Pendência: o estorno sai com `source: 'manual'`
      (`refundCardPurchase` ainda não recebe `source`).
- [x] Parcelado capturado ("em 3x", "parcelado em 10 vezes", "3x de R$ 100,00" → total)
      grava `installments`; confirmar gera as parcelas pelas regras da Fase 1 e a tela de
      completar já vem com as parcelas (e a categoria da trilha B).

### D · Experiência

- [x] "Vincular" em Pendentes quando o matcher acha o lançamento (entregue com a trilha A).
- [x] Precisão por fonte (`src/domain/captures/precision.ts`): confirmadas sem edição ÷
      confirmadas pelo usuário (as automáticas não contam). `getSourceStats` no serviço.
- [x] Chave "Lançar automaticamente" por fonte no Diagnóstico (`setAutoConfirm`, tabela
      `capture_sources`): só liga com 20 confirmações e ≥ 95% sem edição; senão
      `auto_confirm_not_eligible`. Desligar sempre pode. Comprovantes aparecem como fonte
      própria.
- [x] Com a chave ligada **e** a fonte ainda acima do portão, `ingest` confirma sozinho o
      que vier pronto (interpretada, com origem, sem sugestão de vínculo, sem ser estorno
      nem duplicata) e grava `autoConfirmed`.
- [x] Resumo em Pendentes: "N lançamentos entraram sozinhos" nos últimos 7 dias, com selo
      "automático" e **Desfazer** (`undoAutoConfirm`: exclui o lançamento e as parcelas,
      a captura volta a pendente).

### E · Comprovantes compartilhados (nova)

Motivação: alguns bancos só notificam o Pix **recebido**. Quem envia um Pix abre o
comprovante, toca em **Compartilhar** e escolhe o Kustho; o app lê o comprovante e sugere a
saída em Pendentes, sem digitar.

- [x] Kustho aparece no menu de compartilhar do Android para texto, imagem e PDF
      (`expo-sharing` no `app.json`); o Android abre `kustho://expo-sharing`
      (`src/app/expo-sharing.tsx` → `ReceiptShareScreen`).
- [x] Texto do comprovante: direto quando vem como texto; imagem e PDF passam por OCR **no
      aparelho** — módulo `modules/receipt-reader` (Kotlin + ML Kit com modelo embutido; PDF
      renderizado pelo `PdfRenderer`). **Revisão humana do Kotlin.**
- [x] Parser de comprovante puro (`src/domain/receipts/parser.ts`) com fixtures sintéticas
      no estilo de Nubank, Itaú, Inter, Mercado Pago, Pix recebido e texto numa linha: valor,
      tipo, quem recebeu/pagou, data, instituição.
- [x] Vira captura com `channel: 'receipt'` (`ingestReceipt` no `CapturesService`, fake e
      real, suíte de contrato): conta sugerida pelo banco citado no comprovante, matcher,
      mesmo comprovante não duplica; confirmar cria lançamento com `source: 'receipt'`.
- [x] Depois de ler, abre direto a confirmação (`/pendente/[id]`); falha mostra o motivo
      e "Lançar à mão". Dica na tela de leitura de notificações.
- [x] CI compila os módulos Kotlin (job `android`) e roda o JUnit das regras puras dos
      dois módulos.
- [ ] Testar no aparelho com comprovantes reais de cada banco e guardar os textos
      anonimizados como fixtures.

## Validação no aparelho

Ainda não começou. Antes: `npx expo prebuild --clean --platform android` e `pnpm android`
(módulo `receipt-reader` e `expo-sharing` novos). Roteiro:

- [ ] Comprovante de Pix enviado (texto, imagem e PDF) de cada banco → abre a confirmação
      com valor, quem recebeu e a conta; guardar o texto anonimizado como fixture.
- [ ] Lançamento manual + notificação igual → "Vincular" não cria outro.
- [ ] Confirmar duas vezes o mesmo estabelecimento → a terceira chega com categoria e conta.
- [ ] Pix notificado e comprovante compartilhado → um item só ("Já está no Kustho" se já
      confirmado).
- [ ] Notificação de estorno de uma compra → "Estorno da compra:" e o estorno na fatura.
- [ ] Compra parcelada notificada → parcelas certas na fatura.
- [ ] Diagnóstico mostra a precisão por fonte; com uma fonte liberada, ligar a chave e
      conferir o selo "automático" e o "Desfazer".

## Histórico de entregas

| PR  | O que entrou                                                     |
| --- | ---------------------------------------------------------------- |
| #32 | Kickoff: colunas e tabelas da Fase 3, `source: 'receipt'`        |
| #33 | Trilha A: matcher e "Vincular"                                   |
| #34 | Trilha E: comprovante compartilhado, OCR no aparelho             |
| #35 | Trilha B: regras por estabelecimento                             |
| #36 | Trilha C: duplicatas, estorno e parcelado capturados             |
| #37 | Trilha D: precisão por fonte, lançamento automático e "Desfazer" |
