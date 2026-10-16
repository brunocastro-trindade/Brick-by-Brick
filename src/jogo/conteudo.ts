// Lê uma obra em YAML (já parseada) e devolve o modelo tipado, acusando erro de autoria
// com caminho claro: "correio.yaml › desafio 2 › linha". Formato descrito no ADR-0003.
import {
  MAPAS,
  MODELOS_DE_PREDIO,
  type Classificacao,
  type Desafio,
  type Linha,
  type ModeloPredio,
  type Nivel,
  type Obra,
  type ParteDaLinha,
  type Tijolo,
  type TipoDesafio,
} from './tipos';

export class ErroDeConteudo extends Error {
  constructor(origem: string, mensagem: string) {
    super(`${origem}: ${mensagem}`);
    this.name = 'ErroDeConteudo';
  }
}

type Bruto = Record<string, unknown>;

const NIVEIS: readonly Nivel[] = ['basico', 'intermediario', 'avancado'];
const TIPOS: readonly TipoDesafio[] = ['montar', 'empilhar', 'digitar'];
const CLASSIFICACOES: readonly Classificacao[] = ['funciona_mas', 'problema'];
const ESPACOS_POR_RECUO = 4;

function objeto(valor: unknown, origem: string): Bruto {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new ErroDeConteudo(origem, 'era esperado um mapa de campos');
  }
  return valor as Bruto;
}

function texto(dados: Bruto, campo: string, origem: string): string {
  const valor = dados[campo];
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new ErroDeConteudo(`${origem} › ${campo}`, 'campo de texto obrigatório');
  }
  return valor;
}

function textoOpcional(dados: Bruto, campo: string, origem: string): string | undefined {
  return dados[campo] === undefined ? undefined : texto(dados, campo, origem);
}

function inteiro(dados: Bruto, campo: string, origem: string, padrao?: number): number {
  const valor = dados[campo] ?? padrao;
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0) {
    throw new ErroDeConteudo(`${origem} › ${campo}`, 'era esperado um inteiro maior ou igual a zero');
  }
  return valor;
}

function escolha<T extends string>(dados: Bruto, campo: string, opcoes: readonly T[], origem: string): T {
  const valor = dados[campo];
  if (typeof valor !== 'string' || !opcoes.includes(valor as T)) {
    throw new ErroDeConteudo(`${origem} › ${campo}`, `use um destes valores: ${opcoes.join(', ')}`);
  }
  return valor as T;
}

function lista(valor: unknown, origem: string): unknown[] {
  if (!Array.isArray(valor)) throw new ErroDeConteudo(origem, 'era esperada uma lista');
  return valor;
}

/**
 * Lê um bloco de código. Aceita texto em bloco (`|`) ou lista de strings — a lista permite
 * começar com uma linha recuada, o que o bloco do YAML não deixa. `recuoBase` soma ao recuo escrito.
 */
export function linhasDoBloco(valor: unknown, recuoBase: number, origem: string): Linha[] {
  let brutas: string[];
  if (typeof valor === 'string') brutas = valor.replace(/\n+$/, '').split('\n');
  else if (Array.isArray(valor) && valor.every((item) => typeof item === 'string')) brutas = valor as string[];
  else throw new ErroDeConteudo(origem, 'código deve ser texto em bloco ou lista de linhas');

  if (brutas.length === 0) throw new ErroDeConteudo(origem, 'bloco de código vazio');
  return brutas.map((bruta, indice) => {
    if (bruta.trim() === '') throw new ErroDeConteudo(`${origem} › linha ${indice + 1}`, 'linha em branco não vira tijolo');
    const espacos = bruta.length - bruta.trimStart().length;
    if (bruta.slice(0, espacos).includes('\t')) {
      throw new ErroDeConteudo(`${origem} › linha ${indice + 1}`, 'use espaços para recuar, não tab');
    }
    if (espacos % ESPACOS_POR_RECUO !== 0) {
      throw new ErroDeConteudo(`${origem} › linha ${indice + 1}`, `recuo deve ser múltiplo de ${ESPACOS_POR_RECUO} espaços`);
    }
    return { recuo: recuoBase + espacos / ESPACOS_POR_RECUO, texto: bruta.trim() };
  });
}

