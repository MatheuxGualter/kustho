import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { spacing } from '@/ui/tokens';

/** Largura do degradê nas bordas de uma lista horizontal. */
const FADE_WIDTH = spacing[8] + spacing[6];

/**
 * Degradê sobre a borda de uma lista horizontal, sinalizando que há mais itens para o
 * lado. Não intercepta toques.
 */
export function ScrollFade({ side, color }: { side: 'left' | 'right'; color: string }) {
  const id = `fade-${side}`;
  const opaqueAt = side === 'right' ? '1' : '0';
  const clearAt = side === 'right' ? '0' : '1';
  return (
    <View
      pointerEvents="none"
      className={`absolute bottom-0 top-0 ${side === 'right' ? 'right-0' : 'left-0'}`}
      style={{ width: FADE_WIDTH }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset={clearAt} stopColor={color} stopOpacity={0} />
            <Stop offset={opaqueAt} stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
