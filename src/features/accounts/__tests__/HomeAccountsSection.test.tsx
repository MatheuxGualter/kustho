import { screen } from '@testing-library/react-native';

import { formatBRL } from '@/lib/money';
import { ServicesProvider } from '@/services';
import { createFakeServices, createFakeStore } from '@/services/fakes';
import { renderWithTheme } from '@/test/render';

import { HomeAccountsSection } from '../HomeAccountsSection';

it('mostra o saldo total e as contas', async () => {
  const services = createFakeServices(createFakeStore());
  const accounts = await services.accounts.listAccountsWithBalance();
  const total = accounts.reduce((s, a) => s + a.balanceCents, 0);

  await renderWithTheme(
    <ServicesProvider services={services}>
      <HomeAccountsSection />
    </ServicesProvider>,
  );

  expect(await screen.findByText(formatBRL(total))).toBeOnTheScreen();
  for (const account of accounts) expect(screen.getByText(account.name)).toBeOnTheScreen();
});

it('sem contas, convida a criar a primeira', async () => {
  const store = createFakeStore();
  store.accounts = [];
  await renderWithTheme(
    <ServicesProvider services={createFakeServices(store)}>
      <HomeAccountsSection />
    </ServicesProvider>,
  );
  expect(await screen.findByText('Nenhuma conta ainda')).toBeOnTheScreen();
});
