/** Contrato de AccountsService: roda igual no fake e no serviço real. */
import { isDomainError } from '@/domain/errors';

import { environments, realEnv, TODAY } from './setup';

jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn() }));

describe.each(environments)('AccountsService ($name)', ({ create }) => {
  it('lista as 3 contas com saldo, em ordem alfabética', async () => {
    const { services } = await create();
    const accounts = await services.accounts.listAccountsWithBalance({ until: TODAY });
    expect(accounts.map((a) => a.name)).toEqual(['Carteira', 'Inter', 'Nubank']);
    for (const a of accounts) expect(Number.isSafeInteger(a.balanceCents)).toBe(true);
  });

  it('saldo total é a soma das contas (regra 2)', async () => {
    const { services } = await create();
    const accounts = await services.accounts.listAccountsWithBalance({ until: TODAY });
    expect(await services.accounts.getTotalBalance(TODAY)).toBe(
      accounts.reduce((s, a) => s + a.balanceCents, 0),
    );
  });

  it('getAccountBalance bate com a lista', async () => {
    const { services } = await create();
    for (const a of await services.accounts.listAccountsWithBalance({ until: TODAY })) {
      expect(await services.accounts.getAccountBalance(a.id, TODAY)).toBe(a.balanceCents);
    }
  });

  it('o lançamento previsto do mês que vem não entra no saldo', async () => {
    const { services, seed } = await create();
    const nubank = seed.accounts.find((a) => a.name === 'Nubank')!;
    const now = await services.accounts.getAccountBalance(nubank.id, TODAY);
    const later = await services.accounts.getAccountBalance(nubank.id, '2026-12-31');
    // Até o fim de dezembro só mudam pagamentos de fatura; o aluguel previsto não conta.
    const scheduledRent = seed.transactions.find((t) => t.status === 'scheduled')!;
    expect(scheduledRent.accountId).toBe(nubank.id);
    expect(later).toBeLessThanOrEqual(now);
  });

  it('transferência move o valor e mantém o total (regra 7)', async () => {
    const { services } = await create();
    const [carteira, inter] = await services.accounts.listAccountsWithBalance({ until: TODAY });
    const total = await services.accounts.getTotalBalance(TODAY);
    const [outLeg, inLeg] = await services.accounts.createTransfer({
      fromAccountId: inter.id,
      toAccountId: carteira.id,
      amountCents: 12345,
      date: TODAY,
    });
    expect(outLeg.transferPeerId).toBe(inLeg.id);
    expect(inLeg.transferPeerId).toBe(outLeg.id);
    expect(await services.accounts.getAccountBalance(inter.id, TODAY)).toBe(
      inter.balanceCents - 12345,
    );
    expect(await services.accounts.getAccountBalance(carteira.id, TODAY)).toBe(
      carteira.balanceCents + 12345,
    );
    expect(await services.accounts.getTotalBalance(TODAY)).toBe(total);
  });

  it('ajuste leva o saldo ao valor informado e preserva o histórico (regra 8)', async () => {
    const { services } = await create();
    const [account] = await services.accounts.listAccountsWithBalance({ until: TODAY });
    const adjustment = await services.accounts.adjustBalance(account.id, 777, TODAY);
    expect(adjustment).toMatchObject({ kind: 'adjustment', accountId: account.id });
    expect(await services.accounts.getAccountBalance(account.id, TODAY)).toBe(777);
    expect(await services.accounts.adjustBalance(account.id, 777, TODAY)).toBeNull();
  });

  it('criar, editar, arquivar e excluir conta sem lançamentos', async () => {
    const { services } = await create();
    const created = await services.accounts.createAccount({
      name: 'Poupança',
      type: 'savings',
      institution: 'Caixa',
      color: '#0284C7',
      icon: 'CX',
      initialBalanceCents: 50000,
    });
    expect(await services.accounts.getAccountBalance(created.id, TODAY)).toBe(50000);
    await services.accounts.updateAccount(created.id, { name: 'Reserva' });
    expect((await services.accounts.getAccount(created.id))?.name).toBe('Reserva');

    await services.accounts.setAccountArchived(created.id, true);
    expect(
      (await services.accounts.listAccountsWithBalance()).some((a) => a.id === created.id),
    ).toBe(false);
    const all = await services.accounts.listAccountsWithBalance({ includeArchived: true });
    expect(all.some((a) => a.id === created.id)).toBe(true);

    await services.accounts.deleteAccount(created.id);
    expect(await services.accounts.getAccount(created.id)).toBeUndefined();
    await services.accounts.restoreAccount(created.id);
    expect(await services.accounts.getAccount(created.id)).toBeDefined();
  });

  it('conta com lançamentos não pode ser excluída', async () => {
    const { services, seed } = await create();
    const error = await services.accounts
      .deleteAccount(seed.accounts[0].id)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
  });

  it('transferência para a mesma conta é recusada', async () => {
    const { services, seed } = await create();
    const id = seed.accounts[0].id;
    const error = await services.accounts
      .createTransfer({ fromAccountId: id, toAccountId: id, amountCents: 100, date: TODAY })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
  });
});

it('o serviço real usa DomainError para regras', async () => {
  const { services, seed } = await realEnv.create();
  const error = await services.accounts.deleteAccount(seed.accounts[0].id).catch((e: unknown) => e);
  expect(isDomainError(error) && error.code).toBe('account_has_transactions');
});
