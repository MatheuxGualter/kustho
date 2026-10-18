import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { formatBRL } from '@/lib/money';
import { renderWithTheme } from '@/test/render';

import { AmountKeypad, applyKey } from '../AmountKeypad';
import { AppText } from '../AppText';

describe('applyKey', () => {
  it('digitar 4590 vira R$ 45,90', async () => {
    const cents = (['4', '5', '9', '0'] as const).reduce(applyKey, 0);
    expect(cents).toBe(4590);
  });

  it('00 acrescenta dois zeros e apagar remove o último dígito', async () => {
    expect(applyKey(45, '00')).toBe(4500);
    expect(applyKey(4590, 'backspace')).toBe(459);
  });
});

function Harness() {
  const [value, setValue] = useState(0);
  return (
    <>
      <AppText testID="value">{formatBRL(value)}</AppText>
      <AmountKeypad value={value} onChange={setValue} />
    </>
  );
}

describe('AmountKeypad', () => {
  it('monta o valor pelas teclas e zera ao segurar Apagar', async () => {
    await renderWithTheme(<Harness />);
    for (const key of ['4', '5', '9', '0']) await fireEvent.press(screen.getByLabelText(key));
    expect(screen.getByTestId('value')).toHaveTextContent(formatBRL(4590));
    await fireEvent.press(screen.getByLabelText('Apagar'));
    expect(screen.getByTestId('value')).toHaveTextContent(formatBRL(459));
    await fireEvent(screen.getByLabelText('Apagar'), 'longPress');
    expect(screen.getByTestId('value')).toHaveTextContent(formatBRL(0));
  });
});
