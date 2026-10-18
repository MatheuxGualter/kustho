import {
  ArrowLeftRight,
  Award,
  Baby,
  BadgePercent,
  Banknote,
  Bath,
  BedDouble,
  Beer,
  Bike,
  Book,
  BookOpen,
  Briefcase,
  Bus,
  CakeSlice,
  Camera,
  Car,
  CarFront,
  CarTaxiFront,
  Cat,
  Church,
  CircleEllipsis,
  CircleParking,
  Coffee,
  Coins,
  CreditCard,
  Dog,
  Drill,
  Droplet,
  Dumbbell,
  Film,
  Fish,
  Flame,
  Flower2,
  Fuel,
  Gamepad2,
  Gem,
  Gift,
  Glasses,
  GraduationCap,
  Hammer,
  HandCoins,
  HandHeart,
  Headphones,
  HeartPulse,
  Hotel,
  House,
  IceCreamCone,
  KeyRound,
  Lamp,
  Landmark,
  Laptop,
  type LucideIcon,
  Motorbike,
  Package,
  PaintRoller,
  PartyPopper,
  PawPrint,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Receipt,
  Repeat,
  Sandwich,
  Scissors,
  ShieldCheck,
  Ship,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Sofa,
  Sparkles,
  Sprout,
  Stethoscope,
  Store,
  Syringe,
  Tag,
  Tent,
  Ticket,
  TrainFront,
  TreePalm,
  TrendingUp,
  Trophy,
  Truck,
  Tv,
  Umbrella,
  Undo2,
  Utensils,
  Volleyball,
  Wallet,
  WashingMachine,
  Watch,
  Wifi,
  Wine,
  Wrench,
  Zap,
} from 'lucide-react-native';
import { View } from 'react-native';

import { useTheme } from '@/ui/theme';

/**
 * Ícones que a pessoa pode escolher para uma categoria, agrupados por assunto
 * (nome salvo no banco → componente lucide). Os títulos ficam em `strings.categories.iconGroups`.
 */
export const categoryIconGroups = {
  food: {
    utensils: Utensils,
    'shopping-cart': ShoppingCart,
    coffee: Coffee,
    pizza: Pizza,
    sandwich: Sandwich,
    'cake-slice': CakeSlice,
    'ice-cream-cone': IceCreamCone,
    fish: Fish,
    beer: Beer,
    wine: Wine,
  },
  transport: {
    car: Car,
    'car-front': CarFront,
    fuel: Fuel,
    'circle-parking': CircleParking,
    bus: Bus,
    'train-front': TrainFront,
    'car-taxi-front': CarTaxiFront,
    motorbike: Motorbike,
    bike: Bike,
    plane: Plane,
    ship: Ship,
  },
  home: {
    house: House,
    receipt: Receipt,
    zap: Zap,
    droplet: Droplet,
    flame: Flame,
    wifi: Wifi,
    smartphone: Smartphone,
    tv: Tv,
    sofa: Sofa,
    lamp: Lamp,
    'bed-double': BedDouble,
    'washing-machine': WashingMachine,
    'paint-roller': PaintRoller,
    wrench: Wrench,
    hammer: Hammer,
    drill: Drill,
    'key-round': KeyRound,
  },
  health: {
    'heart-pulse': HeartPulse,
    stethoscope: Stethoscope,
    pill: Pill,
    syringe: Syringe,
    dumbbell: Dumbbell,
    volleyball: Volleyball,
    sparkles: Sparkles,
    scissors: Scissors,
    bath: Bath,
    glasses: Glasses,
  },
  leisure: {
    'party-popper': PartyPopper,
    film: Film,
    ticket: Ticket,
    'gamepad-2': Gamepad2,
    headphones: Headphones,
    camera: Camera,
    'book-open': BookOpen,
    tent: Tent,
    'tree-palm': TreePalm,
    hotel: Hotel,
  },
  shopping: {
    'shopping-bag': ShoppingBag,
    shirt: Shirt,
    gem: Gem,
    watch: Watch,
    gift: Gift,
    package: Package,
    truck: Truck,
    store: Store,
    repeat: Repeat,
  },
  family: {
    baby: Baby,
    'graduation-cap': GraduationCap,
    book: Book,
    'paw-print': PawPrint,
    dog: Dog,
    cat: Cat,
    'flower-2': Flower2,
    sprout: Sprout,
    church: Church,
    'hand-heart': HandHeart,
  },
  money: {
    briefcase: Briefcase,
    laptop: Laptop,
    'trending-up': TrendingUp,
    'piggy-bank': PiggyBank,
    wallet: Wallet,
    banknote: Banknote,
    coins: Coins,
    'hand-coins': HandCoins,
    landmark: Landmark,
    'badge-percent': BadgePercent,
    'shield-check': ShieldCheck,
    umbrella: Umbrella,
    'undo-2': Undo2,
    award: Award,
    trophy: Trophy,
    tag: Tag,
    'circle-ellipsis': CircleEllipsis,
  },
} satisfies Record<string, Record<string, LucideIcon>>;

export type CategoryIconGroup = keyof typeof categoryIconGroups;

/** Todos os ícones de categoria, mais os usados pelos tipos de lançamento sem categoria. */
export const categoryIcons: Record<string, LucideIcon> = {
  ...categoryIconGroups.food,
  ...categoryIconGroups.transport,
  ...categoryIconGroups.home,
  ...categoryIconGroups.health,
  ...categoryIconGroups.leisure,
  ...categoryIconGroups.shopping,
  ...categoryIconGroups.family,
  ...categoryIconGroups.money,
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
