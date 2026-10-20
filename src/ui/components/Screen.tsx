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
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/ui/tokens';

import { AppText } from './AppText';

type Measurable = HostInstance;

/** Rola a tela até o campo focado, acima do teclado. `null` fora de um `Screen` rolável. */
const ScrollIntoViewContext = createContext<((node: Measurable | null) => void) | null>(null);
export const useScrollIntoView = () => useContext(ScrollIntoViewContext);

/** Espaço acima do campo focado ao rolar (para o rótulo continuar visível). */
const FOCUS_MARGIN = spacing[8] * 2;

type ScreenProps = {
  title?: string;
  children?: ReactNode;
  /** Abas já reservam a borda de baixo para a barra. */
  edges?: Edge[];
  scroll?: boolean;
};

/**
 * Contêiner padrão de tela: fundo do tema, safe areas, título opcional e teclado que nunca
 * cobre o campo em edição. Com rolagem, ganha espaço embaixo e vai até o campo focado;
 * sem rolagem, o conteúdo ocupa a altura e sobe junto com o teclado.
 */
export function Screen({ title, children, edges = ['top'], scroll = true }: ScreenProps) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const contentRef = useRef<HostInstance>(null);
  const focused = useRef<Measurable | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  const content = (
    <View ref={contentRef} className={`gap-4 px-4 pb-8 pt-8 ${scroll ? '' : 'flex-1'}`}>
      {title ? (
        <AppText variant="headline" accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-bg">
      {scroll ? (
        <ScrollIntoViewContext.Provider value={scrollIntoView}>
          <ScrollView
            ref={scrollRef}
            contentInsetAdjustmentBehavior="automatic"
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
  );
}
