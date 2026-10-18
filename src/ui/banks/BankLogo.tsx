import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { sizes } from '@/ui/tokens';

import { type Bank, bankLogo } from './banks';

const WHITE = '#FFFFFF';

/** Logo oficial do banco num círculo padronizado (cor da marca ao fundo). */
export function BankLogo({ bank, size = sizes.fab }: { bank: Bank; size?: number }) {
  const inner = bank.style === 'icon' ? size : Math.round(size * bank.scale);
  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full ${bank.background === WHITE ? 'border border-border' : ''}`}
      style={{ width: size, height: size, backgroundColor: bank.background }}
      accessibilityLabel={bank.name}
      accessibilityRole="image"
    >
      <SvgXml
        xml={bankLogo(bank.id)}
        width={inner}
        height={inner}
        color={bank.foreground}
        preserveAspectRatio={bank.style === 'icon' ? 'xMidYMid slice' : 'xMidYMid meet'}
      />
    </View>
  );
}
