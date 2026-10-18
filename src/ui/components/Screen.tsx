import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { AppText } from './AppText';

type ScreenProps = {
  title?: string;
  children?: ReactNode;
  /** Abas já reservam a borda de baixo para a barra. */
  edges?: Edge[];
  scroll?: boolean;
};

/** Contêiner padrão de tela: fundo do tema, safe areas e título opcional. */
export function Screen({ title, children, edges = ['top'], scroll = true }: ScreenProps) {
  const content = (
    <View className="gap-4 px-4 pb-8 pt-4">
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
        <ScrollView contentInsetAdjustmentBehavior="automatic">{content}</ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
