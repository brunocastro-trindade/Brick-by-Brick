// Estado do Python no navegador. Carregar o Pyodide leva alguns segundos na primeira visita.
import { CircleCheck, CloudOff } from 'lucide-react';
import { useEstadoDoPython } from '../estado/usePython';
import styles from './ChipDoPython.module.css';

const TEXTOS = {
  carregando: { rotulo: 'Preparando o Python…', explicacao: 'O Python está sendo baixado para rodar aqui no navegador.' },
  pronto: { rotulo: 'Python pronto', explicacao: 'O Python 3.14 roda aqui mesmo, no seu navegador.' },
  falhou: {
    rotulo: 'Python indisponível',
    explicacao: 'O Python não carregou. Dá para jogar comparando com a planta; recarregue a página para tentar de novo.',
  },
} as const;

export function ChipDoPython() {
  const estado = useEstadoDoPython();
  const { rotulo, explicacao } = TEXTOS[estado];
  return (
    <span className={`${styles.chip} ${styles[estado]}`} role="status" title={explicacao}>
      {estado === 'carregando' ? <span className={styles.giro} aria-hidden="true" /> : null}
      {estado === 'pronto' ? <CircleCheck size={16} aria-hidden="true" /> : null}
      {estado === 'falhou' ? <CloudOff size={16} aria-hidden="true" /> : null}
      <span>{rotulo}</span>
    </span>
  );
}
