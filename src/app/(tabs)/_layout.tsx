import { Tabs } from 'expo-router/js-tabs';

import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { TabBar } from '@/ui/components/TabBar';

/** Acima disso o selo mostra "99+". */
const MAX_BADGE = 99;

/**
 * Arquivo de alto conflito: as abas só mudam no kickoff da fase.
 * Fase 2: aba Pendentes (trilha D), com selo de contagem. Contas virou aba (decisão de
 * out/2026) para o botão + voltar ao centro: três abas de cada lado.
 */
export default function TabsLayout() {
  const { captures } = useServices();
  const pending = useServiceQuery(() => captures.countPending(), []).data ?? 0;
  const badge = pending > MAX_BADGE ? `${MAX_BADGE}+` : pending || undefined;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: strings.tabs.home }} />
      <Tabs.Screen name="lancamentos" options={{ title: strings.tabs.transactions }} />
      <Tabs.Screen name="pendentes" options={{ title: strings.tabs.pending, tabBarBadge: badge }} />
      <Tabs.Screen name="cartoes" options={{ title: strings.tabs.cards }} />
      <Tabs.Screen name="contas" options={{ title: strings.tabs.accounts }} />
      <Tabs.Screen name="mais" options={{ title: strings.tabs.more }} />
    </Tabs>
  );
}