/** Separa a linha de um desafio `montar`: trechos entre crases são vagas, o resto é fixo. */
export function analisarLinhaMontar(linha: string, origem: string): { partes: ParteDaLinha[]; resposta: string[] } {
  const pedacos = linha.split('`');
  if (pedacos.length % 2 === 0) throw new ErroDeConteudo(origem, 'há uma crase sem par');
  const partes: ParteDaLinha[] = [];
  const resposta: string[] = [];
  pedacos.forEach((pedaco, indice) => {
    if (indice % 2 === 0) {
      if (pedaco !== '') partes.push({ tipo: 'fixo', texto: pedaco });
      return;
    }
    if (pedaco.trim() !== pedaco || pedaco === '') {
      throw new ErroDeConteudo(origem, `vaga "${pedaco}" vazia ou com espaço nas pontas`);
    }
    partes.push({ tipo: 'vaga', indice: resposta.length });
    resposta.push(pedaco);
  });
  if (resposta.length === 0) throw new ErroDeConteudo(origem, 'marque ao menos uma vaga entre crases');
  return { partes, resposta };
}

function processarExtras(valor: unknown, idDesafio: string, corretos: string[], origem: string): Tijolo[] {
  if (valor === undefined) return [];
  return lista(valor, `${origem} › extras`).map((item, indice) => {
    const local = `${origem} › extras › ${indice + 1}`;
    const dados = objeto(item, local);
    const textoDoTijolo = texto(dados, 'texto', local);
    if (corretos.includes(textoDoTijolo)) {
      throw new ErroDeConteudo(local, `"${textoDoTijolo}" já é um tijolo da resposta`);
    }
    return {
      id: `${idDesafio}-x${indice + 1}`,
      texto: textoDoTijolo,
      porque: texto(dados, 'porque', local),
      classificacao: dados.tipo === undefined ? 'problema' : escolha(dados, 'tipo', CLASSIFICACOES, local),
    };
  });
}

function processarDesafio(bruto: unknown, indice: number, idObra: string, origem: string): Desafio {
  const dados = objeto(bruto, origem);
  const tipo = escolha(dados, 'tipo', TIPOS, origem);
  const recuo = inteiro(dados, 'recuo', origem, 0);
  const base = {
    id: `${idObra}-${indice + 1}`,
    indice,
    titulo: texto(dados, 'titulo', origem),
    contexto: texto(dados, 'contexto', origem).trim(),
    dica: textoOpcional(dados, 'dica', origem)?.trim(),
    explicacao: texto(dados, 'explicacao', origem).trim(),
    verificar: textoOpcional(dados, 'verificar', origem)?.trimEnd(),
  };

  if (tipo === 'montar') {
    const linha = texto(dados, 'linha', origem);
    if (linha.includes('\n')) throw new ErroDeConteudo(`${origem} › linha`, 'montar usa uma linha só');
    const { partes, resposta } = analisarLinhaMontar(linha, `${origem} › linha`);
    const canonico = partes.map((parte) => (parte.tipo === 'fixo' ? parte.texto : resposta[parte.indice])).join('');
    if (/^\s/.test(canonico)) throw new ErroDeConteudo(`${origem} › linha`, 'use o campo recuo em vez de espaços no começo');
    const tijolos: Tijolo[] = [
      ...resposta.map((textoDoTijolo, posicao) => ({ id: `${base.id}-t${posicao + 1}`, texto: textoDoTijolo })),
      ...processarExtras(dados.extras, base.id, resposta, origem),
    ];
    return { ...base, tipo, recuo, partes, resposta, tijolos, linhas: [{ recuo, texto: canonico.trimEnd() }] };
  }

  const linhas = linhasDoBloco(dados.codigo, recuo, `${origem} › codigo`);
  if (tipo === 'digitar') {
    if (linhas.length !== 1) throw new ErroDeConteudo(`${origem} › codigo`, 'digitar usa uma linha só');
    return { ...base, tipo, recuo: linhas[0]?.recuo ?? recuo, linhas };
  }

  const tijolos: Tijolo[] = [
    ...linhas.map((linha, posicao) => ({ id: `${base.id}-l${posicao + 1}`, texto: linha.texto })),
    ...processarExtras(dados.extras, base.id, linhas.map((linha) => linha.texto), origem),
  ];
  return { ...base, tipo, tijolos, linhas };
}

