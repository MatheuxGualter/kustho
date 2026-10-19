# Documentação do Kustho

| Documento                                                | Para quê                                                              | Quando ler                         |
| -------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------- |
| [`como-rodar.md`](como-rodar.md)                         | Configurar a máquina, rodar no celular, problemas comuns              | Primeiro dia; quando algo quebrar  |
| [`trabalhando-com-claude.md`](trabalhando-com-claude.md) | Fluxo de uma tarefa com o Claude Code, passagem de bastão, armadilhas | Antes da primeira tarefa           |
| [`fase-1.md`](fase-1.md)                                 | Status da Fase 1 (CRUD): pronto, falta, validação no aparelho         | Antes de escolher uma tarefa       |
| [`fase-2.md`](fase-2.md)                                 | Status da Fase 2 (notificações): idem                                 | Antes de escolher uma tarefa       |
| [`fase-3.md`](fase-3.md)                                 | Status da Fase 3 (conciliação e comprovantes): idem                   | Antes de escolher uma tarefa       |
| [`plano.md`](plano.md)                                   | Visão do produto, regras de negócio, fases 0 a 5, riscos              | Ao decidir regra, escopo ou visual |
| [`prompts/`](prompts/)                                   | Pedidos prontos para o Claude Code que já funcionaram                 | Ao começar uma tarefa              |
| [`../.maestro/README.md`](../.maestro/README.md)         | Testes ponta a ponta com o Maestro (apagam os dados do aparelho)      | Antes de rodar o Maestro           |
| [`../CLAUDE.md`](../CLAUDE.md)                           | Convenções de código (lido automaticamente pelo Claude)               | Sempre que for escrever código     |

**Caminho de quem chega agora:** `como-rodar.md` → `trabalhando-com-claude.md` →
`fase-1.md` / `fase-2.md` / `fase-3.md` → escolher uma pendência → usar um modelo de `prompts/`.

Mantendo atualizado: status vai para `fase-1.md` ou `fase-2.md`, regra de produto para `plano.md`,
convenção de código para `CLAUDE.md` + `AGENTS.md`. Detalhes em
`trabalhando-com-claude.md`, seção 4.
