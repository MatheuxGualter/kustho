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
