// Vitrine do design system (HARNESS §2.5): cada componente em todos os estados da matriz.
// Rota #/design-system, só no modo de desenvolvimento. É também o alvo das capturas de tela.
import { Hammer, Mail } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { BalaoDoPinguim, SeloDeClassificacao } from '../components/BalaoDoPinguim';
import { Botao } from '../components/Botao';
import { ChipDoPython } from '../components/ChipDoPython';
import { BlocoDeCodigo } from '../components/CodigoColorido';
import { ConsoleDaObra } from '../components/ConsoleDaObra';
import { Estrelas } from '../components/Estrelas';
import { GugloAnimado, NOMES_DOS_CONJUNTOS, type AnimacaoDoGuglo } from '../components/GugloAnimado';
import { FERRAMENTAS_DO_GUGLO, GugloComFerramenta } from '../components/GugloComFerramenta';
import { GugloPixelado, type AcaoDoGuglo } from '../components/GugloPixelado';
import { LimiteDeErro } from '../components/LimiteDeErro';
import { PecaDeEntulho, PecaQueCai, SilhuetaDaPeca } from '../components/PecaQueCai';
import { Pinguim, type PoseDoPinguim } from '../components/Pinguim';
import { MEDIDAS, PredioDaCidade, type SituacaoDoPredio } from '../components/PredioDaCidade';
import { TijoloDeCodigo, type EstadoDoTijolo } from '../components/TijoloDeCodigo';
import { criarPeca } from '../jogo/gugloWars';
import type { Fala } from '../jogo/falas';
import { MODELOS_DE_PREDIO } from '../jogo/tipos';
import styles from './TelaVitrine.module.css';

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={styles.secao}>
      <h2 className={styles.titulo}>{titulo}</h2>
      <div className={styles.grade}>{children}</div>
    </section>
  );
}

function Amostra({ rotulo, children, escura = false }: { rotulo: string; children: ReactNode; escura?: boolean }) {
  return (
    <figure className={`${styles.amostra} ${escura ? styles.escura : ''}`}>
      <div className={styles.palco}>{children}</div>
      <figcaption>{rotulo}</figcaption>
    </figure>
  );
}

const FALAS: Fala[] = [
  { humor: 'comemorando', selo: 'melhor', titulo: 'Encaixou certinho!', texto: '`print()` mostra na tela o que está entre os parênteses.' },
  { humor: 'pensando', selo: 'funciona_mas', titulo: 'Funciona, mas…', texto: 'Daqui a trinta linhas ninguém lembra o que é `x`.' },
  {
    humor: 'ops',
    selo: 'problema',
    titulo: 'O Python reclamou',
    texto: 'O Python não conhece esse nome.',
    erro: { nome: 'Nome desconhecido', tipo: 'NameError', mensagem: "name 'Quantidade' is not defined. Did you mean: 'quantidade'?", linha: 4 },
  },
  { humor: 'neutro', selo: 'dica', titulo: 'Dica', texto: 'Texto em Python fica entre aspas.' },
  {
    humor: 'pensando',
    selo: 'problema',
    titulo: 'Rodou, mas mostrou outra coisa',
    texto: 'Compare as duas:',
    comparacao: { esperado: 'Total produzido: 50\n', obtido: 'Total produzido: 10\nTotal produzido: 20\n' },
  },
];

const POSES: PoseDoPinguim[] = ['parado', 'andando', 'carregando', 'comemorando', 'pensando', 'ops'];
const ACOES_DO_GUGLO_PIXELADO: AcaoDoGuglo[] = ['parado', 'andando', 'acenando', 'comemorando'];
const ANIMACOES_DO_GUGLO: AnimacaoDoGuglo[] = ['parado', 'trabalhando', 'pensando', 'comemorando'];

