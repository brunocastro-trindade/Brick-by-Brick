// Um tijolo com um pedaço de código. A cor da face diz a categoria (palavra-chave, texto, número…),
// como num muro de verdade, onde cada tijolo tem um tom: aprender a ler as categorias é aprender sintaxe.
import { OctagonAlert, TriangleAlert } from 'lucide-react';
import type { PointerEvent } from 'react';
import { categoriaDoTijolo, type CategoriaToken } from '../jogo/tokenizador';
import type { Classificacao } from '../jogo/tipos';
import styles from './TijoloDeCodigo.module.css';

export type EstadoDoTijolo = 'solto' | 'encaixado' | 'problema' | 'fantasma';

const NOMES_DE_CATEGORIA: Record<CategoriaToken, string> = {
  'palavra-chave': 'palavra-chave',
  funcao: 'função',
  nome: 'nome',
  texto: 'texto',
  numero: 'número',
  comentario: 'comentário',
  operador: 'operador',
  pontuacao: 'pontuação',
  espaco: 'espaço',
  desconhecido: 'símbolo',
};

export interface TijoloDeCodigoProps {
  texto: string;
  formato?: 'pedaco' | 'linha';
  estado?: EstadoDoTijolo;
  classificacao?: Classificacao;
  numero?: number;
  idFlip?: string;
  rotulo?: string;
  desabilitado?: boolean;
  aoClicar?: () => void;
  aoPressionar?: (evento: PointerEvent<HTMLButtonElement>) => void;
}

export function TijoloDeCodigo({
  texto,
  formato = 'pedaco',
  estado = 'solto',
  classificacao,
  numero,
  idFlip,
  rotulo,
  desabilitado = false,
  aoClicar,
  aoPressionar,
}: TijoloDeCodigoProps) {
  const categoria = formato === 'linha' ? 'nome' : categoriaDoTijolo(texto);
  const classes = [styles.tijolo, styles[`categoria-${categoria}`], styles[estado], styles[formato]].join(' ');
  return (
    <button
      type="button"
      className={classes}
      data-flip={idFlip}
      disabled={desabilitado}
      aria-label={rotulo ?? `Tijolo ${NOMES_DE_CATEGORIA[categoria]}: ${texto}`}
      onClick={aoClicar}
      onPointerDown={aoPressionar}
    >
      {numero !== undefined ? (
        <span className={styles.numero} aria-hidden="true">
          {numero}
        </span>
      ) : null}
      <span className={styles.texto}>{texto}</span>
      {estado === 'problema' ? (
        <span className={styles.alerta} aria-hidden="true">
          {classificacao === 'funciona_mas' ? <TriangleAlert size={14} /> : <OctagonAlert size={14} />}
        </span>
      ) : null}
    </button>
  );
}

/** Desenho do tijolo flutuando enquanto é arrastado. */
export function TijoloFlutuante({ texto, formato }: { texto: string; formato: 'pedaco' | 'linha' }) {
  const categoria = formato === 'linha' ? 'nome' : categoriaDoTijolo(texto);
  return (
    <span className={[styles.tijolo, styles[`categoria-${categoria}`], styles.flutuante, styles[formato]].join(' ')}>
      <span className={styles.texto}>{texto}</span>
    </span>
  );
}
