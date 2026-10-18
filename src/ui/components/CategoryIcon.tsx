import {
  ArrowLeftRight,
  Briefcase,
  Car,
  CircleEllipsis,
  CreditCard,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  type LucideIcon,
  PartyPopper,
  PawPrint,
  Plane,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Tag,
  TrendingUp,
  Undo2,
  Utensils,
} from 'lucide-react-native';
import { View } from 'react-native';

import { useTheme } from '@/ui/theme';

/** Ícones disponíveis para categorias (nome salvo no banco → componente lucide). */
export const categoryIcons: Record<string, LucideIcon> = {
  utensils: Utensils,
  'shopping-cart': ShoppingCart,
  car: Car,
  house: House,
  receipt: Receipt,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  'party-popper': PartyPopper,
  'shopping-bag': ShoppingBag,
  repeat: Repeat,
  plane: Plane,
  'paw-print': PawPrint,
  'circle-ellipsis': CircleEllipsis,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  'undo-2': Undo2,
  gift: Gift,
  tag: Tag,
  'arrow-left-right': ArrowLeftRight,
  'credit-card': CreditCard,
  'sliders-horizontal': SlidersHorizontal,
};

const SIZE = 20;
/** Opacidade (hex) do fundo atrás do ícone. */
const BACKGROUND_ALPHA = '26';

export type CategoryIconProps = {
  icon: string;
  /** Cor da categoria (da paleta de acentos). Sem cor, usa o tom neutro do tema. */
  color?: string | null;
};

/** Ícone de categoria num círculo com a cor da categoria. */
export function CategoryIcon({ icon, color }: CategoryIconProps) {
  const { colors } = useTheme();
  const Icon = categoryIcons[icon] ?? Tag;
  const tint = color ?? colors['text-muted'];
  return (
    <View
      className="h-fab w-fab items-center justify-center rounded-full"
      style={{ backgroundColor: `${tint}${BACKGROUND_ALPHA}` }}
      importantForAccessibility="no-hide-descendants"
    >
      <Icon size={SIZE} color={tint} />
    </View>
  );
}
