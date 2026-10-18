import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { renderWithTheme } from '@/test/render';

import { MoneyField } from '../MoneyField';

function Harness({ allowNegative = false, spy }: { allowNegative?: boolean; spy: jest.Mock }) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <MoneyField
      label="Valor"
      value={value}
      allowNegative={allowNegative}
      onChange={(v) => {
        spy(v);
        setValue(v);
      }}
    />
  );
}

const setup = async (allowNegative = false) => {
  const spy = jest.fn();
  await renderWithTheme(<Harness allowNegative={allowNegative} spy={spy} />);
  return { spy, input: screen.getByLabelText('Valor') };
};

it('a vírgula entra sozinha: digitar 15562 mostra 155,62', async () => {
  const { spy, input } = await setup();
  await fireEvent.changeText(input, '15562');
  expect(spy).toHaveBeenLastCalledWith(15562);
  expect(input).toHaveDisplayValue('155,62');
  await fireEvent.changeText(input, '155,623');
  expect(spy).toHaveBeenLastCalledWith(155623);
  expect(input).toHaveDisplayValue('1.556,23');
});

it('apagar tudo volta para vazio', async () => {
  const { spy, input } = await setup();
  await fireEvent.changeText(input, '5');
  await fireEvent.changeText(input, '');
  expect(spy).toHaveBeenLastCalledWith(null);
  expect(input).toHaveDisplayValue('');
});

it('mostra o prefixo R$', async () => {
  await setup();
  expect(screen.getByText('R$')).toBeOnTheScreen();
});

it('com allowNegative, o botão +/− troca o sinal', async () => {
  const { spy, input } = await setup(true);
  await fireEvent.changeText(input, '1000');
  await fireEvent.press(screen.getByRole('button', { name: 'Trocar entre positivo e negativo' }));
  expect(spy).toHaveBeenLastCalledWith(-1000);
  expect(screen.getByText('-R$')).toBeOnTheScreen();
  await fireEvent.changeText(input, '10,005');
  expect(spy).toHaveBeenLastCalledWith(-10005);
});
