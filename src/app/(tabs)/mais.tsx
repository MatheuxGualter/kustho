import { type Href, Link } from 'expo-router';
import {
  ArrowLeftRight,
  ChevronRight,
  Download,
  type LucideIcon,
  Palette,
  Settings,
  Sparkles,
  Tags,
  Wallet,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { Screen } from '@/ui/components/Screen';
import { ThemeSelector } from '@/ui/components/ThemeSelector';
import { useTheme } from '@/ui/theme';

type MenuItem = { href: Href; label: string; icon: LucideIcon };

const items: MenuItem[] = [
  { href: '/contas', label: strings.screens.accounts.title, icon: Wallet },
  { href: '/transferencia', label: strings.screens.transfer.title, icon: ArrowLeftRight },
  { href: '/categorias', label: strings.screens.categories.title, icon: Tags },
  { href: '/exportar', label: strings.screens.export.title, icon: Download },
  { href: '/configuracoes', label: strings.screens.settings.title, icon: Settings },
];

const devItems: MenuItem[] = [
  { href: '/dev/ui', label: strings.screens.more.devCatalog, icon: Palette },
  { href: '/onboarding', label: strings.screens.more.devOnboarding, icon: Sparkles },
];

const ICON_SIZE = 20;

// Menu da aba Mais. Trilhas acrescentam itens aqui só pelo kickoff (arquivo do dono da tela).
export default function MoreScreen() {
  return (
    <Screen title={strings.screens.more.title}>
      <Menu items={items} />
      <ThemeSelector />
      {__DEV__ ? <Menu items={devItems} /> : null}
    </Screen>
  );
}

function Menu({ items: menu }: { items: MenuItem[] }) {
  const { colors } = useTheme();
  return (
    <View className="overflow-hidden rounded-card border border-border bg-surface">
      {menu.map(({ href, label, icon: Icon }, i) => (
        <Link key={label} href={href} asChild>
          <Pressable
            accessibilityRole="link"
            className={`min-h-touch flex-row items-center gap-3 px-4 py-3 active:opacity-70 ${i > 0 ? 'border-t border-border' : ''}`}
          >
            <Icon size={ICON_SIZE} color={colors.brand} />
            <AppText className="flex-1">{label}</AppText>
            <ChevronRight size={ICON_SIZE} color={colors['text-muted']} />
          </Pressable>
        </Link>
      ))}
    </View>
  );
}
