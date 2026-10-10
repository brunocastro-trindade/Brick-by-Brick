// Tokenizador de uma linha de Python. Serve para colorir código, desenhar a parede
// (cada token vira um tijolo) e comparar respostas ignorando espaços e estilo de aspas.

export type CategoriaToken =
  | 'palavra-chave'
  | 'funcao'
  | 'nome'
  | 'texto'
  | 'numero'
  | 'comentario'
  | 'operador'
  | 'pontuacao'
  | 'espaco'
  | 'desconhecido';

export interface Token {
  categoria: CategoriaToken;
  texto: string;
}

const PALAVRAS_CHAVE = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
  'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
]);

const FUNCOES_EMBUTIDAS = new Set([
  'print', 'input', 'int', 'float', 'str', 'bool', 'len', 'range', 'list', 'dict', 'set', 'tuple',
  'type', 'sum', 'min', 'max', 'abs', 'round', 'sorted', 'reversed', 'enumerate', 'zip', 'open',
  'isinstance', 'super', 'map', 'filter', 'any', 'all', 'repr', 'chr', 'ord',
]);

const PADROES: ReadonlyArray<readonly [CategoriaToken, RegExp]> = [
  ['espaco', /\s+/y],
  ['comentario', /#.*/y],
  ['texto', /(?:[rRbBuUfF]{1,2})?(?:"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/y],
  ['numero', /(?:\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)j?/y],
  // Identificador como o do Python: letra (de qualquer alfabeto) ou _, seguida de letras, dígitos ou _.
  // Símbolos como × e ÷ ficam de fora e caem em "desconhecido".
  ['nome', /[\p{L}\p{Nl}_][\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}]*/uy],
  ['operador', /\*\*=|\/\/=|>>=|<<=|->|:=|\*\*|\/\/|==|!=|<=|>=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|>>|<<|[-+*/%<>=!&|^~@]/y],
  ['pontuacao', /[()[\]{}:,.;]/y],
];

/** Quebra a linha em tokens, incluindo os espaços (para reconstruir o texto exato). */
export function tokenizar(linha: string): Token[] {
  const tokens: Token[] = [];
  let posicao = 0;
  while (posicao < linha.length) {
    let casou = false;
    for (const [categoria, padrao] of PADROES) {
      padrao.lastIndex = posicao;
      const resultado = padrao.exec(linha);
      if (!resultado || resultado[0].length === 0) continue;
      const texto = resultado[0];
      tokens.push({ categoria: refinar(categoria, texto), texto });
      posicao += texto.length;
      casou = true;
      break;
    }
    if (!casou) {
      tokens.push({ categoria: 'desconhecido', texto: linha[posicao] ?? '' });
      posicao += 1;
    }
  }
  return tokens;
}

function refinar(categoria: CategoriaToken, texto: string): CategoriaToken {
  if (categoria !== 'nome') return categoria;
  if (PALAVRAS_CHAVE.has(texto)) return 'palavra-chave';
  if (FUNCOES_EMBUTIDAS.has(texto)) return 'funcao';
  return 'nome';
}

/** Tokens sem os espaços. */
export function tokensSignificativos(linha: string): Token[] {
  return tokenizar(linha).filter((token) => token.categoria !== 'espaco');
}

/**
 * Chave de comparação de um token: textos com aspas simples ou duplas viram a mesma chave,
 * e o prefixo (f, r, b) não diferencia maiúsculas.
 */
export function chaveDoToken(token: Token): string {
  if (token.categoria !== 'texto') return `${token.categoria}:${token.texto}`;
  const inicioAspas = token.texto.search(/["']/);
  const prefixo = token.texto.slice(0, inicioAspas).toLowerCase();
  const conteudo = token.texto.slice(inicioAspas + 1, -1);
  return `texto:${prefixo}|${conteudo}`;
}

/** Duas linhas são equivalentes se têm os mesmos tokens, ignorando espaços e estilo de aspas. */
export function linhasEquivalentes(a: string, b: string): boolean {
  const chavesA = tokensSignificativos(a).map(chaveDoToken);
  const chavesB = tokensSignificativos(b).map(chaveDoToken);
  return chavesA.length === chavesB.length && chavesA.every((chave, indice) => chave === chavesB[indice]);
}

/** Categoria dominante de um tijolo de texto livre (pode ter vários tokens, como `input(`). */
export function categoriaDoTijolo(texto: string): CategoriaToken {
  const tokens = tokensSignificativos(texto);
  const primeiro = tokens[0];
  if (!primeiro) return 'desconhecido';
  if (tokens.every((token) => token.categoria === 'operador' || token.categoria === 'pontuacao')) {
    return primeiro.categoria === 'operador' ? 'operador' : 'pontuacao';
  }
  return tokens.find((token) => token.categoria !== 'pontuacao')?.categoria ?? primeiro.categoria;
}
