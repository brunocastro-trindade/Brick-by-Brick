// Tela de erro inesperado (ADR-0012): no lugar da tela branca, o Guglo avisa que o progresso continua salvo,
// e dá para recarregar ou contar o que houve.
import { MessageSquareText, RotateCw } from 'lucide-react';
import { Component, type ReactNode } from 'react';
import retrato from '../assets/mascote-retrato.webp';
import { anotarErro } from '../estado/registroDeErros';
import { enderecoDeRetornoAgora } from '../estado/retorno';
import { Botao } from './Botao';
import styles from './LimiteDeErro.module.css';

export class LimiteDeErro extends Component<{ children: ReactNode }, { quebrou: boolean }> {
  state = { quebrou: false };

  static getDerivedStateFromError() {
    return { quebrou: true };
  }

  componentDidCatch(erro: unknown) {
    anotarErro(erro);
  }

  render() {
    if (!this.state.quebrou) return this.props.children;
    return (
      <main className={styles.tela}>
        <img className={styles.retrato} src={retrato} alt="" width={192} height={192} />
        <h1 className={styles.titulo}>O canteiro parou</h1>
        <p className={styles.texto}>O jogo encontrou um erro que não esperava. Seu progresso continua salvo neste navegador.</p>
        <div className={styles.acoes}>
          <Botao tamanho="grande" icone={<RotateCw size={20} aria-hidden="true" />} aoClicar={() => window.location.reload()}>
            Recarregar o jogo
          </Botao>
          {/* No clique, e não no render: o erro só é anotado depois que esta tela aparece. */}
          <Botao
            tamanho="grande"
            variante="secundario"
            icone={<MessageSquareText size={20} aria-hidden="true" />}
            aoClicar={() => window.location.assign(enderecoDeRetornoAgora())}
          >
            Contar o que houve
          </Botao>
        </div>
      </main>
    );
  }
}
