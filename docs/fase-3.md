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
- [ ] Contratos de cada trilha entram junto com a trilha (abaixo), no fake e no real, com
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

- [ ] `merchantKey` normalizado; regra atualizada a cada confirmação (categoria e origem).
- [ ] Captura nova chega com categoria e origem da regra (a regra de origem por app da
      Fase 2 continua valendo quando não há regra do estabelecimento).

### C · Casos especiais

- [ ] Duplicata push + SMS (ou notificação + comprovante) em até 5 minutos vira um item só.
- [ ] Estorno capturado ligado à compra original.
- [ ] Parcelado capturado ("em 3x") gera as parcelas pelas regras da Fase 1.

### D · Experiência

- [ ] "Vincular" em Pendentes quando o matcher acha o lançamento.
- [ ] Precisão por fonte (confirmadas sem edição ÷ confirmadas) e chave "lançar
      automaticamente" por fonte, só liberada com ≥ 95%.
- [ ] Lançamento automático com selo e "Desfazer"; resumo do que entrou sozinho.

### E · Comprovantes compartilhados (nova)

Motivação: alguns bancos só notificam o Pix **recebido**. Quem envia um Pix abre o
comprovante, toca em **Compartilhar** e escolhe o Kustho; o app lê o comprovante e sugere a
saída em Pendentes, sem digitar.

- [ ] Kustho aparece no menu de compartilhar do Android para texto, imagem e PDF
      (`expo-sharing`, rota que recebe o conteúdo).
- [ ] Texto do comprovante: direto quando vem como texto; imagem e PDF passam por OCR **no
      aparelho** (nada sai do celular).
- [ ] Parser de comprovante (puro, com fixtures anonimizadas): valor, tipo (Pix enviado ou
      recebido), quem recebeu/pagou, data, instituição.
- [ ] Vira captura com `channel: 'receipt'` em Pendentes (e passa pelo matcher e pelas
      regras como qualquer captura).

## Validação no aparelho

Ainda não começou.

## Histórico de entregas

| PR  | O que entrou |
| --- | ------------ |
