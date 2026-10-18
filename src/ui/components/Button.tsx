import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, type PressableProps, View } from 'react-native';

import { useTheme } from '@/ui/theme';
import type { ColorToken } from '@/ui/tokens';

import { AppText, type AppTextProps } from './AppText';

const variants = {
  primary: { box: 'bg-brand', text: 'on-brand', icon: 'on-brand' },
  secondary: { box: 'border border-border bg-surface', text: 'default', icon: 'text' },
  ghost: { box: '', text: 'brand', icon: 'brand' },
  danger: { box: 'border border-expense bg-surface', text: 'expense', icon: 'expense' },
} as const satisfies Record<
  string,
  { box: string; text: NonNullable<AppTextProps['tone']>; icon: ColorToken }
>;

export type ButtonVariant = keyof typeof variants;

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
  /** Ocupa a largura toda (padrão em formulários). */
  block?: boolean;
};

const ICON_SIZE = 18;

export function Button({
  label,
  variant = 'primary',
  icon: Icon,
  loading = false,
  block = false,
  disabled,
  onPress,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const style = variants[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      onPress={(e) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      className={`min-h-touch flex-row items-center justify-center gap-2 rounded-input px-4 active:opacity-80 ${style.box} ${block ? 'self-stretch' : 'self-start'} ${inactive ? 'opacity-50' : ''}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={colors[style.icon]} />
      ) : Icon ? (
        <View>
          <Icon size={ICON_SIZE} color={colors[style.icon]} />
        </View>
      ) : null}
      <AppText variant="label" tone={style.text}>
        {label}
      </AppText>
    </Pressable>
  );
}
