#!/usr/bin/env bash
# Simula a notificação de um banco no aparelho conectado (adb), para testar a captura sem
# esperar uma compra de verdade. A notificação sai como `com.android.shell`, que o módulo só
# aceita em build de depuração (pnpm android).
#
# Uso:
#   scripts/simulate-notification.sh "<título>" "<texto>" [tag]
#   scripts/simulate-notification.sh --exemplos
#
# A mesma tag com outro texto simula o banco atualizando a notificação (gera outro registro);
# repetir tag e texto simula o Android repostando a mesma (o módulo ignora).
#
# Requer Android 10+ e o acesso a notificações liberado para o Kustho.
set -euo pipefail

# Aspas simples para o shell do aparelho: o adb junta os argumentos num só comando.
quote() {
  printf "'%s'" "${1//\'/\'\\\'\'}"
}

post() {
  local title="$1" text="$2" tag="${3:-kustho-$(date +%s%N)}"
  adb shell cmd notification post -S bigtext -t "$(quote "$title")" "$(quote "$tag")" "$(quote "$text")" >/dev/null
  echo "Postada [$tag] $title: $text"
}

if [[ "${1:-}" == "--exemplos" ]]; then
  # Textos fictícios no estilo dos bancos (nada de dado real aqui).
  post "Compra aprovada" "Compra de R\$ 45,90 APROVADA em PADARIA EXEMPLO para o cartão final 0000." exemplo-1
  post "Pix recebido" "Você recebeu um Pix de R\$ 150,00 de FULANO DE TAL." exemplo-2
  post "Compra no débito" "Compra no débito de R\$ 23,50 em MERCADO EXEMPLO." exemplo-3
  exit 0
fi

if [[ $# -lt 2 ]]; then
  sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

post "$1" "$2" "${3:-}"
