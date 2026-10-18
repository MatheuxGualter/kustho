import { View } from 'react-native';

import { BANK_ICON_PREFIX, resolveBank } from '@/ui/banks/banks';
import { BankLogo } from '@/ui/banks/BankLogo';

import { AppText } from './AppText';

/**
 * Ícone da instituição: o logo oficial quando o banco é reconhecido (escolhido no
 * seletor ou pelo nome); senão, um círculo na cor escolhida com as iniciais.
 */
export function InstitutionAvatar({
  institution,
  color,
  icon,
}: {
  institution: string;
  color: string;
  /** Campo `icon` da conta: `bank:<id>` ou as iniciais digitadas. */
  icon?: string | null;
}) {
  const bank = resolveBank(institution, icon);
  if (bank) return <BankLogo bank={bank} />;
  const initials = icon && !icon.startsWith(BANK_ICON_PREFIX) ? icon : suggestInitials(institution);
  return (
    <View
      className="h-fab w-fab items-center justify-center rounded-full"
      style={{ backgroundColor: color }}
      importantForAccessibility="no-hide-descendants"
    >
      <AppText variant="label" tone="on-brand" maxFontSizeMultiplier={1.2}>
        {initials.slice(0, 2).toUpperCase() || '?'}
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
