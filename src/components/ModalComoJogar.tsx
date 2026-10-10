// Como jogar, em quatro passos e uma tabela de atalhos.
import { Botao } from './Botao';
import { Modal } from './Modal';
import { Pinguim, type PoseDoPinguim } from './Pinguim';
import styles from './ModalComoJogar.module.css';

const PASSOS: Array<{ titulo: string; texto: string; pose: PoseDoPinguim }> = [
  { titulo: 'Escolha uma obra', texto: 'Cada prédio da cidade é uma aula de Python. Comece pelo Correio: as próximas abrem quando a anterior fica pronta.', pose: 'andando' },
  { titulo: 'Encaixe os tijolos', texto: 'Cada mini desafio dá tijolos de código. Toque ou arraste para encaixar na linha; em blocos, ajuste o recuo com ← e →.', pose: 'carregando' },
  { titulo: 'Assente a linha', texto: 'O Python roda seu código de verdade, aqui no navegador. Se encaixou, a fiada sobe no prédio.', pose: 'comemorando' },
  { titulo: 'Erre sem medo', texto: 'O Guglo explica o porquê de cada tijolo. Acertar de primeira dá combo e estrelas; pedir dica não conta como erro.', pose: 'pensando' },
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
            <div className={styles.ilustracao}>
              <Pinguim pose={passo.pose} capacete={indice > 0} />
            </div>
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
