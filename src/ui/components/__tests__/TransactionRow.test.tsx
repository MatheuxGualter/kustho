import { fireEvent, screen } from '@testing-library/react-native';

import { formatBRL } from '@/lib/money';
import { renderWithTheme } from '@/test/render';

import { TransactionRow, type TransactionRowProps } from '../TransactionRow';

const base: TransactionRowProps['transaction'] = {
  kind: 'card_purchase',
  amountCents: 45900,
  direction: null,
  description: 'Notebook',
  status: 'posted',
  installmentNumber: 2,
  installmentTotal: 10,
};

describe('TransactionRow', () => {
  it('mostra descrição, origem, categoria, parcela e valor negativo', async () => {
    await renderWithTheme(
      <TransactionRow
        transaction={base}
        originName="Nubank Roxinho"
        category={{ name: 'Compras', icon: 'shopping-bag', color: '#DB2777' }}
      />,
    );
    expect(screen.getByText('Notebook')).toBeOnTheScreen();
    expect(screen.getByText('Nubank Roxinho · Compras · 2/10')).toBeOnTheScreen();
    expect(screen.getByText(formatBRL(-45900))).toBeOnTheScreen();
  });

  it('transferência sem categoria usa o rótulo do tipo e fica sem cor', async () => {
    await renderWithTheme(
      <TransactionRow
        transaction={{
          ...base,
          kind: 'transfer',
          direction: 'in',
          installmentNumber: null,
          installmentTotal: null,
        }}
        originName="Carteira"
      />,
    );
    expect(screen.getByText('Carteira · Transferência')).toBeOnTheScreen();
    expect(screen.getByText(formatBRL(45900))).toBeOnTheScreen();
  });

  it('marca lançamento previsto', async () => {
    await renderWithTheme(
      <TransactionRow
        transaction={{
          ...base,
          kind: 'expense',
          status: 'scheduled',
          installmentNumber: null,
          installmentTotal: null,
        }}
        originName="Nubank"
      />,
    );
    expect(screen.getByText('Nubank · Previsto')).toBeOnTheScreen();
  });

  it('editar e excluir também por ações de acessibilidade', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    await renderWithTheme(
      <TransactionRow
        transaction={base}
        originName="Nubank"
        onPress={() => {}}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    const row = screen.getByRole('button', { name: /Notebook/ });
    await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'edit' } });
    await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
