// Ajustes: som, modo livre (abre todas as obras), levar o progresso para outro aparelho (ADR-0011) e apagar o
// progresso, com confirmação.
import { Download, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import {
  arquivoDeProgresso,
  lerArquivoDeProgresso,
  TAMANHO_MAXIMO_DO_ARQUIVO,
  totalDeEstrelas,
  type Progresso,
} from '../jogo/progresso';
import { Botao } from './Botao';
import { Modal } from './Modal';
import styles from './ModalDeAjustes.module.css';

export interface ModalDeAjustesProps {
  progresso: Progresso;
  som: boolean;
  modoLivre: boolean;
  aoAlternarSom: () => void;
  aoAlternarModoLivre: () => void;
  aoApagarProgresso: () => void;
  aoCarregarProgresso: (novo: Progresso) => void;
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

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function resumo(progresso: Progresso): string {
  const concluidas = Object.values(progresso.obras).filter((obra) => obra.concluida).length;
  return `${plural(concluidas, 'obra concluída', 'obras concluídas')}, ${plural(totalDeEstrelas(progresso), 'estrela', 'estrelas')} e recorde de ${plural(progresso.gugloWars.recorde, 'ponto', 'pontos')} no Guglo Wars`;
}

/** Baixa o progresso num arquivo e carrega um arquivo de volta, com confirmação antes de trocar (ADR-0011). */
function LevarProgresso({ progresso, aoCarregar }: { progresso: Progresso; aoCarregar: (novo: Progresso) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [lido, setLido] = useState<Progresso | null>(null);
  const [aviso, setAviso] = useState<{ tom: 'erro' | 'feito'; texto: string } | null>(null);

  const baixar = () => {
    const agora = new Date();
    const endereco = URL.createObjectURL(new Blob([arquivoDeProgresso(progresso, agora)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = endereco;
    link.download = `brick-by-brick-progresso-${agora.toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    // Alguns navegadores só começam a ler o endereço depois do clique; solta a memória logo depois.
    setTimeout(() => URL.revokeObjectURL(endereco), 1000);
  };

  const escolher = async (evento: ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0];
    evento.target.value = ''; // deixa escolher o mesmo arquivo de novo
    if (!arquivo) return;
    const novo = arquivo.size <= TAMANHO_MAXIMO_DO_ARQUIVO ? lerArquivoDeProgresso(await arquivo.text()) : null;
    setLido(novo);
    setAviso(
      novo ? null : { tom: 'erro', texto: 'Esse arquivo não é um progresso do Brick by Brick. Escolha o arquivo que o botão "Baixar progresso" gerou.' },
    );
  };

  return (
    <div className={styles.bloco}>
      <span className={styles.textos}>
        <span className={styles.rotulo}>Levar para outro aparelho</span>
        <span className={styles.descricao}>
          Baixe um arquivo com suas obras, estrelas e recordes. No outro navegador, abra os Ajustes e carregue o arquivo.
        </span>
      </span>
      <div className={styles.botoes}>
        <Botao variante="secundario" icone={<Download size={18} aria-hidden="true" />} aoClicar={baixar}>
          Baixar progresso
        </Botao>
        <Botao variante="secundario" icone={<Upload size={18} aria-hidden="true" />} aoClicar={() => entrada.current?.click()}>
          Carregar progresso…
        </Botao>
        <input ref={entrada} type="file" accept=".json,application/json" hidden onChange={escolher} />
      </div>
      {lido ? (
        <div className={styles.confirmacao}>
          <p>O arquivo tem {resumo(lido)}. Trocar o progresso deste navegador por ele? O atual some.</p>
          <div className={styles.botoes}>
            <Botao variante="secundario" aoClicar={() => setLido(null)}>
              Manter o atual
            </Botao>
            <Botao
              aoClicar={() => {
                aoCarregar(lido);
                setLido(null);
                setAviso({ tom: 'feito', texto: 'Progresso carregado. A cidade já mostra as obras do arquivo.' });
              }}
            >
              Trocar pelo do arquivo
            </Botao>
          </div>
        </div>
      ) : null}
      {aviso ? (
        <p className={`${styles.aviso} ${aviso.tom === 'erro' ? styles.erro : styles.feito}`} role={aviso.tom === 'erro' ? 'alert' : 'status'}>
          {aviso.texto}
        </p>
      ) : null}
    </div>
  );
}

export function ModalDeAjustes({
  progresso,
  som,
  modoLivre,
  aoAlternarSom,
  aoAlternarModoLivre,
  aoApagarProgresso,
  aoCarregarProgresso,
  aoFechar,
}: ModalDeAjustesProps) {
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
        <LevarProgresso progresso={progresso} aoCarregar={aoCarregarProgresso} />
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
