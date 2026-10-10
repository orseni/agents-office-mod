# Escritório dos Agentes

**Um escritório em pixel art, ao vivo, logo acima do prompt do Claude Code.** O orquestrador e cada subagente que ele aciona aparecem numa faixa como bonequinhos animados pelo que cada um está fazendo agora: lendo, editando, rodando comando, consultando uma skill, navegando na web, delegando ou esperando por você.

Feito para repositórios de **git submodules** (ou qualquer monorepo) em que um orquestrador passa o trabalho a um subagente por componente: cada subagente recebe o nome da pasta em que trabalha.

[English](README.md)

| Escritório | Robô | Tamagotchi |
| :---: | :---: | :---: |
| ![Escritório](docs/office.gif) | ![Robô](docs/robot.gif) | ![Tamagotchi](docs/tamagotchi.gif) |

## Instalação

No prompt de uma sessão do Claude Code no terminal:

```
/plugin install agents-office-mod --marketplace orseni/agents-office-mod
```

Responda `y` para adicionar o marketplace e escolha o escopo:

- **project**: só o projeto em que você está mostra o escritório. Instale de novo em cada projeto que quiser.
- **user**: todos os projetos mostram.

A faixa aparece acima do prompt assim que a sessão começa. `/agent-office` esconde e traz de volta; o `[-]` do Claude Code (ou ctrl+x ctrl+a) recolhe por um momento.

Exige um Claude Code com mods de function hooks (2.1.294 ou mais novo) e terminal com truecolor (iTerm2, Ghostty, WezTerm, Kitty, terminal do VS Code…).

Para a interface em português, coloque `language` em `pt-BR` na configuração do plugin (`/config`).

## O que cada bonequinho mostra

Nos GIFs acima, da esquerda para a direita: ocioso, pensando, lendo, editando, executando, delegando, skill, web, precisa de você, concluído, erro.

| Estado | Quando | Animação |
| --- | --- | --- |
| ocioso | nada a fazer; o turno do orquestrador acabou | cochila, café, `z z z` |
| pensando | entre uma ferramenta e outra | balão de pensamento com reticências |
| lendo | `Read`, `Grep`, `Glob` | segura uma folha, olhos varrendo |
| editando | `Edit`, `Write`, `NotebookEdit` | digita; código rola no monitor |
| executando | `Bash`, `PowerShell`, `Monitor` | digita rápido num terminal verde |
| delegando | `Agent`, `SendMessage`, `Workflow` | no telefone; um aviãozinho de papel sai voando |
| skill | `Skill` | livro aberto com brilhos |
| web | `WebFetch`, `WebSearch`, MCP de navegador | globo girando |
| precisa de você | `AskUserQuestion`, `ExitPlanMode`, diálogo de permissão | levanta a mão; balão com `?` |
| concluído | um subagente terminou; o turno do orquestrador acabou | braços para cima, confete |
| erro | um comando falhou; um subagente parou num erro | mãos na cabeça, tela vermelha |

Cada cartão mostra ainda o nome do agente, o que ele está fazendo (`Edit lambda_function.py`, `$ make test`), há quanto tempo está na sala, quantas ferramentas chamou e, nos subagentes, os tokens que a execução gastou. O subagente fica na sala depois de terminar e sai quando você manda o próximo pedido.

"Precisa de você" acompanha o diálogo de permissão que o Claude Code mostra de verdade, então as decisões do próprio modo auto não acendem o estado.

## Ajustes

A faixa tem 6 linhas de altura: bonequinhos mini de 20×10 com nome, estado, ação atual e estatísticas ao lado, enfileirados da direita para a esquerda (o orquestrador fica na ponta direita). Quando há mais agentes do que cabem, eles quebram para outra fileira. Se o terminal for baixo demais até para isso, ela vira uma lista com uma linha por agente. Prefere bonecos grandes? Ponha `large` em `true` para sprites de 16×20 numa faixa de 15 linhas.

Troque o avatar pelo prompt. A escolha fica guardada entre sessões.

```
/agent-office                      esconde ou mostra a faixa
/agent-office robo                 escritorio | robo | tamagotchi
/agent-office esconder             esconder | mostrar
```

Os padrões ficam na configuração do plugin (`/config`, ou `pluginConfigs` no settings):

| Opção | Padrão | |
| --- | --- | --- |
| `avatar` | `office` | `office`, `robot`, `tamagotchi` |
| `large` | `false` | bonecos grandes de 16×20 (faixa de 15 linhas) no lugar dos mini (6 linhas) |
| `language` | `en` | `en`, `pt-BR` |
| `showOnStart` | `true` | mostra a faixa quando a sessão começa |
| `statusLine` | `true` | "Escritório dos Agentes · 2 trabalhando · 1 precisam de você" na linha de status |
| `notify` | `false` | toast quando um subagente termina ou falha |

## Como os subagentes ganham nome

No início da sessão o escritório lista as pastas da raiz do projeto e os caminhos do `.gitmodules`. Quando o orquestrador delega, o subagente recebe o nome da primeira dessas pastas que o prompt dele cita. Um prompt de delegação como

```
Voce esta atuando como agente especialista de neuronio-dashboard-api.
Escopo EXCLUSIVO: arquivos dentro de neuronio-dashboard-api/.
```

gera um bonequinho chamado `neuronio-dashboard-api`, com cor própria. Sem correspondência, o nome vem do `name` da chamada Agent, do diretório de trabalho, do tipo de agente customizado (`code-reviewer`) ou da descrição.

## Como funciona

É um mod do Claude Code: um plugin de function hooks, sem servidor e sem dependências. Detalhes técnicos e estrutura do código no [README em inglês](README.md#how-it-works).

## Licença

[MIT](LICENSE)
