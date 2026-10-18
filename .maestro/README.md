# Testes ponta a ponta (Maestro)

Fluxos da Fase 1: lançar despesa, compra em 3x em 3 faturas e pagar fatura. Cada um começa
com `_preparar.yaml`, que abre `kustho://dev/seed` (troca os dados pelos de exemplo e pula
as boas-vindas).

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash   # instala o Maestro (uma vez)
pnpm start                                           # Metro rodando (outro terminal)
maestro test .maestro/                               # roda todos os fluxos
maestro test .maestro/lancar-despesa.yaml            # um só
maestro test --debug-output maestro-debug .maestro/  # guarda prints e logs de cada passo
```

Antes: app de desenvolvimento instalado (`pnpm android`), celular desbloqueado e **bloqueio
do Kustho desligado** (Maestro não passa pela biometria). Falhou? Mande o print do passo que
está em `maestro-debug/`.

A rota `dev/seed` só existe em build de desenvolvimento ou com `EXPO_PUBLIC_E2E=1` (para
rodar contra um APK de release: `EXPO_PUBLIC_E2E=1 npx expo run:android --variant release`).
Nunca gere o APK de usuários com essa variável.

Os textos dos passos vêm de `src/lib/strings.ts`; mudou um texto usado aqui, ajuste o fluxo.
