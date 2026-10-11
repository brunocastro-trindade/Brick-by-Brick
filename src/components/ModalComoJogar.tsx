// Como jogar, em quatro passos ilustrados pelo Guglo e uma tabela de atalhos.
import gugloComPlanta from '../assets/tutorial-1-planta.webp';
import gugloComTijolo from '../assets/tutorial-2-tijolo.webp';
import gugloComLinha from '../assets/tutorial-3-linha.webp';
import gugloDeJoinha from '../assets/tutorial-4-joinha.webp';
import { Botao } from './Botao';
import { Modal } from './Modal';
import styles from './ModalComoJogar.module.css';

const PASSOS: Array<{ titulo: string; texto: string; imagem: string; descricao: string }> = [
  {
    titulo: 'Escolha uma obra',
    texto: 'Cada prédio da cidade é uma aula de Python. Comece pelo Correio: as próximas abrem quando a anterior fica pronta.',
    imagem: gugloComPlanta,
    descricao: 'Guglo mostrando a planta de uma casa',
  },
  {
    titulo: 'Encaixe os tijolos',
    texto: 'Cada mini desafio dá tijolos de código. Toque ou arraste para encaixar na linha; em blocos, ajuste o recuo com ← e →.',
    imagem: gugloComTijolo,
    descricao: 'Guglo encaixando um tijolo no muro',
  },
  {
    titulo: 'Assente a linha',
    texto: 'O Python roda seu código de verdade, aqui no navegador. Se encaixou, a fiada sobe no prédio.',
    imagem: gugloComLinha,
    descricao: 'Guglo sorrindo com a linha de pedreiro esticada sobre a fiada',
  },
  {
    titulo: 'Erre sem medo',
    texto: 'O Guglo explica o porquê de cada tijolo. Acertar de primeira dá combo e estrelas; pedir dica não conta como erro.',
    imagem: gugloDeJoinha,
    descricao: 'Guglo piscando e fazendo joinha ao lado de um tijolo torto',
  },
];

const ATALHOS: Array<[string, string]> = [
  ['1 – 9', 'encaixa o tijolo da palete com esse número'],
  ['⌫', 'devolve o último tijolo encaixado'],
  ['← →', 'muda a vaga, ou o recuo da linha num bloco'],
  ['↑ ↓', 'muda a linha selecionada num bloco'],
  ['Enter', 'assenta a linha, ou segue para o próximo tijolo'],
];

export function ModalComoJogar({ aoFechar }: { aoFechar: () => void }) {
  return (
    <Modal titulo="Como jogar" aoFechar={aoFechar} largura="larga" rodape={<Botao aoClicar={aoFechar} autofoco>Entendi, vamos construir</Botao>}>
      <ol className={styles.passos}>
        {PASSOS.map((passo, indice) => (
          <li key={passo.titulo} className={styles.passo}>
            <img className={styles.ilustracao} src={passo.imagem} alt={passo.descricao} width={320} height={320} />
            <h3 className={styles.titulo}>
              <span className={styles.numero}>{indice + 1}</span>
              {passo.titulo}
            </h3>
            <p className={styles.texto}>{passo.texto}</p>
          </li>
        ))}
      </ol>
      <h3 className={styles.subtitulo}>Atalhos de teclado</h3>
      <dl className={styles.atalhos}>
        {ATALHOS.map(([tecla, acao]) => (
          <div key={tecla}>
            <dt>
              <kbd>{tecla}</kbd>
            </dt>
            <dd>{acao}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
