import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';

import { CategoryPicker } from '../CategoryPicker';

const categories = [
  { id: 'a', name: 'Alimentação', icon: 'utensils', color: '#EA580C' },
  { id: 'b', name: 'Transporte', icon: 'car', color: '#0284C7' },
];

it('seleciona categoria ou "Sem categoria"', async () => {
  const onChange = jest.fn();
  await renderWithTheme(
    <CategoryPicker label="Categoria" categories={categories} value="a" onChange={onChange} />,
  );
  expect(screen.getByRole('radio', { name: 'Alimentação' })).toBeSelected();
  await fireEvent.press(screen.getByRole('radio', { name: 'Transporte' }));
  expect(onChange).toHaveBeenLastCalledWith('b');
  await fireEvent.press(screen.getByRole('radio', { name: 'Sem categoria' }));
  expect(onChange).toHaveBeenLastCalledWith(null);
});
