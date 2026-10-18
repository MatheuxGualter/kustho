# Como rodar o Kustho

Guia para configurar a máquina do zero e rodar o app num Android. O caminho testado pelo
grupo é **Ubuntu + celular Android por USB**; no fim há notas para Windows e macOS.

> O Kustho **não roda no Expo Go**. Ele usa um _dev client_ próprio, que você compila uma
> vez e instala no celular. Depois disso, o dia a dia é só `pnpm start`.

## Resumo rápido (para quem já tem tudo instalado)

```bash
git clone https://github.com/MatheuxGualter/kustho && cd kustho
nvm use && pnpm install
pnpm android          # 1ª vez: compila e instala (10–20 min)
pnpm start            # nas próximas vezes
```

---

## 1. Instalar as ferramentas (Ubuntu, uma vez só)

### 1.1 Pacotes do sistema

```bash
sudo apt update
sudo apt install -y git curl unzip gh android-sdk-platform-tools-common
sudo usermod -aG plugdev $USER
```

- `gh` é o GitHub CLI, usado para login no repositório privado.
- `android-sdk-platform-tools-common` instala as regras que deixam o Linux reconhecer o
  celular pelo USB.

### 1.2 Node (via nvm) e pnpm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22.22.0
nvm alias default 22.22.0
corepack enable
```

A versão do Node está fixada em `.nvmrc`; a do pnpm, no `package.json` (o `corepack` usa
a certa sozinho). Nada disso precisa de `sudo`.

### 1.3 Android Studio

```bash
sudo snap install android-studio --classic
android-studio
```

1. No assistente, escolha **Standard** (baixa o SDK em `~/Android/Sdk`).
2. Na tela inicial: **More Actions → SDK Manager → SDK Tools**. Marque
   **Android SDK Command-line Tools** e **Android SDK Platform-Tools** → Apply.
3. (Opcional) Para usar emulador: **More Actions → Virtual Device Manager → Create device**,
   e habilite o KVM:
   ```bash
   sudo apt install -y qemu-kvm
   sudo usermod -aG kvm $USER
   ```

### 1.4 Variáveis de ambiente

```bash
cat >> ~/.bashrc <<'EOF'

# Android / React Native
export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME="/snap/android-studio/current/jbr"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
EOF
```

### 1.5 Limite de arquivos observados (Metro)

```bash
echo "fs.inotify.max_user_watches=524288" | sudo tee /etc/sysctl.d/99-watchers.conf
sudo sysctl --system
```

### 1.6 Deixar a compilação leve (evita o PC travar)

A primeira compilação nativa consome muita RAM. Sem isso, máquinas com 8 GB costumam
congelar no meio:

```bash
mkdir -p ~/.gradle
cat >> ~/.gradle/gradle.properties <<'EOF'
org.gradle.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=512m
org.gradle.workers.max=2
org.gradle.parallel=false
kotlin.daemon.jvmargs=-Xmx1g
EOF
```

Com 16 GB ou mais, pode usar `-Xmx4g` e `workers.max=4`. Se `free -h` mostrar menos de
4 GB de swap, crie uma:

```bash
sudo fallocate -l 8G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 1.7 Reinicie (ou faça logout e login)

Isso aplica os grupos `plugdev`/`kvm` e as variáveis. Depois confira:

```bash
node -v          # v22.22.0
pnpm -v          # 10.28.0
adb version
java -version
echo $ANDROID_HOME
```

---

## 2. Baixar o projeto

```bash
gh auth login        # GitHub.com → HTTPS → Login with a web browser
gh auth setup-git
mkdir -p ~/dev && cd ~/dev
git clone https://github.com/MatheuxGualter/kustho
cd kustho
code .
```

No terminal do VS Code:

```bash
git config user.name "Seu Nome"
git config user.email "seu-email@exemplo.com"
nvm use              # lê o .nvmrc
pnpm install
pnpm test            # deve passar tudo
```

**Extensões recomendadas no VS Code:** ESLint, Prettier, Tailwind CSS IntelliSense e
Expo Tools.

---

## 3. Rodar no celular

### 3.1 Preparar o celular

1. **Configurações → Sobre o telefone** → toque 7 vezes em **Número da versão**.
2. **Opções do desenvolvedor** → ligue **Depuração USB**.
3. Conecte por cabo e aceite **"Permitir depuração USB?"** na tela do celular.

```bash
adb devices                              # deve listar o celular como "device"
adb shell getprop ro.product.cpu.abi     # arquitetura (quase sempre arm64-v8a)
```

### 3.2 Compilar e instalar (primeira vez)

```bash
ORG_GRADLE_PROJECT_reactNativeArchitectures=arm64-v8a pnpm android
```

A variável faz o Gradle compilar só para a arquitetura do seu celular (bem mais rápido e
leve). Troque `arm64-v8a` pelo valor do passo 3.1 se for diferente. Leva de 10 a 20
minutos; no fim o Kustho abre no celular.

### 3.3 Dia a dia

```bash
pnpm start
```

Abra o Kustho no celular; ele conecta sozinho. No terminal: `a` abre no Android, `r`
recarrega, `j` abre o depurador.

**Quando recompilar (`pnpm android` de novo):** só quando entrar uma dependência nativa
nova ou mudar o `app.json` ou os ícones/splash em `assets/images/`. O PR avisa quando for o
caso. Mudanças só de código TypeScript não precisam.

