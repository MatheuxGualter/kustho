import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';

import { MoneyField } from '../MoneyField';

const setup = async (props: Partial<Parameters<typeof MoneyField>[0]> = {}) => {
  const onChange = jest.fn();
  await renderWithTheme(<MoneyField label="Valor" value={null} onChange={onChange} {...props} />);
  return { onChange, input: screen.getByLabelText('Valor') };
};

it('converte texto em centavos', async () => {
  const { onChange, input } = await setup();
  await fireEvent.changeText(input, '1.234,56');
  expect(onChange).toHaveBeenLastCalledWith(123456);
  await fireEvent.changeText(input, '45,9');
  expect(onChange).toHaveBeenLastCalledWith(4590);
});

it('texto inválido devolve null e mostra erro', async () => {
  const { onChange, input } = await setup();
  await fireEvent.changeText(input, 'abc');
  expect(onChange).toHaveBeenLastCalledWith(null);
  expect(screen.getByText('Informe um valor válido, ex.: 1.234,56')).toBeOnTheScreen();
});

it('negativo só quando permitido', async () => {
  const blocked = await setup();
  await fireEvent.changeText(blocked.input, '-10');
  expect(blocked.onChange).toHaveBeenLastCalledWith(null);
});

it('aceita negativo com allowNegative', async () => {
  const { onChange, input } = await setup({ allowNegative: true });
  await fireEvent.changeText(input, '-10');
  expect(onChange).toHaveBeenLastCalledWith(-1000);
});
