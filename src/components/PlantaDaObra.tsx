// A planta da obra: o editor onde o programa cresce. Linhas assentadas aparecem como código;
// a linha da vez aparece com vagas para tijolos (montar), fileiras com recuo (empilhar)
// ou um molde para digitar (digitar). Na Vistoria (ADR-0016), toda linha é um molde vazio.
import { ArrowLeft, ArrowRight, FileCode, Undo2 } from 'lucide-react';
import type { ClipboardEvent, CSSProperties, KeyboardEvent, PointerEvent, ReactNode, Ref } from 'react';
import { RECUO_MAXIMO, type Montagem } from '../jogo/montagem';
import type { DesafioDigitar, DesafioEmpilhar, DesafioMontar, Linha, Tijolo } from '../jogo/tipos';
import { CodigoColorido } from './CodigoColorido';
import { TijoloDeCodigo } from './TijoloDeCodigo';
import styles from './PlantaDaObra.module.css';

type EstadoDaLinha = 'pronta' | 'nova' | 'atual' | 'futura';

/** Linhas futuras desenhadas como pontilhado; as demais viram um resumo, para a planta caber na tela. */
const FUTURAS_VISIVEIS = 2;

export function LinhaDaPlanta({
  numero,
  recuo = 0,
  estado,
  realce = false,
  alvo,
  children,
}: {
  numero: number;
  recuo?: number;
  estado: EstadoDaLinha;
  realce?: boolean;
  alvo?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`${styles.linha} ${styles[estado]} ${realce ? styles.realce : ''}`}
      style={{ '--recuo': recuo } as CSSProperties}
      data-alvo={alvo}
    >
      <span className={styles.numero} aria-hidden="true">
        {numero}
      </span>
      <div className={styles.conteudo}>{children}</div>
    </div>
  );
}

export interface PlantaDaObraProps {
  arquivo: string;
  rotuloDoProgresso: string;
  linhasProntas: Linha[];
  quantasNovas: number;
  /** Quantas linhas o desafio da vez ocupa (as `children`). */
  linhasDoDesafio: number;
  linhasFuturas: number;
  children?: ReactNode;
}

export function PlantaDaObra({
  arquivo,
  rotuloDoProgresso,
  linhasProntas,
  quantasNovas,
  linhasDoDesafio,
  linhasFuturas,
  children,
}: PlantaDaObraProps) {
  const primeiraNova = linhasProntas.length - quantasNovas;
  const numeroDaPrimeiraFutura = linhasProntas.length + linhasDoDesafio + 1;
  return (
    <section className={styles.planta} aria-label={`Planta da obra: ${arquivo}`}>
      <header className={styles.aba}>
        <span className={styles.arquivo}>
          <FileCode size={16} aria-hidden="true" />
          {arquivo}
        </span>
        <span className={styles.progresso}>{rotuloDoProgresso}</span>
      </header>
      <div className={styles.codigo}>
        {linhasProntas.map((linha, indice) => (
          <LinhaDaPlanta key={indice} numero={indice + 1} recuo={linha.recuo} estado={indice >= primeiraNova ? 'nova' : 'pronta'}>
            <CodigoColorido texto={linha.texto} />
          </LinhaDaPlanta>
        ))}
        {children}
        {Array.from({ length: Math.min(linhasFuturas, FUTURAS_VISIVEIS) }, (_, indice) => (
          <LinhaDaPlanta key={`futura-${indice}`} numero={numeroDaPrimeiraFutura + indice} estado="futura">
            <span className={styles.reticencias} aria-hidden="true" />
          </LinhaDaPlanta>
        ))}
        {linhasFuturas > FUTURAS_VISIVEIS ? (
          <p className={styles.resumoFuturas}>
            + {linhasFuturas - FUTURAS_VISIVEIS} {linhasFuturas - FUTURAS_VISIVEIS === 1 ? 'linha' : 'linhas'} na planta
          </p>
        ) : null}
      </div>
    </section>
  );
}

// ── montar ──────────────────────────────────────────────────────────────────

interface InteracaoComTijolos {
  tijolosPorId: Map<string, Tijolo>;
  tijoloComProblema: string | null;
  idArrastado: string | null;
  alvoSobre: string | null;
  bloqueada: boolean;
  pressionar: (id: string) => (evento: PointerEvent<HTMLElement>) => void;
  cliqueValido: () => boolean;
}

