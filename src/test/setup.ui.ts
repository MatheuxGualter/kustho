// Setup do projeto "ui" do Jest: substitui módulos nativos sem implementação em Node.

jest.mock('expo-sqlite/kv-store', () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => void data.set(key, value),
    removeItem: async (key: string) => void data.delete(key),
  };
  return { __esModule: true, default: storage, Storage: storage };
});

// O gesto de deslizar é coberto pelos testes de ponta a ponta (Maestro); aqui a linha
// renderiza só o conteúdo, e as ações ficam acessíveis por accessibilityActions.
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  __esModule: true,
  default: ({ children }: { children: unknown }) => children,
}));

// expo-sqlite precisa do módulo nativo; nos testes de tela os serviços são os fakes.
jest.mock('expo-sqlite', () => ({
  addDatabaseChangeListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock mínimo do Reanimated (o oficial não carrega no Jest com Reanimated 4.7):
// animações viram valores estáticos e "reduzir movimento" fica ligado.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const passthrough = (value: unknown) => value;
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => true,
    withTiming: passthrough,
    withSpring: passthrough,
    withRepeat: passthrough,
    FadeInDown: {},
    FadeOutDown: {},
  };
});