const LINHA_DE_EXEMPLO = { texto: 'for i in range(3):', obra: 'Fábrica' };
const COPIAR = criarPeca(1, LINHA_DE_EXEMPLO, 1);
const LACUNA = criarPeca(2, LINHA_DE_EXEMPLO, 3);
const PECAS: Array<{ rotulo: string; conteudo: ReactNode }> = [
  { rotulo: 'copiar, vazia', conteudo: <PecaQueCai peca={COPIAR} digitado="" /> },
  { rotulo: 'copiar, no caminho', conteudo: <PecaQueCai peca={COPIAR} digitado="for i in ra" /> },
  { rotulo: 'copiar, com desvio', conteudo: <PecaQueCai peca={COPIAR} digitado="for i im" /> },
  { rotulo: 'lacuna, vazia', conteudo: <PecaQueCai peca={LACUNA} digitado="" /> },
  { rotulo: 'lacuna, digitando', conteudo: <PecaQueCai peca={LACUNA} digitado={LACUNA.resposta.slice(0, 2)} /> },
  { rotulo: 'lacuna, com desvio', conteudo: <PecaQueCai peca={LACUNA} digitado="x" /> },
  { rotulo: 'entulho', conteudo: <PecaDeEntulho texto={LINHA_DE_EXEMPLO.texto} /> },
  { rotulo: 'silhueta da próxima', conteudo: <SilhuetaDaPeca comprimento={LINHA_DE_EXEMPLO.texto.length} /> },
];
const ESTADOS_DO_TIJOLO: EstadoDoTijolo[] = ['solto', 'encaixado', 'problema', 'fantasma'];
const SITUACOES: SituacaoDoPredio[] = ['bloqueado', 'disponivel', 'em-obra', 'concluido'];

/** Lança um erro ao renderizar: mostra a tela "O canteiro parou" do LimiteDeErro na vitrine. */
function Quebra(): ReactNode {
  throw new Error('Erro de exemplo da vitrine');
}

/** A tela de erro (ADR-0012) só aparece quando algo quebra: aqui ela abre num botão, para revisar. */
function ExemploDaTelaDeErro() {
  const [aberta, setAberta] = useState(false);
  return aberta ? (
    <LimiteDeErro>
      <Quebra />
    </LimiteDeErro>
  ) : (
    <Botao variante="secundario" aoClicar={() => setAberta(true)}>
      Mostrar a tela de erro
    </Botao>
  );
}

