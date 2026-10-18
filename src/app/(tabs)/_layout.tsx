import { Tabs } from 'expo-router/js-tabs';

import { strings } from '@/lib/strings';
import { TabBar } from '@/ui/components/TabBar';

/**
 * Arquivo de alto conflito: as abas só mudam no kickoff da fase.
 * A Fase 2 acrescenta a aba Pendentes.
 */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: strings.tabs.home }} />
      <Tabs.Screen name="lancamentos" options={{ title: strings.tabs.transactions }} />
      <Tabs.Screen name="cartoes" options={{ title: strings.tabs.cards }} />
      <Tabs.Screen name="mais" options={{ title: strings.tabs.more }} />
    </Tabs>
  );
}
