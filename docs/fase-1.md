# Fase 1 — CRUD financeiro (status)

**Portão:** o saldo de cada conta e a fatura de cada cartão no app batem com os do banco,
num teste com gastos reais de pelo menos dois membros.

Este é o documento vivo da fase: o que já está em `main`, o que falta e onde mexer. Quem
fechar um item marca o `[x]` **no mesmo PR**. Regras de negócio: "Modelo de dados e
regras" em [`plano.md`](plano.md).

## Situação

Todas as telas da fase existem e usam os serviços reais (SQLite). Falta o que depende de
gente (teste de uso, Maestro) e alguns itens nativos (exigem recompilar).

| Peça                   | Onde                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Contratos dos serviços | `src/domain/contracts.ts` (`AccountsService`, `TransactionsService`, `CardsService`, `CategoriesService`) |
| Serviços reais         | `src/domain/<domínio>/service.ts`, registrados em `src/services/app.ts`                                   |
| Fakes em memória       | `src/services/fakes/` (testes de tela; começam com as categorias padrão)                                  |
| Suítes de contrato     | `src/services/__tests__/contracts/` (o mesmo teste roda no fake e no real)                                |
| Regras puras           | `src/domain/**/rules.ts`, `balance.ts`, `cycle.ts`, `display.ts`                                          |
| Banco                  | `src/db/` (schema, migrações, repositórios, seed de categorias, `devSeed.ts`)                             |
| Componentes base       | `src/ui/components/` e catálogo `dev/ui` (Mais → Catálogo, só em build de desenvolvimento)                |
| Logos dos bancos       | `src/ui/banks/` (20 bancos; gerados por `scripts/bank-logos.mjs`)                                         |
| Ícone e splash         | `assets/images/` (ver "Ícone do app" em [`como-rodar.md`](como-rodar.md))                                 |

## Como uma tela lê e escreve

```tsx
const { accounts } = useServices();
const query = useServiceQuery(() => accounts.listAccountsWithBalance(), []);
if (!query.data) return <SkeletonRows />;
// ...
await accounts.createTransfer({ ... }); // todas as consultas abertas recarregam sozinhas
```

- Telas **nunca** importam `@/db`: só `useServices()`.
- Serviços reais não precisam avisar mudanças: o listener do SQLite faz isso. Os fakes
  chamam `notifyDataChanged()`.
- Erro de regra: o serviço lança `DomainError`; a tela mostra `errorMessage(e)`.

## Mudar ou criar um serviço

1. Regra nova: teste primeiro em `src/domain/<domínio>/__tests__/`, depois a função pura.
2. Método novo no contrato (`contracts.ts`, arquivo de alto conflito): implemente no
   **fake e no real** e cubra na suíte de contrato (`src/services/__tests__/contracts/`).
3. Testes que tocam o banco usam `createTestDb()` (SQLite real em memória com as migrações).
4. Mudou `src/db/schema.ts`? Atualize `src/domain/types.ts` e rode `pnpm db:generate`
   (o CI recusa migração faltando). Migração tem revisão humana obrigatória.

## Trilhas

| Trilha                       | Serviço               | Rotas                                                                                                   | Pastas                                                                         |
| ---------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| A · Contas                   | `AccountsService`     | `/contas`, `/conta/nova`, `/conta/[id]`, `/transferencia`                                               | `src/domain/accounts/`, `src/features/accounts/`                               |
| B · Lançamentos              | `TransactionsService` | aba Lançamentos, `/lancamento/novo`, `/lancamento/[id]`                                                 | `src/domain/transactions/`, `src/features/transactions/`                       |
| C · Cartões e faturas        | `CardsService`        | aba Cartões, `/cartao/novo`, `/cartao/[id]`, `/fatura/[id]`, `/fatura/[id]/pagar`                       | `src/domain/cards/`, `src/domain/invoices/`, `src/features/cards/`             |
| D · Categorias e visão geral | `CategoriesService`   | Início (dono), Mais (dono), `/categorias`, `/categoria/*`, `/configuracoes`, `/exportar`, `/onboarding` | `src/domain/categories/`, `src/features/categories/`, `src/features/overview/` |

Os donos de cada trilha ainda não foram definidos; combine no grupo antes de pegar uma
pendência de outra trilha.

### A · Contas

- [x] Regras 1, 2, 7 e 8 (saldo, saldo total, transferência, ajuste) com testes
      (`src/domain/accounts/balance.ts`).
- [x] Serviço real com suíte de contrato; arquivar; excluir só sem lançamentos, com
      "Desfazer".
- [x] Telas: lista, nova/editar (tipo primeiro; banco pelo `BankPicker`; dinheiro vira
      "Carteira"), detalhe com extrato e ajuste de saldo, transferência.
- [x] `HomeAccountsSection` (saldo total + cards de conta) na Início.

### B · Lançamentos

- [x] Regras puras: agrupar por dia, resumo do mês, filtros, o que é excluído junto
      (`src/domain/transactions/rules.ts`).
