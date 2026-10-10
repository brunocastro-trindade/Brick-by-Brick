// Embaralhamento com semente, para a palete não entregar a resposta na ordem.

/** Gerador mulberry32: rápido, determinístico e bom o bastante para jogo. */
export function criarSorteio(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function embaralhar<T>(itens: readonly T[], sorteio: () => number): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(sorteio() * (i + 1));
    [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
  }
  return copia;
}

/** Embaralha evitando devolver a ordem da resposta (quando há mais de um item). */
export function embaralharSemEntregar<T>(itens: readonly T[], sorteio: () => number, ehResposta: (ordem: T[]) => boolean): T[] {
  let resultado = embaralhar(itens, sorteio);
  for (let tentativa = 0; tentativa < 12 && itens.length > 1 && ehResposta(resultado); tentativa += 1) {
    resultado = embaralhar(itens, sorteio);
  }
  return resultado;
}
