import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { strings } from '@/lib/strings';
import { spacing } from '@/ui/tokens';

import { AppText } from './AppText';

type ToastState = {
  message: string | null;
  action: { label: string; onPress: () => void } | null;
  key: number;
};

const useToast = create<ToastState>()(() => ({ message: null, action: null, key: 0 }));

const DURATION_MS = 5000;
/** Altura aproximada da barra de abas, para o aviso não ficar por baixo dela. */
const TAB_BAR_OFFSET = 72;

/** Mostra um aviso curto no rodapé; com `onUndo`, oferece "Desfazer". */
export function showToast(message: string, onUndo?: () => void) {
  useToast.setState((s) => ({
    message,
    action: onUndo ? { label: strings.common.undo, onPress: onUndo } : null,
    key: s.key + 1,
  }));
}

export function hideToast() {
  useToast.setState({ message: null, action: null });
}

/** Renderizado uma vez no layout raiz. */
export function ToastHost() {
  const { message, action, key } = useToast();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hideToast, DURATION_MS);
    return () => clearTimeout(timer);
  }, [message, key]);

  if (!message) return null;
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 px-4"
      style={{ bottom: insets.bottom + TAB_BAR_OFFSET + spacing[2] }}
    >
      <Animated.View
        key={key}
        entering={FadeInDown}
        exiting={FadeOutDown}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        className="flex-row items-center gap-3 rounded-card bg-text px-4 py-3"
      >
        <AppText tone="inverse" className="flex-1">
          {message}
        </AppText>
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              action.onPress();
              hideToast();
            }}
            className="min-h-touch justify-center px-2"
          >
            <AppText variant="label" tone="inverse" className="underline">
              {action.label}
            </AppText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}