export function LinhaParaMontar({
  desafio,
  montagem,
  numero,
  vagaComRealce,
  aoSelecionarVaga,
  aoDevolver,
  ...interacao
}: InteracaoComTijolos & {
  desafio: DesafioMontar;
  montagem: Montagem;
  numero: number;
  vagaComRealce: number | null;
  aoSelecionarVaga: (vaga: number) => void;
  aoDevolver: (vaga: number) => void;
}) {
  const totalDeVagas = desafio.resposta.length;
  return (
    <LinhaDaPlanta numero={numero} recuo={desafio.recuo} estado="atual">
      <div className={styles.montagem}>
        {desafio.partes.map((parte, indice) => {
          if (parte.tipo === 'fixo') {
            return (
              <span key={indice} className={styles.fixo}>
                <CodigoColorido texto={parte.texto} />
              </span>
            );
          }
          const ocupante = montagem.vagas[parte.indice] ?? null;
          const tijolo = ocupante ? interacao.tijolosPorId.get(ocupante) : undefined;
          const ativa = !interacao.bloqueada && montagem.vagaAtiva === parte.indice;
          const classes = [
            styles.vaga,
            ativa ? styles.vagaAtiva : '',
            vagaComRealce === parte.indice ? styles.vagaRealce : '',
            interacao.alvoSobre === `vaga:${parte.indice}` ? styles.vagaSobre : '',
          ].join(' ');
          return (
            <span key={indice} className={classes} data-alvo={`vaga:${parte.indice}`}>
              {tijolo ? (
                <TijoloDeCodigo
                  texto={tijolo.texto}
                  idFlip={tijolo.id}
                  estado={
                    interacao.idArrastado === tijolo.id ? 'fantasma' : interacao.tijoloComProblema === tijolo.id ? 'problema' : 'encaixado'
                  }
                  classificacao={tijolo.classificacao}
                  desabilitado={interacao.bloqueada}
                  rotulo={`Espaço ${parte.indice + 1} de ${totalDeVagas}: ${tijolo.texto}. Toque para devolver à palete.`}
                  aoClicar={() => interacao.cliqueValido() && aoDevolver(parte.indice)}
                  aoPressionar={interacao.bloqueada ? undefined : interacao.pressionar(tijolo.id)}
                />
              ) : (
                <button
                  type="button"
                  className={styles.vagaVazia}
                  disabled={interacao.bloqueada}
                  aria-label={`Espaço ${parte.indice + 1} de ${totalDeVagas}, vazio${ativa ? ', selecionado' : ''}`}
                  aria-pressed={ativa}
                  onClick={() => aoSelecionarVaga(parte.indice)}
                />
              )}
            </span>
          );
        })}
      </div>
    </LinhaDaPlanta>
  );
}

// ── empilhar ────────────────────────────────────────────────────────────────

export function PilhaParaEmpilhar({
  desafio,
  montagem,
  numeroInicial,
  linhaComRealce,
  aoSelecionarLinha,
  aoDevolver,
  aoMudarRecuo,
  ...interacao
}: InteracaoComTijolos & {
  desafio: DesafioEmpilhar;
  montagem: Montagem;
  numeroInicial: number;
  linhaComRealce: number | null;
  aoSelecionarLinha: (linha: number) => void;
  aoDevolver: (linha: number) => void;
  aoMudarRecuo: (linha: number, delta: number) => void;
}) {
  const total = desafio.linhas.length;
  return (
    <>
      {montagem.pilha.map((peca, linha) => {
        const tijolo = peca ? interacao.tijolosPorId.get(peca.tijoloId) : undefined;
        const ativa = !interacao.bloqueada && montagem.linhaAtiva === linha;
        const sobre = interacao.alvoSobre === `linha:${linha}`;
        return (
          <LinhaDaPlanta key={linha} numero={numeroInicial + linha} estado="atual" realce={linhaComRealce === linha} alvo={`linha:${linha}`}>
            <div
              className={`${styles.fileira} ${ativa ? styles.fileiraAtiva : ''} ${sobre ? styles.fileiraSobre : ''}`}
              style={{ '--recuo-da-peca': peca?.recuo ?? 0, '--niveis': RECUO_MAXIMO } as CSSProperties}
            >
              <span className={styles.regua} data-regua aria-hidden="true" />
              <span className={styles.guias} aria-hidden="true" />
              {tijolo && peca ? (
                <span className={styles.peca}>
                  <TijoloDeCodigo
                    texto={tijolo.texto}
                    formato="linha"
                    idFlip={tijolo.id}
                    estado={
                      interacao.idArrastado === tijolo.id ? 'fantasma' : interacao.tijoloComProblema === tijolo.id ? 'problema' : 'encaixado'
                    }
                    classificacao={tijolo.classificacao}
                    desabilitado={interacao.bloqueada}
                    rotulo={`Linha ${linha + 1} de ${total} do bloco: ${tijolo.texto}, recuo ${peca.recuo}. Toque para selecionar.`}
                    aoClicar={() => interacao.cliqueValido() && aoSelecionarLinha(linha)}
                    aoPressionar={interacao.bloqueada ? undefined : interacao.pressionar(tijolo.id)}
                  />
                </span>
              ) : (
                <button
                  type="button"
                  className={`${styles.fileiraVazia} ${ativa ? styles.fileiraVaziaAtiva : ''}`}
                  disabled={interacao.bloqueada}
                  aria-label={`Linha ${linha + 1} de ${total} do bloco, vazia${ativa ? ', selecionada' : ''}`}
                  aria-pressed={ativa}
                  onClick={() => aoSelecionarLinha(linha)}
                />
              )}
              {ativa && peca ? (
                <span className={styles.controles}>
                  <button type="button" className={styles.controle} aria-label="Diminuir recuo" disabled={peca.recuo === 0} onClick={() => aoMudarRecuo(linha, -1)}>
                    <ArrowLeft size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.controle}
                    aria-label="Aumentar recuo"
                    disabled={peca.recuo === RECUO_MAXIMO}
                    onClick={() => aoMudarRecuo(linha, +1)}
                  >
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                  <button type="button" className={styles.controle} aria-label="Devolver linha à palete" onClick={() => aoDevolver(linha)}>
                    <Undo2 size={18} aria-hidden="true" />
                  </button>
                </span>
              ) : null}
            </div>
          </LinhaDaPlanta>
        );
      })}
    </>
  );
}

