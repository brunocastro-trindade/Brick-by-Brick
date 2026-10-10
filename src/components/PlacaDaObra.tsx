// A placa da obra escolhida no mapa: o que ela ensina, quanto já foi construído e o botão de entrar.
import { ArrowRight, Lock } from 'lucide-react';
import type { ProgressoObra } from '../jogo/progresso';
import type { Nivel, Obra } from '../jogo/tipos';
import { Botao } from './Botao';
import { Estrelas } from './Estrelas';
import type { SituacaoDoPredio } from './PredioDaCidade';
import styles from './PlacaDaObra.module.css';

export const NOMES_DO_NIVEL: Record<Nivel, string> = {
  basico: 'Vila do Alicerce · básico',
  intermediario: 'Centro · intermediário',
  avancado: 'Alto da Colina · avançado',
};

export interface PlacaDaObraProps {
  obra: Obra;
  situacao: SituacaoDoPredio;
  progresso: ProgressoObra;
  obraAnterior: Obra | null;
  aoEntrar: () => void;
}

export function PlacaDaObra({ obra, situacao, progresso, obraAnterior, aoEntrar }: PlacaDaObraProps) {
  const feitos = Math.min(progresso.passo, obra.desafios.length);
  const rotuloDoBotao =
    situacao === 'concluido' && progresso.passo >= obra.desafios.length
      ? 'Ver obra pronta'
      : progresso.passo > 0
        ? 'Continuar obra'
        : situacao === 'concluido'
          ? 'Construir de novo'
          : 'Entrar na obra';
  return (
    <section className={`${styles.placa} ${styles[situacao]}`} aria-labelledby={`placa-${obra.id}`}>
      <header className={styles.cabecalho}>
        <span className={styles.numero}>{obra.ordem}</span>
        <div className={styles.nomes}>
          <h2 id={`placa-${obra.id}`} className={styles.nome}>
            {obra.nome}
          </h2>
          <span className={styles.bairro}>{NOMES_DO_NIVEL[obra.nivel]}</span>
        </div>
        {progresso.estrelas > 0 ? <Estrelas quantidade={progresso.estrelas} tamanho="pequeno" /> : null}
      </header>

      <p className={styles.conceito}>
        <span className={styles.rotulo}>Aula</span>
        {obra.conceito}
      </p>
      <p className={styles.chamada}>{obra.aula.titulo}</p>

      {situacao === 'bloqueado' ? (
        <p className={styles.trava}>
          <Lock size={18} aria-hidden="true" />
          {obraAnterior ? `Conclua ${obraAnterior.nome} para liberar esta obra.` : 'Esta obra ainda está fechada.'}
        </p>
      ) : (
        <>
          <div className={styles.progresso}>
            <div className={styles.barra} aria-hidden="true">
              <span style={{ width: `${(feitos / obra.desafios.length) * 100}%` }} />
            </div>
            <span className={styles.contagem}>
              {feitos} de {obra.desafios.length} mini desafios
            </span>
          </div>
          <Botao tamanho="grande" larguraTotal icone={<ArrowRight size={20} aria-hidden="true" />} aoClicar={aoEntrar}>
            {rotuloDoBotao}
          </Botao>
        </>
      )}
    </section>
  );
}
