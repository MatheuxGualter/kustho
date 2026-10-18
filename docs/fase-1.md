# Fase 1 — CRUD financeiro (kickoff)

**Portão:** o saldo de cada conta e a fatura de cada cartão no app batem com os do banco,
num teste com gastos reais de pelo menos dois membros.

Este documento é o resultado do kickoff: o que já está em `main` e o que cada trilha
entrega. Regras de negócio: seção "Modelo de dados e regras" de [`plano.md`](plano.md).

## Já pronto (kickoff)

| Peça                                  | Onde                                                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Contratos dos serviços                | `src/domain/contracts.ts` (`AccountsService`, `TransactionsService`, `CardsService`, `CategoriesService`) |
| Fakes em memória de cada serviço      | `src/services/fakes/` (começam com os dados de exemplo)                                                   |
| Registro dos serviços                 | `src/services/index.tsx` (`useServices()`)                                                                |
| Leitura reativa                       | `useServiceQuery(() => service.metodo(...), [deps])`                                                      |
| Rotas de todas as telas da fase       | `src/app/` (placeholders com a trilha dona)                                                               |
| Ciclo de fatura (regras 3 e 4, datas) | `src/domain/invoices/cycle.ts`                                                                            |
| Repositórios por tabela               | `src/db/repositories/`                                                                                    |
| Componentes base                      | `src/ui/components/` e catálogo `dev/ui`                                                                  |

## Como uma tela lê e escreve

```tsx
const { accounts } = useServices();
const query = useServiceQuery(() => accounts.listAccountsWithBalance(), []);
if (query.status === 'loading') return <Skeleton />;
// ...
await accounts.createTransfer({ ... }); // todas as consultas abertas recarregam sozinhas
```

- Telas **nunca** importam `@/db`: só `useServices()`.
- Serviços reais não precisam avisar mudanças: o listener do SQLite faz isso. Os fakes
  chamam `notifyDataChanged()`.

## Trocar o fake pelo serviço real

1. Implemente `createXxxService(db: AppDatabase): XxxService` em `src/domain/<domínio>/service.ts`.
2. Regras em funções puras ao lado (`balance.ts`, `installments.ts`…), com testes escritos
   **antes**. Testes que tocam o banco usam `createTestDb()`.
3. Troque a linha da sua trilha em `createAppServices()` (`src/services/index.tsx`).
4. Rode os testes de fumaça dos fakes contra o real, se quiser: eles usam só o contrato.

## Trilhas

| Trilha                       | Dono        | Serviço               | Rotas                                                                                                   | Pastas                                                                         |
| ---------------------------- | ----------- | --------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| A · Contas                   | _a definir_ | `AccountsService`     | `/contas`, `/conta/nova`, `/conta/[id]`, `/transferencia`                                               | `src/domain/accounts/`, `src/features/accounts/`                               |
| B · Lançamentos              | _a definir_ | `TransactionsService` | aba Lançamentos, `/lancamento/novo`, `/lancamento/[id]`                                                 | `src/domain/transactions/`, `src/features/transactions/`                       |
| C · Cartões e faturas        | _a definir_ | `CardsService`        | aba Cartões, `/cartao/novo`, `/cartao/[id]`, `/fatura/[id]`, `/fatura/[id]/pagar`                       | `src/domain/cards/`, `src/domain/invoices/`, `src/features/cards/`             |
| D · Categorias e visão geral | _a definir_ | `CategoriesService`   | Início (dono), Mais (dono), `/categorias`, `/categoria/*`, `/configuracoes`, `/exportar`, `/onboarding` | `src/domain/categories/`, `src/features/categories/`, `src/features/overview/` |

### A · Contas

- Regras 1, 2, 7 e 8 (saldo, saldo total, transferência, ajuste) com testes.
- CRUD de contas: arquivar; excluir só sem lançamentos.
- `HomeAccountsSection` (saldo total + cards de conta) para a Início.

### B · Lançamentos

- [x] Regras puras: agrupar por dia, resumo do mês, filtros, o que é excluído junto
      (`src/domain/transactions/rules.ts`).
