# Kustho — Seu dinheiro, sem complicação.

O **Kustho** é um gerenciador financeiro feito para quem usa dois ou mais bancos digitais e está cansado de anotar cada gasto à mão. Ele nasce como um controle manual completo e evolui para uma ferramenta inteligente que lê as notificações do seu celular e os comprovantes de Pix para você.

Construído com o princípio **"offline-first"**, seus dados financeiros ficam seguros no seu próprio aparelho.

---
### 📥 Onde baixar e como instalar
O Kustho está disponível para Android. Você pode baixar a versão mais recente (MVP) diretamente na nossa página de lançamentos:
👉 **[Baixar o Kustho (GitHub Releases)](https://github.com/MatheuxGualter/kustho/releases/tag/1.0.1)**

**Como instalar:**
1. Acesse o link acima no seu celular Android.
2. Baixe o arquivo `.apk` na seção "Assets".
3. Ao abrir o arquivo, seu celular pode avisar que é de "fonte desconhecida". Permita a instalação.
4. *Nota importante:* Como o app lê notificações de bancos, o Android pode classificar a instalação como "configuração restrita". Se isso acontecer, vá em **Configurações do celular → Apps → Kustho**, toque no menu de três pontinhos no canto superior e escolha **"Permitir configurações restritas"** antes de abrir o app.
5. **Permissão de Notificações:** Ao abrir o app pela primeira vez, vá até a aba **Mais → Leitura de notificações** e siga o passo a passo na tela para conceder a permissão de acesso às notificações do sistema. Sem essa permissão, o Kustho não consegue capturar os gastos automaticamente.

---

## Parte 1: Para quem usa o Kustho (Visão do Usuário)

O Kustho foi pensado para tirar o atrito do seu dia a dia. Aqui estão as principais funcionalidades que fazem a diferença:

### 📲 Captura Automática de Notificações
Esqueça o trabalho de abrir o app do banco e depois abrir o gerenciador para lançar o gasto. O Kustho lê as notificações de compras e Pix do seu banco e coloca as informações numa aba de **Pendentes**. Você só precisa revisar e confirmar com um toque. *(A automação sugere, você sempre tem a palavra final).*

### 🧾 Leitura de Comprovantes de Pix (Nova)
Enviou um Pix e quer registrar? Basta compartilhar o comprovante (imagem, PDF ou texto) direto para o Kustho. O app lê o comprovante usando a inteligência do próprio celular, preenche os dados de valor e destinatário, e sugere a saída na sua caixa de Pendentes. 

### 💰 Gestão Financeira Completa e Manual
O coração do Kustho é o controle total. Mesmo sem as automações, você tem um app robusto para:
- Gerenciar contas correntes, poupanças e carteiras.
- Controlar faturas de cartão de crédito (inclusive compras parceladas).
- Registrar entradas, saídas e transferências entre contas.
- Visualizar gráficos e resumos mensais com temas claro e escuro.
- Lançar um gasto em menos de 5 segundos.

### 🔒 Privacidade e Segurança em Primeiro Lugar
- **Offline-first:** Seus dados ficam apenas no seu celular. Não enviamos nada para servidores externos.
- **Bloqueio por Biometria/PIN:** Proteja o acesso ao app com sua digital ou senha.
- **Ocultar Valores:** Um botão para esconder os saldos e valores na tela quando estiver em público.

---

## Parte 2: Para Desenvolvedores (Parte Técnica)

*Se você é um usuário, pode parar por aqui. As informações abaixo são para quem quer rodar o projeto, contribuir ou entender a arquitetura técnica.*

- **Primeira vez? Configure a máquina com [`docs/como-rodar.md`](docs/como-rodar.md)**
- Índice da documentação: [`docs/README.md`](docs/README.md)
- Trabalhando com o Claude Code: [`docs/trabalhando-com-claude.md`](docs/trabalhando-com-claude.md)
- Plano de desenvolvimento: [`docs/plano.md`](docs/plano.md)
- Convenções para o time e para IAs: [`CLAUDE.md`](CLAUDE.md) (cópia em `AGENTS.md`)

## Começando

Pré-requisitos: Node (versão em `.nvmrc`), pnpm 10, Android Studio ou um Android físico
com depuração USB.

```bash
pnpm install
pnpm android        # gera e instala o dev client (expo run:android) e abre o Metro
```

Depois da primeira instalação, `pnpm start:usb` (celular no cabo) ou `pnpm start` (Wi-Fi)
basta para continuar desenvolvendo. O Expo Go
não funciona com este projeto.

APK para testes internos: `npx eas-cli@latest build --profile preview --platform android`.

## Scripts

| Script             | O que faz                                                |
| ------------------ | -------------------------------------------------------- |
| `pnpm typecheck`   | Checagem de tipos                                        |
| `pnpm lint`        | ESLint + Prettier + regra de cores só dos tokens         |
| `pnpm test`        | Jest (regras puras e componentes)                        |
| `pnpm db:generate` | Gera a migração do Drizzle após mudar `src/db/schema.ts` |
| `pnpm format`      | Formata o código                                         |
| `pnpm start`       | Metro para o app de desenvolvimento (Wi-Fi)              |
| `pnpm start:usb`   | Metro pelo cabo USB (`adb reverse` + localhost)          |

## Status

- **Fase 0** (fundação): concluída.
- **Fase 1** (CRUD financeiro): telas prontas e usadas com gastos reais. Falta o portão com
  dois membros, rodar o Maestro até o fim e a conferência de acessibilidade —
  [`docs/fase-1.md`](docs/fase-1.md).
- **Fase 2** (leitura de notificações): captura, Pendentes, configuração e diagnóstico
  prontos e testados no aparelho (inclusive reinício). Falta juntar 30 notificações reais,
  medir as metas de captura e precisão e a revisão do Kotlin —
  [`docs/fase-2.md`](docs/fase-2.md).
