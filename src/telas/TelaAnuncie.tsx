// Anuncie aqui (ADR-0008): como marcas ajudam a financiar o Brick by Brick, e o que o projeto promete
// a quem estuda. Os espaços ainda não existem; a página os apresenta como "em breve".
import {
  ArrowLeft,
  BadgeCheck,
  CirclePause,
  Code,
  EyeOff,
  GraduationCap,
  Hammer,
  Hourglass,
  Mail,
  Map as Mapa,
  RefreshCw,
  ShieldCheck,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import { useRef } from 'react';
import logo from '../assets/logo.webp';
import gugloComPlaca from '../assets/guglo-anuncie.webp';
import { Botao } from '../components/Botao';
import { prefereMenosMovimento } from '../estado/usePython';
import styles from './TelaAnuncie.module.css';

export const CONTATO_DE_ANUNCIOS = 'amaatShin@proton.me';
const MAILTO = `mailto:${CONTATO_DE_ANUNCIOS}?subject=${encodeURIComponent('Quero anunciar no Brick by Brick')}`;

interface Item {
  icone: LucideIcon;
  titulo: string;
  texto: string;
}

const POLITICA: Item[] = [
  {
    icone: Code,
    titulo: 'Código aberto',
    texto: 'A estrutura do jogo é aberta (AGPL-3.0) e as aulas também (CC BY-SA 4.0): qualquer pessoa pode estudar, copiar e melhorar.',
  },
  {
    icone: RefreshCw,
    titulo: 'Sempre em obra',
    texto: 'O jogo recebe atualizações com o tempo: obras novas, modos novos e melhorias pedidas por quem joga.',
  },
  {
    icone: GraduationCap,
    titulo: 'Educação digital no Brasil',
    texto: 'O que os anúncios trazem ajuda a financiar o futuro da educação digital no país, começando por este projeto gratuito.',
  },
];

const ESPACOS: Item[] = [
  {
    icone: Mapa,
    titulo: 'Outdoor na cidade',
    texto: 'Uma placa dentro do mapa em pixel da Vila, à vista de todo mundo que passa pela cidade para escolher a próxima obra.',
  },
  {
    icone: Hammer,
    titulo: 'Patrocínio de obra',
    texto: '“Esta obra é oferecida por…” na placa da obra e no painel de obra concluída: sua marca ligada a uma aula inteira.',
  },
  {
    icone: Hourglass,
    titulo: 'Carregamento do Python',
    texto: 'Os segundos em que o Python carrega no navegador, na primeira visita. Uma espera que já existe, sem atrapalhar ninguém.',
  },
  {
    icone: Swords,
    titulo: 'Guglo Wars',
    texto: 'Na tela inicial e no fim de cada partida do modo de digitação. Nunca durante a queda das peças.',
  },
];

const COMPROMISSOS: Item[] = [
  {
    icone: EyeOff,
    titulo: 'Sem rastreamento',
    texto: 'Nada de rede de anúncios, cookie de terceiros ou script externo. O anúncio é uma imagem e um link servidos pelo próprio site.',
  },
  {
    icone: CirclePause,
    titulo: 'Nunca no meio do exercício',
    texto: 'Sem pop-up e sem anúncio na tela onde a pessoa monta o código. Anúncio só aparece em momentos de pausa.',
  },
  {
    icone: BadgeCheck,
    titulo: 'Sempre identificado',
    texto: 'Todo anúncio leva o selo “Patrocinado” e nunca se disfarça de conteúdo da aula.',
  },
  {
    icone: ShieldCheck,
    titulo: 'Curadoria',
    texto: 'Só marcas de tecnologia, educação e produtividade. Nada de apostas, álcool, cigarro ou conteúdo adulto.',
  },
];

function Cartoes({ itens, emBreve = false }: { itens: Item[]; emBreve?: boolean }) {
  return (
    <ul className={styles.cartoes}>
      {itens.map(({ icone: Icone, titulo, texto }) => (
        <li key={titulo} className={styles.cartao}>
          <div className={styles.cartaoTopo}>
            <span className={styles.icone}>
              <Icone size={22} aria-hidden="true" />
            </span>
            {emBreve ? <span className={styles.emBreve}>Em breve</span> : null}
          </div>
          <h3 className={styles.cartaoTitulo}>{titulo}</h3>
          <p>{texto}</p>
        </li>
      ))}
    </ul>
  );
}

export interface TelaAnuncieProps {
  aoIrParaInicio: () => void;
  aoIrParaCidade: () => void;
}

export function TelaAnuncie({ aoIrParaInicio, aoIrParaCidade }: TelaAnuncieProps) {
  const espacos = useRef<HTMLElement>(null);
  return (
    <div className={styles.tela}>
      <header className={styles.barra}>
        <button type="button" className={styles.logo} onClick={aoIrParaInicio} aria-label="Brick by Brick: voltar ao início">
          <img src={logo} alt="" width={90} height={67} />
        </button>
        <div className={styles.acoesDaBarra}>
          {/* No celular o logo já volta ao início, e o cabeçalho cabe numa linha. */}
          <span className={styles.voltar}>
            <Botao variante="fantasma" icone={<ArrowLeft size={18} aria-hidden="true" />} aoClicar={aoIrParaInicio}>
              Voltar ao início
            </Botao>
          </span>
          <Botao variante="secundario" aoClicar={aoIrParaCidade}>
            Ir para a cidade
          </Botao>
        </div>
      </header>

      <main className={styles.conteudo}>
        <section className={styles.abertura}>
          <div className={styles.aberturaTexto}>
            <p className={styles.sobretitulo}>Anuncie aqui</p>
            <h1 className={styles.titulo}>Sua marca na cidade de quem está aprendendo a programar</h1>
            <p className={styles.chamada}>
              O Brick by Brick é um jogo gratuito e de código aberto para aprender Python construindo uma cidade, tijolo por tijolo. Vamos
              abrir espaços para marcas, SaaS e web apps anunciarem dentro do jogo, e cada anúncio ajuda a financiar o futuro da educação
              digital no Brasil.
            </p>
            <div className={styles.acoes}>
              <Botao tamanho="grande" href={MAILTO} icone={<Mail size={20} aria-hidden="true" />}>
                Enviar e-mail
              </Botao>
              <Botao tamanho="grande" variante="secundario" aoClicar={() => espacos.current?.scrollIntoView({ behavior: prefereMenosMovimento() ? 'auto' : 'smooth' })}>
                Ver os espaços
              </Botao>
            </div>
            <p className={styles.contato}>
              Contato: <a href={MAILTO}>{CONTATO_DE_ANUNCIOS}</a>
            </p>
          </div>
          <div className={styles.guglo}>
            <img src={gugloComPlaca} alt="Guglo, o pinguim pedreiro, segurando uma placa escrita “anuncie aqui”" width={640} height={640} />
          </div>
        </section>

        <section className={styles.secao} aria-labelledby="titulo-politica">
          <h2 id="titulo-politica" className={styles.secaoTitulo}>
            Como o projeto se sustenta
          </h2>
          <Cartoes itens={POLITICA} />
        </section>

        <section ref={espacos} className={styles.secao} aria-labelledby="titulo-espacos">
          <h2 id="titulo-espacos" className={styles.secaoTitulo}>
            Espaços para anunciar
          </h2>
          <p className={styles.secaoTexto}>
            Os espaços abrem aos poucos, junto com as atualizações do jogo. Todas as opções são negociadas previamente: formato, período e
            valor combinados caso a caso.
          </p>
          <Cartoes itens={ESPACOS} emBreve />
        </section>

        <section className={styles.secao} aria-labelledby="titulo-compromissos">
          <h2 id="titulo-compromissos" className={styles.secaoTitulo}>
            Nossos compromissos com quem estuda
          </h2>
          <p className={styles.secaoTexto}>Valem para todo anúncio, de qualquer marca, em qualquer espaço.</p>
          <Cartoes itens={COMPROMISSOS} />
        </section>

        <section className={styles.secao} aria-labelledby="titulo-como">
          <h2 id="titulo-como" className={styles.secaoTitulo}>
            Como anunciar
          </h2>
          <ol className={styles.passos}>
            <li>Escreva para {CONTATO_DE_ANUNCIOS} contando sobre a sua marca e o espaço que interessa.</li>
            <li>Combinamos formato, período e valor.</li>
            <li>
              O anúncio entra no ar marcado como patrocinado. Como o código é aberto, a entrada dele fica registrada no repositório do
              projeto.
            </li>
          </ol>
        </section>

        <section className={styles.convite} aria-labelledby="titulo-convite">
          <h2 id="titulo-convite" className={styles.conviteTitulo}>
            Vamos construir juntos?
          </h2>
          <p>Conte o que a sua marca faz e onde ela quer aparecer. A resposta vem por e-mail.</p>
          <Botao tamanho="grande" href={MAILTO} icone={<Mail size={20} aria-hidden="true" />}>
            Enviar e-mail
          </Botao>
        </section>
      </main>
    </div>
  );
}
