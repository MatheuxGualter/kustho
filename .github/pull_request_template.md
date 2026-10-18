## O que muda

<!-- Uma ou duas frases do ponto de vista de quem usa o app. -->

## Como testar

<!-- Passos no celular. -->

- [ ] Basta recarregar (`pnpm start`)
- [ ] Precisa recompilar (`pnpm android`): dependência nativa nova
- [ ] Precisa regerar o nativo (`npx expo prebuild --clean --platform android`): mudou `app.json`, ícone ou splash

## Checklist

- [ ] Typecheck, lint e testes passando
- [ ] Regras novas com testes
- [ ] Telas conferidas nos temas claro e escuro, celular compacto e fonte em 130%
- [ ] Cores, espaçamentos e fontes só dos tokens; textos em `src/lib/strings.ts`
- [ ] Item marcado em `docs/fase-1.md` (se fechou algum)
- [ ] Mexe em dinheiro, migração ou Kotlin → pedir revisão humana
