import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import {
  ArrowDownUp,
  Bell,
  CreditCard,
  Ellipsis,
  House,
  type LucideIcon,
  Plus,
  Wallet,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/lib/strings';
import { useTheme } from '@/ui/theme';
import { spacing } from '@/ui/tokens';

import { AppText } from './AppText';

const icons: Record<string, LucideIcon> = {
  index: House,
  // Entradas e saídas.
  lancamentos: ArrowDownUp,
  // Sugestões vindas das notificações dos bancos.
  pendentes: Bell,
  cartoes: CreditCard,
  contas: Wallet,
  mais: Ellipsis,
};

const ICON_SIZE = 24;

/**
 * Barra de abas só com ícones (o nome fica no rótulo de acessibilidade) e o botão central
 * que abre o novo lançamento, com metade das abas de cada lado. A aba atual ganha cor e um
 * traço embaixo, para não depender só da cor.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const middle = Math.ceil(state.routes.length / 2);

  const tabs = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const focused = state.index === index;
    const Icon = icons[route.name] ?? Ellipsis;
    const label = typeof options.title === 'string' ? options.title : route.name;
    const badge = options.tabBarBadge;

    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={badge ? strings.tabs.withBadge(label, badge) : label}
        className="min-h-touch flex-1 items-center justify-center gap-1 py-2"
      >
        <View>
          <Icon size={ICON_SIZE} color={focused ? colors.brand : colors['text-muted']} />
          {badge ? (
            <View className="absolute -right-3 -top-2 min-w-6 items-center rounded-full bg-brand px-1">
              <AppText variant="caption" tone="on-brand" numeric maxFontSizeMultiplier={1.3}>
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>
        <View className={`h-1 w-4 rounded-full ${focused ? 'bg-brand' : 'bg-transparent'}`} />
      </Pressable>
    );
  });

  const openNewTransaction = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/lancamento/novo');
  };

  return (
    <View
      className="flex-row items-center border-t border-border bg-surface px-2"
      style={{ paddingBottom: Math.max(insets.bottom, spacing[2]) }}
    >
      {tabs.slice(0, middle)}
      <View className="flex-1 items-center justify-center">
        <Pressable
          onPress={openNewTransaction}
          accessibilityRole="button"
          accessibilityLabel={strings.tabs.newTransaction}
          className="h-fab w-fab items-center justify-center rounded-full bg-brand active:opacity-80"
        >
          <Plus size={ICON_SIZE + 4} color={colors['on-brand']} />
        </Pressable>
      </View>
      {tabs.slice(middle)}
    </View>
  );
}
