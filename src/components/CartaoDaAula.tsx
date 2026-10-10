// A aula antes da obra: o conceito explicado em poucas linhas, um exemplo e a saída dele.
import { GraduationCap } from 'lucide-react';
import type { Obra } from '../jogo/tipos';
import { Botao } from './Botao';
import { BlocoDeCodigo } from './CodigoColorido';
import { Modal } from './Modal';
import { SaidaDoPrograma } from './SaidaDoPrograma';
import { TextoRico } from './TextoRico';
import styles from './CartaoDaAula.module.css';

export function CartaoDaAula({ obra, aoComecar, rotuloDoBotao = 'Começar a obra' }: { obra: Obra; aoComecar: () => void; rotuloDoBotao?: string }) {
  return (
    <Modal
      titulo={obra.aula.titulo}
      aoFechar={aoComecar}
      largura="larga"
      cabecalho={
        <span className={styles.selo}>
          <GraduationCap size={18} aria-hidden="true" />
          Aula · {obra.nome}
        </span>
      }
      rodape={
        <Botao tamanho="grande" aoClicar={aoComecar} atalho="Enter" autofoco>
          {rotuloDoBotao}
        </Botao>
      }
    >
      <div className={styles.aula}>
        <TextoRico texto={obra.aula.texto} />
        <div className={styles.exemplo}>
          <div className={styles.bloco}>
            <h3 className={styles.rotulo}>Exemplo</h3>
            <BlocoDeCodigo codigo={obra.aula.exemplo} rotulo="Código de exemplo" />
          </div>
          {obra.aula.saida ? (
            <div className={styles.bloco}>
              <h3 className={styles.rotulo}>Saída</h3>
              <div className={styles.saida}>
                <SaidaDoPrograma saida={obra.aula.saida} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
