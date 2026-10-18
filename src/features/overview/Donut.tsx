import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/ui/theme';

import type { Slice } from './donut';

const SIZE = 132;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
/** Folga entre fatias (radianos). */
const GAP = 0.03;

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

/** Rosca de despesas; cada fatia na cor da categoria. */
export function Donut({ slices, colorOf }: { slices: Slice[]; colorOf: (s: Slice) => string }) {
  const { colors } = useTheme();
  const single = slices.length === 1;
  return (
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
      {single ? (
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke={colorOf(slices[0])}
          strokeWidth={STROKE}
          fill="none"
        />
      ) : (
        slices.map((s) => (
          <Path
            key={s.key}
            d={arc(s.startAngle + GAP / 2, Math.max(s.startAngle + GAP / 2, s.endAngle - GAP / 2))}
            stroke={colorOf(s)}
            strokeWidth={STROKE}
            fill="none"
          />
        ))
      )}
    </Svg>
  );
}
