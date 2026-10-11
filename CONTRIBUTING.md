# Como construir junto

Este é o guia de quem quer modificar o Brick by Brick: rodar o jogo na própria máquina, criar uma aula,
mudar a interface ou consertar um tijolo torto. A apresentação do projeto está no [README](README.md).

## Rodar o jogo

Requer Node 22.12 ou mais novo.

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

Na primeira visita o navegador baixa o Python (~13,5 MB), que roda inteiro no navegador via Pyodide.

## Criar uma obra (aula)

Cada obra é um arquivo em `conteudo/obras/`. Ao carregar, o jogo valida o arquivo e aponta o caminho exato
de qualquer erro de escrita, como `correio.yaml › desafio 2 › linha`. O essencial do formato:

```yaml
id: correio            # vira correio.py na planta
ordem: 1
nome: Correio
conceito: print() e textos
nivel: basico          # basico | intermediario | avancado
modelo: casa           # tipo de prédio da obra
aula:
  titulo: O Python fala com print()
  texto: |
    Explicação curta, com `código` e **destaque**.
  exemplo: |
    print("Bom dia!")
  saida: |
    Bom dia!
desafios:
  - tipo: montar                      # vagas entre crases
    titulo: Diga olá para a cidade
    contexto: >-
      O que a obra precisa agora.
    linha: 'print(`"Olá, mundo!"`)'
    extras:                           # tijolos que não são a resposta
      - texto: 'Olá, mundo!'
        porque: >-
          Sem aspas, o Python acha que Olá é o nome de alguma coisa.
      # tipo: funciona_mas            # padrão: problema
    dica: >-
      Texto em Python fica entre aspas.
    explicacao: >-
      O que a pessoa aprendeu ao acertar.
  - tipo: empilhar                    # linhas inteiras; o recuo faz parte da resposta
    codigo: |
      for i in range(3):
          print(i)
    # ...titulo, contexto, extras, dica, explicacao
  - tipo: digitar
    codigo: 'print("Tijolo por tijolo")'
    # ...
```

Detalhes que valem a pena saber:

- **montar:** as vagas da linha ficam entre crases. A crase não existe na sintaxe do Python 3, então nunca
  colide com código. Vagas coladas também funcionam: `` '`print``(``"Olá"``)`' ``.
- **empilhar:** `codigo` aceita bloco (`|`) ou lista de strings; a lista permite começar com uma linha recuada.
- **digitar:** `codigo` traz a linha esperada; aspas simples ou duplas valem igual.
- `recuo` desloca o desafio inteiro (4 espaços por nível). `extras` são tijolos com `texto`, `porque` e
  `tipo` (`problema`, o padrão, ou `funciona_mas`). `verificar` é código oculto que roda depois do programa
  para testar comportamento — use sempre que a obra definir uma função.
- `entradas` lista conjuntos de respostas para `input()`; o primeiro aparece no console do jogo.
- Dentro de uma string com aspas simples no YAML, a aspa simples é escrita dobrada (`''`).

Depois de escrever, rode `npm run conteudo:validar`. Ele executa a obra inteira no Python de verdade, confere
que a resposta da planta é aceita de primeira e que nenhum tijolo marcado como "tem um problema" se comporta
igual à resposta (senão a explicação estaria mentindo).

## Antes de propor uma mudança

| Comando | O que confere |
|---|---|
| `npm test` | Testes, incluindo todas as obras rodando no Python |
| `npm run lint` | ESLint e a barreira do design system (nada de cor ou px literal nos componentes) |
| `npm run typecheck` | TypeScript |
| `npm run build` | Gera `dist/`, já com o Python em `dist/pyodide/` |
| `npm run fumaca` | Joga o primeiro desafio e uma peça do Guglo Wars num Chromium de verdade, contra `npx vite preview --port 4173` |

Cores, espaços e tipos vêm de `tokens/*.json`; depois de mudá-los, rode `npm run tokens`. A vitrine dos
componentes fica em `http://localhost:5173/#/design-system` (só em desenvolvimento).

Para propor a mudança, crie uma branch (`feat/...` ou `fix/...`), escreva os commits no padrão Conventional
Commits (`feat:`, `fix:`, `docs:`…) e abra um pull request.

## Como o código se organiza

- `src/jogo/` — regras puras e testadas: leitura das obras, montagem das linhas, validação, pontuação, progresso e o Guglo Wars.
- `src/python/` — execução do Python num Web Worker; o mesmo `executor.py` roda nos testes.
- `src/components/` e `src/telas/` — interface. Componentes só usam os tokens do design system.
- `conteudo/obras/` — as aulas, uma por arquivo.
- `tokens/` — cores, espaços e tipos; `scripts/` — gerador de tokens, verificador de estilos e teste de fumaça.

Stack: React 19, Vite 8, TypeScript 6, Pyodide 314 (Python 3.14), Vitest 5, fontes Rubik e JetBrains Mono (OFL)
e ícones Lucide (ISC).

## Licença das contribuições

Ao contribuir, você concorda que o código entra sob a [AGPL-3.0](LICENSE) e o conteúdo das aulas sob a
[CC BY-SA 4.0](conteudo/LICENSE), as mesmas licenças do projeto.
