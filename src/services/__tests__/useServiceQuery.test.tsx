import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ServicesProvider, useServiceQuery, useServices } from '..';
import { createFakeServices, createFakeStore } from '../fakes';

const today = '2026-10-17';

function AccountCount() {
  const { accounts } = useServices();
  const query = useServiceQuery(() => accounts.listAccountsWithBalance({ until: today }), []);
  if (query.status !== 'success') return <Text>carregando</Text>;
  return <Text>{`${query.data.length} contas`}</Text>;
}

it('recarrega sozinho depois de uma escrita', async () => {
  const services = createFakeServices(createFakeStore(today));
  await render(
    <ServicesProvider services={services}>
      <AccountCount />
    </ServicesProvider>,
  );
  expect(await screen.findByText('3 contas')).toBeOnTheScreen();

  await act(async () => {
    await services.accounts.createAccount({
      name: 'Poupança',
      type: 'savings',
      institution: 'Caixa',
      color: '#0284C7',
      icon: 'CX',
      initialBalanceCents: 0,
    });
  });
  expect(await screen.findByText('4 contas')).toBeOnTheScreen();
});
