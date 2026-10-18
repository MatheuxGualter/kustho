import { View } from 'react-native';

import { AppText } from './AppText';

/** Círculo com a cor e as iniciais escolhidas pelo usuário (nunca logos de bancos). */
export function InstitutionAvatar({ color, initials }: { color: string; initials: string }) {
  return (
    <View
      className="h-fab w-fab items-center justify-center rounded-full"
      style={{ backgroundColor: color }}
      importantForAccessibility="no-hide-descendants"
    >
      <AppText variant="label" tone="on-brand" maxFontSizeMultiplier={1.2}>
        {initials.slice(0, 2).toUpperCase()}
      </AppText>
    </View>
  );
}

/** Iniciais sugeridas a partir do nome da instituição: "Banco Inter" → "BI". */
export function suggestInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