A pasta `android/` é gerada uma vez e o `pnpm android` não a refaz sozinho: mudanças de
ícone, splash, nome, permissões ou plugins no `app.json` só entram regerando a pasta antes:

```bash
npx expo prebuild --clean --platform android   # apaga e gera android/ de novo
pnpm android
```

### 3.4 Testar uma branch

```bash
git fetch origin
git checkout <nome-da-branch>
pnpm install
pnpm start --clear      # --clear limpa o cache do Metro na troca de branch
```

Se a branch mexe no `app.json`, em ícones ou em dependências nativas (o PR avisa), rode
antes `npx expo prebuild --clean --platform android` e `pnpm android`.

### 3.5 Dados de exemplo

No app: **Mais → Catálogo de componentes → Popular dados de exemplo** (3 contas,
2 cartões e 3 meses de lançamentos). O mesmo catálogo mostra todos os componentes, para
conferir os temas claro e escuro e a fonte grande.

### 3.6 Ícone do app e splash

Ficam em `assets/images/` e são configurados no `app.json`. Para trocar, gere os PNGs
nestes formatos (mesmos nomes) e regere o nativo (`prebuild --clean`, passo 3.3):

| Arquivo                       | Tamanho   | Conteúdo                                                              |
| ----------------------------- | --------- | --------------------------------------------------------------------- |
| `icon.png`                    | 1024×1024 | Fundo verde opaco, sem transparência e sem cantos arredondados        |
| `android-icon-foreground.png` | 1024×1024 | Só o desenho, fundo transparente, dentro do círculo central de ~60%   |
| `android-icon-background.png` | 1024×1024 | Verde `#0F766E` sólido                                                |
| `android-icon-monochrome.png` | 1024×1024 | Mesmo desenho e posição do foreground, uma cor só, fundo transparente |
| `splash-icon.png`             | 1024×1024 | Aparece com 120 dp no centro, sobre fundo claro e escuro              |
| `favicon.png`                 | 48×48     | Só para a web                                                         |

---

## 4. Antes de cada commit

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Fluxo de branches, PRs e trabalho com o Claude Code: [`trabalhando-com-claude.md`](trabalhando-com-claude.md).

---

## 5. Problemas comuns

| Sintoma                                                     | O que fazer                                                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| PC trava durante o `pnpm android`                           | Faça o passo 1.6, feche Android Studio e emulador, e use a variável de arquitetura do passo 3.2              |
| A compilação parou no meio                                  | Rode o mesmo comando de novo: o Gradle retoma do que já ficou pronto. Antes, `pkill -f GradleDaemon`         |
| Erro estranho ao retomar                                    | `cd android && ./gradlew clean && cd ..` e compile de novo. Persistindo, `rm -rf android` (a pasta é gerada) |
| Saber se o app está instalado                               | `adb shell pm list packages \| grep kustho` deve mostrar `package:app.kustho`                                |
| `adb devices` mostra `no permissions`                       | Faltou logout depois do `usermod`. Depois: `adb kill-server && adb devices`                                  |
| `adb devices` vazio                                         | Troque o cabo (alguns só carregam) e confirme o aviso no celular                                             |
| `SDK location not found`                                    | `echo $ANDROID_HOME` vazio: `source ~/.bashrc` ou reabra o terminal                                          |
| `ENOSPC: System limit for number of file watchers`          | Passo 1.5                                                                                                    |
| Erro de versão do Java no Gradle                            | `java -version`; o `JAVA_HOME` deve apontar para o `jbr` do Android Studio                                   |
| Emulador: "KVM is required"                                 | Grupo `kvm` (passo 1.3) e virtualização ligada na BIOS                                                       |
| Tela vermelha "unable to connect" no app                    | `pnpm start` rodando? Com cabo, rode `adb reverse tcp:8081 tcp:8081`                                         |
| App abre com tela branca ou erro depois de trocar de branch | `pnpm install` e `pnpm start --clear`                                                                        |

---

## 6. Sem Android Studio: compilar na nuvem (EAS)

Para máquinas fracas, o Expo compila o APK na nuvem:

```bash
npx eas-cli@latest login       # conta Expo gratuita
npx eas-cli@latest build --profile development --platform android
```

No fim aparece um QR code para instalar o APK. Depois, `pnpm start` no PC com o celular
na mesma rede Wi-Fi. O plano gratuito tem fila e limite mensal de builds.

APK para outras pessoas testarem (sem dev client): perfil `preview`.

```bash
npx eas-cli@latest build --profile preview --platform android
```

---

## 7. Windows e macOS

Os passos são os mesmos em ideia; mudam os instaladores:

- **Windows:** `winget install Git.Git CoreyButler.NVMforWindows Google.AndroidStudio`
  num PowerShell como administrador; depois `nvm install 22.22.0`, `nvm use 22.22.0` e
  `corepack enable`. Variáveis: `ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk`,
  `JAVA_HOME=C:\Program Files\Android\Android Studio\jbr` e
  `%LOCALAPPDATA%\Android\Sdk\platform-tools` no `Path`. Clone o projeto num caminho
  curto (ex.: `C:\dev\kustho`): caminhos longos quebram o build do Android.
- **macOS:** `brew install git gh nvm` e Android Studio pelo site; `ANDROID_HOME` em
  `~/Library/Android/sdk` e `JAVA_HOME` em
  `/Applications/Android Studio.app/Contents/jbr/Contents/Home`.

Essas duas variações não foram testadas pelo grupo ainda; se algo diferir, atualize este
arquivo no seu PR.
