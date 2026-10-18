import { Pencil, Trash2 } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { signedAmount, transactionTone } from '@/domain/transactions/display';
import type { Transaction } from '@/domain/types';
import { strings } from '@/lib/strings';
import { useTheme } from '@/ui/theme';

import { AppText } from './AppText';
import { CategoryIcon } from './CategoryIcon';
import { MoneyText } from './MoneyText';

export type TransactionRowProps = {
  transaction: Pick<
    Transaction,
    | 'kind'
    | 'amountCents'
    | 'direction'
    | 'description'
    | 'status'
    | 'installmentNumber'
    | 'installmentTotal'
  >;
  /** Nome da conta ou do cartão de origem. */
  originName: string;
  category?: { name: string; icon: string; color: string } | null;
  onPress?: () => void;
  /** Destaque da linha aberta no painel de detalhe (tela larga). */
  selected?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

const fallbackIcons: Partial<Record<Transaction['kind'], { icon: string; label: string }>> = {
  transfer: { icon: 'arrow-left-right', label: strings.transaction.transfer },
  invoice_payment: { icon: 'credit-card', label: strings.transaction.invoicePayment },
  adjustment: { icon: 'sliders-horizontal', label: strings.transaction.adjustment },
};

const ACTION_ICON_SIZE = 20;

/** Linha de lançamento: ícone, descrição, origem e valor; deslizar para editar ou excluir. */
export function TransactionRow({
  transaction,
  originName,
  category,
  onPress,
  selected = false,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const { colors } = useTheme();
  const fallback = fallbackIcons[transaction.kind];
  const icon = category?.icon ?? fallback?.icon ?? 'tag';
  const subtitle = [originName, category?.name ?? fallback?.label].filter(Boolean).join(' · ');
  const installment =
    transaction.installmentNumber && transaction.installmentTotal
      ? strings.transaction.installment(transaction.installmentNumber, transaction.installmentTotal)
      : null;
  const scheduled = transaction.status === 'scheduled';

  const accessibilityActions = [
    ...(onEdit ? [{ name: 'edit', label: strings.transaction.edit }] : []),
    ...(onDelete ? [{ name: 'delete', label: strings.transaction.delete }] : []),
  ];

  const row = (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={selected ? { selected } : undefined}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'edit') onEdit?.();
        if (e.nativeEvent.actionName === 'delete') onDelete?.();
      }}
      // Feedback de toque pela cor, nunca por opacidade: a linha cobre as ações do deslize.
      className={`min-h-touch flex-row items-center gap-3 px-4 py-3 active:bg-surface-raised ${selected ? 'bg-surface-raised' : 'bg-surface'}`}
    >
      <CategoryIcon icon={icon} color={category?.color} />
      <View className="flex-1 gap-1">
        <AppText variant="label" numberOfLines={1} className="text-base">
          {transaction.description}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {[subtitle, installment, scheduled ? strings.transaction.scheduled : null]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
      </View>
      <MoneyText
        cents={signedAmount(transaction)}
        tone={transactionTone(transaction)}
        variant="label"
        className={`text-base ${scheduled ? 'opacity-50' : ''}`}
      />
    </Pressable>
  );

  if (!onEdit && !onDelete) return row;

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={{ backgroundColor: colors.surface }}
      renderRightActions={(progress, _translation, methods) => (
        <SwipeActions progress={progress}>
          {onEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.transaction.edit}
              onPress={() => {
                methods.close();
                onEdit();
              }}
              className="min-w-touch items-center justify-center bg-brand px-4"
            >
              <Pencil size={ACTION_ICON_SIZE} color={colors['on-brand']} />
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.transaction.delete}
              onPress={() => {
                methods.close();
                onDelete();
              }}
              className="min-w-touch items-center justify-center bg-expense px-4"
            >
              <Trash2 size={ACTION_ICON_SIZE} color={colors['on-brand']} />
            </Pressable>
          ) : null}
        </SwipeActions>
      )}
    >
      {row}
    </ReanimatedSwipeable>
  );
}

/**
 * As ações ficam atrás da linha. Com a linha fechada elas somem de vez: no Android a
 * opacidade de um pai (transição de aba, toque) é aplicada filho a filho e deixaria os
 * ícones aparecerem por cima do valor.
 */
function SwipeActions({
  progress,
  children,
}: {
  progress: SharedValue<number>;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({ opacity: progress.value > 0 ? 1 : 0 }));
  return <Animated.View style={[{ flexDirection: 'row' }, style]}>{children}</Animated.View>;
}