- [x] Serviço real `createTransactionsService(db)` com suíte de contrato (fake e real).
      Editar uma perna da transferência ajusta a outra.
- [x] Novo lançamento: tipo, valor no `AmountKeypad`, descrição e origem visíveis de cara
      (lembra a última origem); categoria, data, parcelas (cartão) e observações em "Mais
      opções". Data futura vira previsto.
- [x] Aba Lançamentos: `MonthSwitcher` (setas, deslize, toque volta ao mês atual), busca
      sem acentos, filtro por tipo, lista por dia (FlashList), deslizar para editar ou excluir
      com "Desfazer".
- [x] Previstos vencidos: aviso no topo da lista para confirmar.
- [x] Editar e excluir lançamento.
- [ ] Trocar o fake pelo real no registro (na integração).
- [ ] Medir os 10 lançamentos cronometrados (meta < 5 s) no teste de uso.

### C · Cartões e faturas

- [x] Regras 3 a 6 e estorno com testes (`src/domain/cards/rules.ts`): totais da fatura,
      situação (aberta, fechada, parcial, paga, recalculada na leitura), limite disponível
      com parcelas futuras, parcelas com resto na 1ª, estorno na fatura certa.
- [x] Serviço real `createCardsService(db)` com suíte de contrato (fake e real), incluindo
      "compra em 3x aparece em 3 faturas" e "pagar fatura reduz o saldo".
- [x] Telas: aba Cartões (`CreditCardVisual`), novo/editar cartão, detalhe com faturas
      atual, próximas e anteriores, fatura com compras e estorno, pagar fatura (total ou
      parcial).
- [x] `HomeCardsSection` na Início.
- [x] Campo de parcelas no novo lançamento (entregue junto com a B).
- [ ] Estorno parcial pela interface (o serviço já aceita; a tela estorna o valor total).
- [ ] Trocar o fake pelo real no registro (na integração).

### D · Categorias e visão geral

- [x] Serviço real `createCategoriesService(db)` com suíte de contrato: nome repetido no
      mesmo tipo recusado, excluir em uso exige mover os lançamentos, "Desfazer" quando não
      há lançamentos (`restoreCategory` e `countUsage` entraram no contrato).
- [x] `CategoryPicker` (grade com ícones e busca), usado no novo lançamento e na edição.
- [x] Telas de categorias: lista por tipo com uso, nova/editar com ícone e cor, excluir
      movendo os lançamentos.
- [x] `HomeMonthSummary`: entradas, saídas, resultado, previsto e rosca por categoria
      (SVG; top 4 + "Outros").
- [x] Configurações: tema, ocultar valores, bloqueio por biometria ou PIN do aparelho.
- [x] Bloqueio ao abrir e ao voltar de segundo plano; conteúdo coberto fora de primeiro
      plano.
- [x] Exportar CSV (pt-BR, `;`, BOM) e JSON pelo compartilhamento do sistema
      (`listAllTransactions` entrou no contrato).
- [x] Boas-vindas em 3 passos, mostradas uma vez.
- [ ] `FLAG_SECURE` para a tela de apps recentes não mostrar nada (precisa de
      `expo-screen-capture`, módulo nativo: exige recompilar).
- [ ] Exportar como arquivo (hoje vai como texto no compartilhamento; arquivo precisa de
      `expo-sharing`, módulo nativo).

## Checklist de polimento (cada trilha nas suas telas)

- [ ] Estados vazios e skeletons; nenhuma tela em branco
- [ ] Vibração leve nas ações principais; desfazer em toda exclusão
- [ ] Lista + detalhe na faixa expandida (tablet e dobrável)
- [ ] Fonte em 130%, rótulos de acessibilidade e contraste AA

## Integração

- Trocar todos os fakes pelos serviços reais.
- Testes ponta a ponta com Maestro: lançar despesa; compra em 3x aparece em 3 faturas;
  pagar fatura reduz o saldo.
- **Teste de uso:** cada membro lança os próprios gastos reais por um período combinado.
  Cronometrem 10 lançamentos (meta: menos de 5 s cada) e registrem os atritos.