export default function TelaVitrine() {
  return (
    <main className={styles.vitrine}>
      <h1>Design system · Brick by Brick</h1>
      <p>Componentes do sistema em todos os estados. Esta rota só existe em desenvolvimento.</p>

      <Secao titulo="Botão">
        {(['primario', 'secundario', 'fantasma'] as const).map((variante) => (
          <Amostra key={variante} rotulo={variante}>
            <Botao variante={variante} icone={<Hammer size={18} aria-hidden="true" />}>
              Assentar linha
            </Botao>
          </Amostra>
        ))}
        <Amostra rotulo="grande + atalho">
          <Botao tamanho="grande" atalho="Enter">
            Próximo tijolo
          </Botao>
        </Amostra>
        <Amostra rotulo="desabilitado">
          <Botao desabilitado>Assentar linha</Botao>
        </Amostra>
        <Amostra rotulo="carregando">
          <Botao carregando>Assentar linha</Botao>
        </Amostra>
        <Amostra rotulo="link (href)">
          <Botao href="mailto:exemplo@exemplo.com" icone={<Mail size={18} aria-hidden="true" />}>
            Enviar e-mail
          </Botao>
        </Amostra>
      </Secao>

      <Secao titulo="Tijolo de código: categorias">
        {['print', 'nome', 'if', '"Olá"', '2.5', '>=', '(', '#'].map((texto) => (
          <Amostra key={texto} rotulo={texto} escura>
            <TijoloDeCodigo texto={texto} numero={1} />
          </Amostra>
        ))}
      </Secao>

      <Secao titulo="Tijolo de código: estados">
        {ESTADOS_DO_TIJOLO.map((estado) => (
          <Amostra key={estado} rotulo={estado} escura>
            <TijoloDeCodigo texto="input(" estado={estado} classificacao="problema" />
          </Amostra>
        ))}
        <Amostra rotulo="linha (empilhar)" escura>
          <TijoloDeCodigo texto='print("Pode entrar!")' formato="linha" />
        </Amostra>
        <Amostra rotulo="desabilitado" escura>
          <TijoloDeCodigo texto="print" desabilitado />
        </Amostra>
      </Secao>

      <Secao titulo="Selos de classificação">
        {(['melhor', 'funciona_mas', 'problema', 'dica'] as const).map((selo) => (
          <Amostra key={selo} rotulo={selo}>
            <SeloDeClassificacao selo={selo} />
          </Amostra>
        ))}
      </Secao>

      <section className={styles.secao}>
        <h2 className={styles.titulo}>Balão do Guglo</h2>
        <div className={styles.coluna}>
          {FALAS.map((fala) => (
            <BalaoDoPinguim key={fala.titulo + fala.selo} fala={fala} />
          ))}
        </div>
      </section>

      <Secao titulo="Guglo">
        {POSES.map((pose) => (
          <Amostra key={pose} rotulo={pose}>
            <div className={styles.pinguim}>
              <Pinguim pose={pose} capacete={pose !== 'parado'} />
            </div>
          </Amostra>
        ))}
      </Secao>

      <Secao titulo="Guglo pixelado (mapa e obra pronta)">
        {ACOES_DO_GUGLO_PIXELADO.map((acao) => (
          <Amostra key={acao} rotulo={acao}>
            <div className={styles.pinguim}>
              <GugloPixelado acao={acao} />
            </div>
          </Amostra>
        ))}
      </Secao>

      <Secao titulo="Guglo com ferramenta (janelas dos modos)">
        {FERRAMENTAS_DO_GUGLO.map((ferramenta) => (
          <Amostra key={ferramenta} rotulo={ferramenta}>
            <div className={styles.pinguim}>
              <GugloComFerramenta ferramenta={ferramenta} />
            </div>
          </Amostra>
        ))}
      </Secao>

      <Secao titulo="Guglo animado (conjuntos por tema)">
        {NOMES_DOS_CONJUNTOS.flatMap((conjunto) =>
          ANIMACOES_DO_GUGLO.map((animacao) => (
            <Amostra key={`${conjunto}-${animacao}`} rotulo={`${conjunto} · ${animacao}`}>
              <div className={styles.pinguim}>
                <GugloAnimado conjunto={conjunto} animacao={animacao} />
              </div>
            </Amostra>
          )),
        )}
      </Secao>

      <section className={styles.secao}>
        <h2 className={styles.titulo}>Tela de erro (O canteiro parou)</h2>
        <ExemploDaTelaDeErro />
      </section>

      <Secao titulo="Peças do Guglo Wars">
        {PECAS.map(({ rotulo, conteudo }) => (
          <Amostra key={rotulo} rotulo={rotulo}>
            <div className={styles.peca}>{conteudo}</div>
          </Amostra>
        ))}
      </Secao>

      <Secao titulo="Estrelas e Python">
        {[0, 1, 2, 3].map((quantidade) => (
          <Amostra key={quantidade} rotulo={`${quantidade} estrelas`}>
            <Estrelas quantidade={quantidade} />
          </Amostra>
        ))}
        <Amostra rotulo="estado atual do Python">
          <ChipDoPython />
        </Amostra>
      </Secao>

      <section className={styles.secao}>
        <h2 className={styles.titulo}>Prédios da cidade</h2>
        {MODELOS_DE_PREDIO.map((modelo) => (
          <div key={modelo} className={styles.grade}>
            {SITUACOES.map((situacao) => (
              <Amostra key={situacao} rotulo={`${modelo} · ${situacao}`}>
                <svg viewBox={`-130 ${-MEDIDAS[modelo].altura - 130} 260 ${MEDIDAS[modelo].altura + 150}`} className={styles.predio}>
                  <PredioDaCidade modelo={modelo} situacao={situacao} progresso={0.5} idUnico={`vitrine-${modelo}-${situacao}`} />
                </svg>
              </Amostra>
            ))}
          </div>
        ))}
      </section>

      <Secao titulo="Código e console">
        <Amostra rotulo="bloco de código">
          <BlocoDeCodigo codigo={'idade = int(input("Sua idade? "))\nif idade >= 14:\n    print("Pode entrar!")  # bloco'} />
        </Amostra>
        <Amostra rotulo="console vazio">
          <ConsoleDaObra execucoes={null} estadoDoPython="pronto" programaVazio />
        </Amostra>
        <Amostra rotulo="console com abas">
          <ConsoleDaObra
            estadoDoPython="pronto"
            programaVazio={false}
            execucoes={[
              { entradas: ['15'], resultado: { saida: 'Sua idade? \u000215\u0003\nPode entrar!\n', saidaVerificacao: '', erro: null, variaveis: {} } },
              { entradas: ['10'], resultado: { saida: 'Sua idade? \u000210\u0003\n', saidaVerificacao: '', erro: null, variaveis: {} } },
            ]}
          />
        </Amostra>
      </Secao>
    </main>
  );
}