// ── digitar ─────────────────────────────────────────────────────────────────

export function MoldeParaDigitar({
  desafio,
  numero,
  valor,
  bloqueada,
  aoMudar,
  aoEnviar,
  aoColar,
}: {
  desafio: DesafioDigitar;
  numero: number;
  valor: string;
  bloqueada: boolean;
  aoMudar: (texto: string) => void;
  aoEnviar: () => void;
  aoColar: () => void;
}) {
  const aoTeclar = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      aoEnviar();
    }
  };
  const bloquearCola = (evento: ClipboardEvent<HTMLInputElement>) => {
    evento.preventDefault();
    aoColar();
  };
  return (
    <LinhaDaPlanta numero={numero} recuo={desafio.recuo} estado="atual">
      <input
        className={styles.molde}
        value={valor}
        disabled={bloqueada}
        onChange={(evento) => aoMudar(evento.target.value)}
        onKeyDown={aoTeclar}
        onPaste={bloquearCola}
        onDrop={(evento) => evento.preventDefault()}
        placeholder="digite a linha aqui"
        aria-label={`Linha ${numero}: digite o código`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-autofoco-molde
      />
    </LinhaDaPlanta>
  );
}

// ── vistoria ────────────────────────────────────────────────────────────────

/**
 * Uma fiada da Vistoria: molde vazio no recuo da planta. Espiada, a linha da planta aparece como guia
 * dentro da caixa (some ao digitar). Sem colar: é reescrita de memória.
 */
export function LinhaDaVistoria({
  numero,
  recuo,
  valor,
  guia,
  realce,
  bloqueada,
  campo,
  aoMudar,
  aoTeclar,
  aoFocar,
  aoColar,
}: {
  numero: number;
  recuo: number;
  valor: string;
  /** Texto da planta, só quando a fiada foi espiada. */
  guia: string | null;
  realce: boolean;
  bloqueada: boolean;
  campo?: Ref<HTMLInputElement>;
  aoMudar: (texto: string) => void;
  aoTeclar: (evento: KeyboardEvent<HTMLInputElement>) => void;
  aoFocar: () => void;
  aoColar: () => void;
}) {
  const bloquearCola = (evento: ClipboardEvent<HTMLInputElement>) => {
    evento.preventDefault();
    aoColar();
  };
  return (
    <LinhaDaPlanta numero={numero} recuo={recuo} estado="atual" realce={realce}>
      {guia !== null && valor !== '' ? (
        <span className={styles.guia} aria-hidden="true">
          {guia}
        </span>
      ) : null}
      <input
        ref={campo}
        className={`${styles.molde} ${styles.moldeDaVistoria} ${guia !== null ? styles.espiada : ''}`}
        value={valor}
        disabled={bloqueada}
        onChange={(evento) => aoMudar(evento.target.value)}
        onKeyDown={aoTeclar}
        onFocus={aoFocar}
        onPaste={bloquearCola}
        onDrop={(evento) => evento.preventDefault()}
        placeholder={guia ?? `fiada ${numero}`}
        aria-label={guia !== null ? `Fiada ${numero}, espiada: ${guia}` : `Fiada ${numero}: digite o código`}
        aria-invalid={realce || undefined}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </LinhaDaPlanta>
  );
}

