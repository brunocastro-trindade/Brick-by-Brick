// Tradução amigável dos erros do Python. A mensagem original (em inglês) continua visível:
// aprender a ler erro de verdade faz parte de aprender a programar.

export interface ExplicacaoDeErro {
  nome: string;
  explicacao: string;
}

const RECUO: ExplicacaoDeErro = {
  nome: 'Erro de recuo',
  explicacao:
    'O espaço no começo de alguma linha não está como o Python espera. Depois de uma linha que termina com dois-pontos, o bloco vem recuado; quando o bloco acaba, o recuo volta.',
};

const NOME: ExplicacaoDeErro = {
  nome: 'Nome desconhecido',
  explicacao:
    'O Python não conhece esse nome. Talvez a variável ainda não tenha sido criada, ou o nome esteja escrito diferente: maiúsculas e minúsculas contam.',
};

const EXPLICACOES: Record<string, ExplicacaoDeErro> = {
  SyntaxError: {
    nome: 'Erro de sintaxe',
    explicacao:
      'O Python não entendeu como a linha foi escrita. Confira aspas, parênteses e dois-pontos: todo símbolo que abre precisa fechar.',
  },
  IndentationError: RECUO,
  TabError: RECUO,
  NameError: NOME,
  UnboundLocalError: NOME,
  TypeError: {
    nome: 'Tipo errado',
    explicacao:
      'A operação não combina com esses tipos de valor, como somar texto com número ou chamar uma função com argumentos a menos.',
  },
  ValueError: {
    nome: 'Valor inválido',
    explicacao: 'O tipo até está certo, mas o valor não serve. Por exemplo: int("abc") não vira número.',
  },
  ZeroDivisionError: { nome: 'Divisão por zero', explicacao: 'Nenhum número pode ser dividido por zero.' },
  IndexError: {
    nome: 'Posição inexistente',
    explicacao: 'Essa posição não existe na lista. O índice começa no 0, e o último é len(lista) - 1.',
  },
  KeyError: {
    nome: 'Chave inexistente',
    explicacao: 'O dicionário não tem essa chave. Confira o nome exato, com as mesmas maiúsculas.',
  },
  AttributeError: {
    nome: 'Atributo inexistente',
    explicacao: 'Esse valor não tem o método ou atributo pedido. Confira o nome e o tipo do valor.',
  },
  EOFError: { nome: 'Faltou resposta', explicacao: 'O programa pediu mais respostas com input() do que o teste tem.' },
  RecursionError: {
    nome: 'Recursão sem fim',
    explicacao: 'Uma função chamou a si mesma vezes demais, sem nunca parar.',
  },
  LimiteDePassos: {
    nome: 'Programa sem fim',
    explicacao:
      'O programa rodou demais e foi parado. Parece um laço infinito: confira se a condição do laço chega a ficar falsa.',
  },
  TempoEsgotado: {
    nome: 'Programa travado',
    explicacao: 'O programa demorou demais para responder, então o Python foi reiniciado. Confira se há um laço sem fim.',
  },
};

export function explicarErro(tipo: string): ExplicacaoDeErro {
  return (
    EXPLICACOES[tipo] ?? {
      nome: 'Erro ao rodar',
      explicacao: 'O Python encontrou um problema ao rodar o programa. A mensagem dele costuma dizer o que houve e em qual linha.',
    }
  );
}
