import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  className?: string;
};

/** Superfície padrão de conteúdo. Com `onPress`, vira um botão. */
export function Card({ children, onPress, accessibilityLabel, className = '' }: CardProps) {
  const classes = `gap-3 rounded-card border border-border bg-surface p-4 ${className}`;
  if (!onPress) return <View className={classes}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className={`${classes} active:opacity-80`}
    >
      {children}
    </Pressable>
  );
}
