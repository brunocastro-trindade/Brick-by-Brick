// Logo do Brick by Brick nos dois temas (ADR-0018): o claro tem o "by" marrom, que some no escuro (1,55:1); o escuro
// é a variação do autor, com o "by" creme. As duas imagens estão no HTML e o CSS mostra a do tema, inclusive no
// "seguir o aparelho", sem JavaScript. A do escuro é preguiçosa: quem usa o claro nunca a baixa.
import logoClaro from '../assets/logo.webp';
import logoEscuro from '../assets/logo-escuro.webp';
import logoPequenoClaro from '../assets/logo-pequeno.webp';
import logoPequenoEscuro from '../assets/logo-pequeno-escuro.webp';
import styles from './Logo.module.css';

export interface LogoProps {
  /** Grande na tela inicial (900 × 668); pequeno nos cabeçalhos (exibido com 90 px). */
  tamanho: 'grande' | 'pequeno';
  /** Texto alternativo; vazio quando o botão em volta já diz o que o logo faz. */
  alt: string;
}

export function Logo({ tamanho, alt }: LogoProps) {
  const [claro, escuro] = tamanho === 'grande' ? [logoClaro, logoEscuro] : [logoPequenoClaro, logoPequenoEscuro];
  const [largura, altura] = tamanho === 'grande' ? [900, 668] : [90, 67];
  return (
    <>
      <img className={styles.claro} src={claro} alt={alt} width={largura} height={altura} />
      <img className={styles.escuro} src={escuro} alt={alt} width={largura} height={altura} loading="lazy" />
    </>
  );
}
