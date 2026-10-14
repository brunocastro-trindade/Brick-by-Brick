// Vistoria (ADR-0016): o programa da obra pronta é reescrito de memória, fiada por fiada.
// As regras moram em src/jogo/vistoria.ts; aqui ficam o teclado, o Python, o som e o progresso.
import { ArrowLeft, ClipboardCheck, Eye, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import logo from '../assets/logo-pequeno.webp';
import { BalaoDoPinguim } from '../components/BalaoDoPinguim';
import { Botao } from '../components/Botao';
import { ConsoleDaObra, type ExecucaoNoConsole } from '../components/ConsoleDaObra';
import { GugloPixelado } from '../components/GugloPixelado';
import { Modal } from '../components/Modal';
import { LinhaDaVistoria, PlantaDaObra } from '../components/PlantaDaObra';
import { prefereMenosMovimento, useEstadoDoPython } from '../estado/usePython';
import { falaDaVistoria, type Fala } from '../jogo/falas';
import { registrarVistoria, type Progresso } from '../jogo/progresso';
import type { Obra } from '../jogo/tipos';
import { avaliarVistoria, fiadasDeComentario, moldeDaVistoria, programaDaSaidaEsperada, saidaComComentarios, type VereditoDaVistoria } from '../jogo/vistoria';
import { pythonDoJogo } from '../python/executor';
import { definirSom, sons } from '../som/sons';
import styles from './TelaVistoria.module.css';

type Fase = 'escrevendo' | 'verificando' | 'aprovada';

/** Fiada a apontar na planta: a do erro, da segunda entrega errada em diante (como a fala). */
function fiadaDoVeredito(veredito: VereditoDaVistoria, errosAnteriores: number): number | null {
  if (veredito.tipo === 'incompleta') return veredito.vazias[0] ?? null;
  if (veredito.tipo === 'certo' || errosAnteriores < 1) return null;
  return veredito.linha;
}

export interface TelaVistoriaProps {
  obra: Obra;
  progresso: Progresso;
  atualizarProgresso: (mudar: (atual: Progresso) => Progresso) => void;
  aoVoltar: () => void;
  aoIrParaInicio: () => void;
}

export function TelaVistoria({ obra, progresso, atualizarProgresso, aoVoltar, aoIrParaInicio }: TelaVistoriaProps) {
  const planta = useMemo(() => moldeDaVistoria(obra), [obra]);
  const [textos, setTextos] = useState<string[]>(() => planta.map(() => ''));
  const [espiadas, setEspiadas] = useState<ReadonlySet<number>>(new Set());
  const [linhaAtiva, setLinhaAtiva] = useState(0);
  const [fase, setFase] = useState<Fase>('escrevendo');
  const [erros, setErros] = useState(0);
  const [fala, setFala] = useState<Fala | null>(null);
  const [realce, setRealce] = useState<number | null>(null);
  const [mostrarFim, setMostrarFim] = useState(false);
  const [dePrimeira, setDePrimeira] = useState(false);
  const campos = useRef<(HTMLInputElement | null)[]>([]);
  const caixaDeFalas = useRef<HTMLDivElement>(null);
  const estadoDoPython = useEstadoDoPython();

  useEffect(() => definirSom(progresso.som), [progresso.som]);
  useEffect(() => campos.current[0]?.focus(), []);

  // Saída esperada: a planta rodando com cada conjunto de entradas, com os comentários dela no lugar.
  const codigoDaPlanta = useMemo(() => programaDaSaidaEsperada(obra), [obra]);
  const temComentario = fiadasDeComentario(obra).length > 0;
  const [execucoes, setExecucoes] = useState<ExecucaoNoConsole[] | null>(null);
  useEffect(() => {
    if (estadoDoPython !== 'pronto') return;
    let cancelado = false;
    Promise.all(obra.entradas.map((entradas) => pythonDoJogo.executar({ codigo: codigoDaPlanta, entradas })))
      .then((resultados) => {
        if (cancelado) return;
        setExecucoes(
          resultados.map((resultado, i) => ({
            entradas: obra.entradas[i] ?? [],
            resultado: { ...resultado, saida: saidaComComentarios(obra, resultado.saida) },
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [codigoDaPlanta, estadoDoPython, obra]);

  // Cada entrega traz uma fala nova: ela precisa entrar na tela, mesmo com a planta comprida.
  useEffect(() => {
    if (!fala) return;
    caixaDeFalas.current?.scrollIntoView({ block: 'nearest', behavior: prefereMenosMovimento() ? 'auto' : 'smooth' });
  }, [fala]);

  const focar = (indice: number) => campos.current[Math.max(0, Math.min(planta.length - 1, indice))]?.focus();

  const entregar = async () => {
    if (fase !== 'escrevendo') return;
    setFase('verificando');
    let veredito: VereditoDaVistoria;
    try {
      veredito = await avaliarVistoria({ obra, textos, executor: pythonDoJogo.pronto() ? pythonDoJogo : null });
    } catch {
      veredito = await avaliarVistoria({ obra, textos, executor: null });
    }
    // Fiada vazia não conta como erro: é aviso, não tentativa.
    const contaComoErro = veredito.tipo !== 'certo' && veredito.tipo !== 'incompleta';
    setFala(falaDaVistoria(veredito, planta, erros, espiadas.size));
    if (veredito.tipo === 'certo') {
      const resultado = { dePrimeira: erros === 0 && espiadas.size === 0, espiadas: espiadas.size };
      atualizarProgresso((atual) => registrarVistoria(atual, obra.id, resultado));
      setDePrimeira(resultado.dePrimeira);
      setRealce(null);
      setFase('aprovada');
      sons.obra();
      setMostrarFim(true);
      return;
    }
    const fiada = fiadaDoVeredito(veredito, erros);
    setRealce(fiada);
    if (contaComoErro) setErros((anteriores) => anteriores + 1);
    setFase('escrevendo');
    sons.erro();
    if (fiada !== null) focar(fiada);
  };

  const espiar = () => {
    if (fase !== 'escrevendo' || espiadas.has(linhaAtiva)) return;
    sons.dica();
    setEspiadas((atuais) => new Set([...atuais, linhaAtiva]));
    focar(linhaAtiva);
  };

  const recomecar = () => {
    setTextos(planta.map(() => ''));
    setEspiadas(new Set());
    setErros(0);
    setFala(null);
    setRealce(null);
    setFase('escrevendo');
    setMostrarFim(false);
    setLinhaAtiva(0);
    // Espera o modal fechar e devolver o foco antes de levar o cursor para a primeira fiada.
    setTimeout(() => focar(0), 0);
  };

  const aoTeclar = (indice: number) => (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      if (indice < planta.length - 1) focar(indice + 1);
      else void entregar();
    } else if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      focar(indice + 1);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      focar(indice - 1);
    }
  };

  const preenchidas = textos.filter((texto) => texto.trim() !== '').length;
  const bloqueada = fase !== 'escrevendo';

  return (
    <div className={styles.tela}>
      <header className={styles.barra}>
        <button type="button" className={styles.logo} onClick={aoIrParaInicio} aria-label="Brick by Brick: voltar ao início">
          <img src={logo} alt="" width={90} height={67} />
        </button>
        <h1 className={styles.titulo}>
          <ClipboardCheck size={26} aria-hidden="true" />
          Vistoria: {obra.nome}
        </h1>
        <div className={styles.acoesDaBarra}>
          <Botao variante="fantasma" icone={<ArrowLeft size={18} aria-hidden="true" />} aoClicar={aoVoltar} rotulo="Voltar à cidade">
            Cidade
          </Botao>
        </div>
      </header>

      <main className={styles.area}>
        <div className={styles.colunaDoTrabalho}>
          <section className={styles.missao} aria-labelledby="titulo-da-vistoria">
            <span className={styles.etiqueta}>
              <ClipboardCheck size={16} aria-hidden="true" />
              Vistoria · {obra.conceito}
            </span>
            <h2 id="titulo-da-vistoria" className={styles.missaoTitulo}>
              Reescreva {obra.arquivo} de memória
            </h2>
            <p>
              A planta escondeu o código de {obra.nome}. Cada caixa é uma fiada, com o recuo já no lugar: digite o que vai nela. Pode ser do seu
              jeito, desde que o programa faça a mesma coisa e use os mesmos nomes de variável.
            </p>
            <p className={styles.nota}>Enter passa para a próxima fiada; na última, entrega a vistoria.</p>
          </section>

          <PlantaDaObra
            arquivo={obra.arquivo}
            rotuloDoProgresso={`${preenchidas} de ${planta.length} fiadas`}
            linhasProntas={[]}
            quantasNovas={0}
            linhasDoDesafio={planta.length}
            linhasFuturas={0}
          >
            {planta.map((linha, indice) => (
              <LinhaDaVistoria
                key={indice}
                numero={indice + 1}
                recuo={linha.recuo}
                valor={textos[indice] ?? ''}
                guia={espiadas.has(indice) ? linha.texto : null}
                realce={realce === indice}
                bloqueada={bloqueada}
                campo={(elemento) => {
                  campos.current[indice] = elemento;
                }}
                aoMudar={(texto) => {
                  setTextos((atuais) => atuais.map((atual, posicao) => (posicao === indice ? texto : atual)));
                  if (realce === indice) setRealce(null);
                }}
                aoTeclar={aoTeclar(indice)}
                aoFocar={() => setLinhaAtiva(indice)}
                aoColar={() =>
                  setFala({
                    humor: 'neutro',
                    selo: 'dica',
                    titulo: 'Sem copiar e colar',
                    texto: 'A vistoria é de memória: digitar cada fiada é o que mostra que o programa ficou com você.',
                  })
                }
              />
            ))}
          </PlantaDaObra>

          <div className={styles.acoes}>
            <Botao
              variante="secundario"
              icone={<Eye size={18} aria-hidden="true" />}
              desabilitado={bloqueada || espiadas.has(linhaAtiva)}
              aoClicar={espiar}
            >
              Espiar a fiada {linhaAtiva + 1}
            </Botao>
            {espiadas.size > 0 ? (
              <span className={styles.espiadas}>
                {espiadas.size} {espiadas.size === 1 ? 'fiada espiada' : 'fiadas espiadas'}
              </span>
            ) : null}
            <div className={styles.acaoPrincipal}>
              {fase === 'aprovada' ? (
                <Botao tamanho="grande" icone={<RotateCcw size={20} aria-hidden="true" />} aoClicar={recomecar}>
                  Refazer a vistoria
                </Botao>
              ) : (
                <Botao tamanho="grande" icone={<ClipboardCheck size={20} aria-hidden="true" />} carregando={fase === 'verificando'} aoClicar={() => void entregar()}>
                  Entregar a vistoria
                </Botao>
              )}
            </div>
          </div>

          <div className={styles.falas} aria-live="polite" ref={caixaDeFalas}>
            {fala ? <BalaoDoPinguim fala={fala} /> : null}
          </div>
        </div>

        <aside className={styles.lateral}>
          <ConsoleDaObra titulo="Saída esperada" execucoes={execucoes} estadoDoPython={estadoDoPython} programaVazio={false} />
          <p className={styles.nota}>
            É o que o programa da planta mostra. O seu precisa mostrar o mesmo, com as mesmas entradas.
            {temComentario ? ' Comentário não aparece na tela: ele está aqui em cinza, no ponto do programa e com a fiada dele.' : ''}
          </p>
        </aside>
      </main>

      {mostrarFim ? (
        <Modal
          titulo="Vistoria aprovada!"
          aoFechar={() => setMostrarFim(false)}
          rodape={
            <>
              <Botao variante="fantasma" icone={<RotateCcw size={18} aria-hidden="true" />} aoClicar={recomecar}>
                Refazer a vistoria
              </Botao>
              <Botao autofoco aoClicar={aoVoltar}>
                Voltar à cidade
              </Botao>
            </>
          }
        >
          <div className={styles.fim}>
            <div className={styles.gugloDoFim}>
              <GugloPixelado acao="comemorando" rotulo="Guglo comemora a vistoria aprovada" />
            </div>
            <div className={styles.fimTexto}>
              <p className={styles.selo}>{dePrimeira ? 'Vistoriada de primeira' : 'Vistoriada'}</p>
              <p>
                {obra.nome} passou na vistoria: você reescreveu {planta.length} fiadas de memória
                {espiadas.size > 0 ? `, espiando ${espiadas.size}` : ''}. O selo já aparece no mapa da cidade.
              </p>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
