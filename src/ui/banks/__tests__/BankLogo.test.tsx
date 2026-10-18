import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { InstitutionAvatar } from '@/ui/components/InstitutionAvatar';

import { bankIcon } from '../banks';
import { BankPicker } from '../BankPicker';

describe('InstitutionAvatar', () => {
  it('banco reconhecido pelo nome mostra o logo', async () => {
    await renderWithTheme(
      <InstitutionAvatar institution="Banco Inter" color="#EA580C" icon="BI" />,
    );
    expect(screen.getByLabelText('Inter')).toBeOnTheScreen();
    expect(screen.queryByText('BI', { includeHiddenElements: true })).toBeNull();
  });

  it('banco escolhido no ícone vale mesmo com outro nome', async () => {
    await renderWithTheme(
      <InstitutionAvatar institution="Minha conta" color="#EA580C" icon={bankIcon('nubank')} />,
    );
    expect(screen.getByLabelText('Nubank')).toBeOnTheScreen();
  });

  it('conta de dinheiro mostra a carteira, nunca iniciais nem logo', async () => {
    await renderWithTheme(
      <InstitutionAvatar institution="Dinheiro" color="#475569" icon="DI" accountType="cash" />,
    );
    expect(screen.queryByText('DI', { includeHiddenElements: true })).toBeNull();
    // Mesmo com nome de banco, dinheiro não vira logo.
    await renderWithTheme(
      <InstitutionAvatar institution="Nubank" color="#475569" accountType="cash" />,
    );
    expect(screen.queryByLabelText('Nubank')).toBeNull();
  });

  it('instituição fora do catálogo mostra as iniciais', async () => {
    await renderWithTheme(<InstitutionAvatar institution="Carteira" color="#475569" icon="CA" />);
    expect(screen.getByText('CA', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});

describe('BankPicker', () => {
  it('mostra os 20 bancos e "Outro"', async () => {
    await renderWithTheme(<BankPicker value={null} onChange={() => {}} />);
    expect(screen.getAllByRole('radio')).toHaveLength(21);
  });

  it('escolher banco devolve o banco; "Outro" devolve null', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<BankPicker value="itau" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Itaú' })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'Nubank' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'nubank' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Outro' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
