// Guglo pixelado de capacete com uma ferramenta na mão (refs/Guglo-pixelado, ADR-0006).
// Cada janela de explicação de modo usa uma ferramenta diferente, para a tela não repetir o mesmo desenho.
import martelo from '../assets/guglo-ferramentas/guglo-martelo.webp';
import marteloErguido from '../assets/guglo-ferramentas/guglo-martelo-erguido.webp';
import chave from '../assets/guglo-ferramentas/guglo-chave.webp';
import picareta from '../assets/guglo-ferramentas/guglo-picareta.webp';
import caixa from '../assets/guglo-ferramentas/guglo-caixa.webp';
import pa from '../assets/guglo-ferramentas/guglo-pa.webp';
import styles from './GugloComFerramenta.module.css';

export type FerramentaDoGuglo = 'martelo' | 'martelo-erguido' | 'chave' | 'picareta' | 'caixa' | 'pa';

const IMAGENS: Record<FerramentaDoGuglo, string> = {
  martelo,
  'martelo-erguido': marteloErguido,
  chave,
  picareta,
  caixa,
  pa,
};

export const FERRAMENTAS_DO_GUGLO = Object.keys(IMAGENS) as FerramentaDoGuglo[];

export interface GugloComFerramentaProps {
  ferramenta: FerramentaDoGuglo;
}

/** Decorativo: o texto da janela já explica o modo. */
export function GugloComFerramenta({ ferramenta }: GugloComFerramentaProps) {
  return <img className={styles.guglo} src={IMAGENS[ferramenta]} alt="" width={320} height={344} />;
}
