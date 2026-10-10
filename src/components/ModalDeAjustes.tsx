// Ajustes: som, modo livre (abre todas as obras) e apagar o progresso, com confirmação.
import { useState } from 'react';
import { Botao } from './Botao';
import { Modal } from './Modal';
import styles from './ModalDeAjustes.module.css';

export interface ModalDeAjustesProps {
  som: boolean;
  modoLivre: boolean;
  aoAlternarSom: () => void;
  aoAlternarModoLivre: () => void;
  aoApagarProgresso: () => void;
  aoFechar: () => void;
}

function Chave({ ligada, rotulo, descricao, aoAlternar }: { ligada: boolean; rotulo: string; descricao: string; aoAlternar: () => void }) {
  return (
    <label className={styles.opcao}>
      <span className={styles.textos}>
        <span className={styles.rotulo}>{rotulo}</span>
        <span className={styles.descricao}>{descricao}</span>
      </span>
      <button type="button" role="switch" aria-checked={ligada} className={styles.chave} onClick={aoAlternar}>
        <span className={styles.bolinha} />
        <span className="somente-leitor">{rotulo}</span>
      </button>
    </label>
  );
}

export function ModalDeAjustes({ som, modoLivre, aoAlternarSom, aoAlternarModoLivre, aoApagarProgresso, aoFechar }: ModalDeAjustesProps) {
  const [confirmando, setConfirmando] = useState(false);
  return (
    <Modal titulo="Ajustes" aoFechar={aoFechar} rodape={<Botao aoClicar={aoFechar} autofoco>Fechar ajustes</Botao>}>
      <div className={styles.lista}>
        <Chave ligada={som} rotulo="Som" descricao="Tijolos encaixando, fiadas subindo e a fanfarra da obra pronta." aoAlternar={aoAlternarSom} />
        <Chave
          ligada={modoLivre}
          rotulo="Modo livre"
          descricao="Abre todas as obras, fora de ordem. Útil para revisar uma aula ou testar conteúdo novo."
          aoAlternar={aoAlternarModoLivre}
        />
        <div className={styles.perigo}>
          <span className={styles.textos}>
            <span className={styles.rotulo}>Apagar progresso</span>
            <span className={styles.descricao}>Volta a cidade ao terreno vazio: obras, estrelas e recordes somem deste navegador.</span>
          </span>
          {confirmando ? (
            <div className={styles.confirmacao}>
              <p>Apagar tudo mesmo? Não dá para desfazer.</p>
              <div className={styles.botoes}>
                <Botao variante="secundario" aoClicar={() => setConfirmando(false)}>
                  Manter progresso
                </Botao>
                <Botao
                  aoClicar={() => {
                    aoApagarProgresso();
                    setConfirmando(false);
                  }}
                >
                  Apagar progresso
                </Botao>
              </div>
            </div>
          ) : (
            <Botao variante="secundario" aoClicar={() => setConfirmando(true)}>
              Apagar progresso…
            </Botao>
          )}
        </div>
      </div>
    </Modal>
  );
}