- [x] Serviço real com suíte de contrato. Editar uma perna da transferência ajusta a outra.
- [x] Novo lançamento: tipo, valor, descrição e origem de cara (lembra a última origem);
      categoria, data, parcelas e observações em "Mais opções". Data futura vira previsto.
- [x] Aba Lançamentos: `MonthSwitcher`, busca sem acentos, filtro por tipo, lista por dia
      (FlashList), deslizar para editar ou excluir com "Desfazer".
- [x] Previstos vencidos: aviso no topo da lista para confirmar.
- [x] Editar e excluir lançamento.
- [ ] Medir os 10 lançamentos cronometrados (meta < 5 s) no teste de uso.

### C · Cartões e faturas

- [x] Regras 3 a 6 e estorno com testes (`src/domain/cards/rules.ts`,
      `src/domain/invoices/cycle.ts`).
- [x] Serviço real com suíte de contrato, incluindo "compra em 3x aparece em 3 faturas" e
      "pagar fatura reduz o saldo".
- [x] Telas: aba Cartões, novo/editar cartão, detalhe com faturas, fatura com compras e
      estorno, pagar fatura (total ou parcial). `HomeCardsSection` na Início.
- [x] Estorno total ou parcial pela interface (`/fatura/[id]/estorno`, com valor e data).
- [x] Estornos de uma compra somados não passam do valor dela (`refundOfId` liga o estorno
      à compra; migração `0002_refund_of` liga os estornos antigos pela descrição).

### D · Categorias e visão geral

- [x] Serviço real com suíte de contrato (nome repetido recusado, excluir em uso move os
      lançamentos, "Desfazer").
- [x] `CategoryPicker` (grade com busca; nomes longos encolhem ou quebram em 2 linhas).
- [x] Telas de categorias; 94 ícones em 8 grupos (`categoryIconGroups`).
- [x] 30 categorias padrão (`src/db/seed.ts`); quem já tinha o app recebe as novas uma vez.
- [x] `HomeMonthSummary`: período (dia, semana, mês, ano), entradas, saídas, resultado e
      rosca clicável por categoria.
- [x] Configurações (tema, ocultar valores, bloqueio por biometria ou PIN), bloqueio ao
      voltar de segundo plano, exportar CSV e JSON, boas-vindas.
- [x] `FLAG_SECURE` com o bloqueio ligado: tela em branco nos apps recentes e sem prints
      (`expo-screen-capture`). Bloqueio desligado libera prints para reportar bugs.
- [x] Exportar como arquivo `.csv`/`.json` (`expo-sharing` + `expo-file-system`; sem o
      módulo, cai no compartilhamento de texto).

## Checklist de polimento

- [x] Estados vazios e skeletons
- [x] Vibração leve nas ações principais; desfazer em toda exclusão
- [x] Valores com máscara de banco (`MoneyField`), datas com `DateField`, campos acima do
      teclado (`Screen`), faixas horizontais com degradê (`ChipSelect`)
- [x] Lista + detalhe na faixa expandida em Lançamentos (≥ 600 dp: lista à esquerda,
      edição à direita)
- [ ] Lista + detalhe nas demais listas (contas, cartões, Pendentes)
- [ ] Conferência completa com fonte em 130%, leitor de tela e contraste AA nos dois temas
- [x] Contraste do verde de receita no tema claro: `#15803D` (AA ≥ 4.5; o teste de
      contraste agora cobre `income`)

## Integração

- [x] Todos os fakes trocados pelos serviços reais (`src/services/app.ts`).
- [x] Fluxos Maestro escritos (`.maestro/`): lançar despesa; compra em 3x aparece em 3
      faturas; pagar fatura reduz o saldo. Começam de `kustho://dev/seed`.
- [ ] Rodar os fluxos do Maestro num aparelho. 1ª rodada (out/2026): os 4 falharam no
      preparo (o link chegava antes do app carregar); `_preparar.yaml` agora espera a Início.
      Rodar de novo.
- [x] **Teste de uso** (versão curta, out/2026): gastos reais lançados no aparelho;
      funcionou. Atritos encontrados e corrigidos: estorno acumulado (#25) e acentos no
      CSV (#25).
- [ ] Revisar os logos dos bancos antes de qualquer publicação na Play Store.

## Histórico de entregas

| PR     | O que entrou                                                                   |
| ------ | ------------------------------------------------------------------------------ |
| #1–#10 | Fase 0 (base, tema, banco, componentes) e as quatro trilhas da Fase 1          |
| #11    | Correções de usabilidade: teclado, máscara de valor, cortes de texto, degradês |
| #12    | Logos oficiais dos 20 bancos mais usados                                       |
| #13    | Ícone de carteira para contas de dinheiro                                      |
| #14    | Ações de deslizar não aparecem por cima da lista; títulos de mês               |
| #15    | Mais ícones e categorias padrão; nomes de categoria sem corte                  |
| #16    | Ícone do app (capivara) e splash                                               |
