import { screen } from '@testing-library/react-native';

import { currentMonth } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { ServicesProvider } from '@/services';
import { createFakeServices, createFakeStore } from '@/services/fakes';
import { renderWithTheme } from '@/test/render';

import { HomeMonthSummary } from '../HomeMonthSummary';

it('mostra entradas, saídas e a legenda por categoria do mês', async () => {
  const services = createFakeServices(createFakeStore());
  const summary = await services.transactions.getMonthSummary(currentMonth());
  await renderWithTheme(
    <ServicesProvider services={services}>
      <HomeMonthSummary />
    </ServicesProvider>,
  );
  expect(await screen.findByText('Resumo do mês')).toBeOnTheScreen();
  expect(screen.getByText(formatBRL(summary.incomeCents, { sign: 'always' }))).toBeOnTheScreen();
  expect(screen.getByText(formatBRL(-summary.expenseCents))).toBeOnTheScreen();
  if (summary.expensesByCategory.length > 0) {
    expect(screen.getByText('Gastos por categoria')).toBeOnTheScreen();
  }
});
