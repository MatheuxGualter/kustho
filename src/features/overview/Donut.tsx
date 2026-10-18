import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/ui/theme';

import type { Slice } from './donut';

const SIZE = 168;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
/** Folga entre fatias (radianos). */
const GAP = 0.03;
/** Opacidade das fatias não selecionadas quando há uma selecionada. */
const DIMMED = 0.3;

function point(angle: number) {
  // Ângulo 0 no topo, sentido horário.
  return [CENTER + RADIUS * Math.sin(angle), CENTER - RADIUS * Math.cos(angle)] as const;
}

function arc(start: number, end: number): string {
  const [x1, y1] = point(start);
  const [x2, y2] = point(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${x2} ${y2}`;
}

/**
 * Rosca de despesas: cada fatia na cor da categoria; tocar seleciona (as outras esmaecem).
 * `children` aparece no centro.
 */
export function Donut({
  slices,
  colorOf,
  selected,
  onSelect,
  children,
}: {
  slices: Slice[];
  colorOf: (s: Slice) => string;
  selected: string | null;
  onSelect: (key: string | null) => void;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const opacity = (s: Slice) => (selected && selected !== s.key ? DIMMED : 1);
  const toggle = (s: Slice) => onSelect(selected === s.key ? null : s.key);

  return (
    <View className="items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <Svg
        width={SIZE}
        height={SIZE}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke={colors['surface-raised']}
          strokeWidth={STROKE}
          fill="none"
        />
        {slices.length === 1 ? (
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={colorOf(slices[0])}
            strokeWidth={STROKE}
            fill="none"
            onPress={() => toggle(slices[0])}
          />
        ) : (
          slices.map((s) => (
            <Path
              key={s.key}
              d={arc(
                s.startAngle + GAP / 2,
                Math.max(s.startAngle + GAP / 2, s.endAngle - GAP / 2),
              )}
              stroke={colorOf(s)}
              strokeOpacity={opacity(s)}
              strokeWidth={STROKE}
              fill="none"
              onPress={() => toggle(s)}
            />
          ))
        )}
      </Svg>
      <View pointerEvents="none" className="absolute items-center px-6">
        {children}
      </View>
    </View>
  );
}