function processarEntradas(valor: unknown, origem: string): string[][] {
  if (valor === undefined) return [[]];
  const conjuntos = lista(valor, `${origem} › entradas`).map((conjunto, indice) =>
    lista(conjunto, `${origem} › entradas › ${indice + 1}`).map(String),
  );
  if (conjuntos.length === 0) throw new ErroDeConteudo(`${origem} › entradas`, 'lista vazia: omita o campo');
  return conjuntos;
}

export function processarObra(bruta: unknown, origem: string): Obra {
  const dados = objeto(bruta, origem);
  const id = texto(dados, 'id', origem);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) throw new ErroDeConteudo(`${origem} › id`, 'use letras minúsculas, números e hífen');

  const dadosDaAula = objeto(dados.aula, `${origem} › aula`);
  const desafiosBrutos = lista(dados.desafios, `${origem} › desafios`);
  if (desafiosBrutos.length === 0) throw new ErroDeConteudo(`${origem} › desafios`, 'a obra precisa de ao menos um desafio');

  const inicial = dados.inicial === undefined ? [] : linhasDoBloco(dados.inicial, 0, `${origem} › inicial`);
  const desafios = desafiosBrutos.map((bruto, indice) =>
    processarDesafio(bruto, indice, id, `${origem} › desafio ${indice + 1}`),
  );

  return {
    id,
    ordem: inteiro(dados, 'ordem', origem),
    nome: texto(dados, 'nome', origem),
    conceito: texto(dados, 'conceito', origem),
    nivel: escolha(dados, 'nivel', NIVEIS, origem),
    modelo: escolha(dados, 'modelo', MODELOS_DE_PREDIO as readonly ModeloPredio[], origem),
    // Sem `mapa`, a obra é da Vila: as 10 primeiras nasceram antes de existir outro mapa (ADR-0021).
    mapa: dados.mapa === undefined ? 'vila' : escolha(dados, 'mapa', MAPAS, origem),
    // Provisório: a posição no mapa só se sabe com todas as obras (processarCidade).
    numero: inteiro(dados, 'ordem', origem),
    arquivo: `${id}.py`,
    aula: {
      titulo: texto(dadosDaAula, 'titulo', `${origem} › aula`),
      texto: texto(dadosDaAula, 'texto', `${origem} › aula`).trim(),
      exemplo: texto(dadosDaAula, 'exemplo', `${origem} › aula`).replace(/\n+$/, ''),
      saida: textoOpcional(dadosDaAula, 'saida', `${origem} › aula`)?.replace(/\n+$/, ''),
    },
    entradas: processarEntradas(dados.entradas, origem),
    inicial,
    desafios,
    totalLinhas: inicial.length + desafios.reduce((soma, desafio) => soma + desafio.linhas.length, 0),
  };
}

/** Ordena as obras e garante ids e ordens únicos. */
export function processarCidade(brutas: Array<{ origem: string; dados: unknown }>): Obra[] {
  const obras = brutas.map(({ origem, dados }) => processarObra(dados, origem)).sort((a, b) => a.ordem - b.ordem);
  const ids = new Set<string>();
  const ordens = new Set<number>();
  for (const obra of obras) {
    if (ids.has(obra.id)) throw new ErroDeConteudo(obra.arquivo, `id "${obra.id}" repetido`);
    if (ordens.has(obra.ordem)) throw new ErroDeConteudo(obra.arquivo, `ordem ${obra.ordem} repetida`);
    ids.add(obra.id);
    ordens.add(obra.ordem);
  }
  // Na ordem das obras, os mapas vêm em bloco e na ordem de MAPAS: o desbloqueio conta com isso (ADR-0021).
  obras.forEach((obra, indice) => {
    const anterior = obras[indice - 1];
    if (anterior && MAPAS.indexOf(obra.mapa) < MAPAS.indexOf(anterior.mapa)) {
      throw new ErroDeConteudo(obra.arquivo, `a obra do mapa ${obra.mapa} vem depois de uma do mapa ${anterior.mapa}: ajuste a ordem`);
    }
  });
  return obras.map((obra) => ({ ...obra, numero: obras.filter((outra) => outra.mapa === obra.mapa).indexOf(obra) + 1 }));
}
