import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  type HostInstance,
  Keyboard,
  ScrollView,
  type ScrollViewInstance,
  View,
} from 'react-native';
import { type Edge, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/ui/theme';
import { spacing } from '@/ui/tokens';

import { AppText } from './AppText';

type Measurable = HostInstance;

/** Rola a tela até o campo focado, acima do teclado. `null` fora de um `Screen` rolável. */
const ScrollIntoViewContext = createContext<((node: Measurable | null) => void) | null>(null);
export const useScrollIntoView = () => useContext(ScrollIntoViewContext);

/** Espaço acima do campo focado ao rolar (para o rótulo continuar visível). */
const FOCUS_MARGIN = spacing[8] * 2;

/** Quanto o degradê da marca desce abaixo da status bar, até sumir no fundo. */
const TOP_FADE = spacing[2] * 30;

type ScreenProps = {
  title?: string;
  children?: ReactNode;
  /** Abas já reservam a borda de baixo para a barra. */
  edges?: Edge[];
  scroll?: boolean;
  /** Cor brand atrás da status bar, em degradê para baixo, só no topo. */
  topFade?: boolean;
};

/** Degradê no topo do conteúdo: brand opaco na status bar, transparente no fim. Rola junto. */
function TopBrandFade() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const height = insets.top + TOP_FADE;
  const solidUntil = insets.top / height;

  return (
    <View
      pointerEvents="none"
      className="absolute left-0 right-0 top-0 opacity-40"
      style={{ height }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="screen-top-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.brand} stopOpacity={1} />
            <Stop offset={String(solidUntil)} stopColor={colors.brand} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.brand} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#screen-top-fade)" />
      </Svg>
    </View>
  );
}

/** Empurra o conteúdo para baixo da status bar; o degradê fica por baixo e rola junto. */
function TopFadeFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <TopBrandFade />
      <View style={{ paddingTop: insets.top }}>{children}</View>
    </>
  );
}

/**
 * Contêiner padrão de tela: fundo do tema, safe areas, título opcional e teclado que nunca
 * cobre o campo em edição. Com rolagem, ganha espaço embaixo e vai até o campo focado;
 * sem rolagem, o conteúdo ocupa a altura e sobe junto com o teclado.
 */
export function Screen({
  title,
  children,
  edges = ['top'],
  scroll = true,
  topFade = false,
}: ScreenProps) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const contentRef = useRef<HostInstance>(null);
  const focused = useRef<Measurable | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const safeEdges = topFade ? edges.filter((edge) => edge !== 'top') : edges;

  const reveal = useCallback(() => {
    const node = focused.current;
    const content = contentRef.current;
    if (!node || !content) return;
    node.measureLayout(
      content,
      (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - FOCUS_MARGIN), animated: true }),
      () => {},
    );
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      if (scroll) requestAnimationFrame(reveal);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      focused.current = null;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scroll, reveal]);

  const scrollIntoView = useCallback(
    (node: Measurable | null) => {
      focused.current = node;
      // Teclado já aberto (troca de campo): rola na hora.
      if (Keyboard.isVisible()) requestAnimationFrame(reveal);
    },
    [reveal],
  );

  const body = (
    <View className={`gap-4 px-4 pb-8 pt-8 ${scroll ? '' : 'flex-1'}`}>
      {title ? (
        <AppText variant="headline" accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
  const content = (
    <View ref={contentRef} className={scroll ? '' : 'flex-1'}>
      {topFade ? <TopFadeFrame>{body}</TopFadeFrame> : body}
    </View>
  );
  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={safeEdges} className="flex-1">
        {scroll ? (
          <ScrollIntoViewContext.Provider value={scrollIntoView}>
            <ScrollView
              ref={scrollRef}
              contentInsetAdjustmentBehavior={topFade ? 'never' : 'automatic'}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: keyboardHeight }}
            >
              {content}
            </ScrollView>
          </ScrollIntoViewContext.Provider>
        ) : (
          <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
            {content}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
