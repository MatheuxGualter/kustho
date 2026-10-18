# Nova tarefa

```text
Tarefa: <descreva em uma ou duas frases o que o usuário deve conseguir fazer>.
Trilha: <A/B/C/D> (pastas em docs/fase-1.md, tabela "Trilhas").

Antes de codar:
1. Leia docs/fase-1.md e a parte de docs/plano.md sobre <assunto>.
2. Me diga quais arquivos vai mexer e se precisa mudar contrato, schema ou app.json
   (esses eu combino com o grupo antes).

Depois:
- Regra nova com teste primeiro em src/domain/.
- Tela só pelos serviços (useServices), textos em strings.ts, visual só pelos tokens.
- Rode pnpm typecheck && pnpm lint && pnpm test.
- Crie a branch feat/<assunto> a partir da main, commit em Conventional Commits,
  marque o item em docs/fase-1.md e abra o PR com o modelo do repositório.
- No fim, me diga como testar no celular e se precisa recompilar.
```
