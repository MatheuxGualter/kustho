/**
 * Todos os textos da interface (pt-BR). Telas e componentes nunca escrevem texto solto.
 */
export const strings = {
  appName: 'Kustho',
  common: {
    loading: 'Carregando…',
    cancel: 'Cancelar',
    save: 'Salvar',
    undo: 'Desfazer',
    comingSoon: 'Em construção',
  },
  tabs: {
    home: 'Início',
    transactions: 'Lançamentos',
    cards: 'Cartões',
    more: 'Mais',
    newTransaction: 'Novo lançamento',
  },
  screens: {
    home: { title: 'Início', placeholder: 'Saldo, cartões e resumo do mês aparecem aqui.' },
    transactions: {
      title: 'Lançamentos',
      placeholder: 'A lista do mês, agrupada por dia, aparece aqui.',
    },
    cards: { title: 'Cartões', placeholder: 'Cartões, faturas e pagamentos aparecem aqui.' },
    more: {
      title: 'Mais',
      placeholder: 'Contas, categorias, exportação e configurações.',
      devCatalog: 'Catálogo de componentes',
    },
    newTransaction: { title: 'Novo lançamento' },
    editTransaction: { title: 'Editar lançamento' },
  },
  theme: {
    label: 'Tema',
    system: 'Sistema',
    light: 'Claro',
    dark: 'Escuro',
  },
  devCatalog: {
    title: 'Catálogo de componentes',
    colors: 'Cores',
    typography: 'Tipografia',
    spacing: 'Espaçamento',
    accents: 'Cores de conta e cartão',
    sample: 'Kustho organiza suas finanças',
  },
  errors: {
    database: 'Não foi possível abrir os dados do aparelho.',
  },
} as const;
