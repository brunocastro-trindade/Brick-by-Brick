// Tela de abertura: logo, mascote e o convite para construir.
import { BookOpen, Hammer, Megaphone, MessageSquareText } from 'lucide-react';
import { useState } from 'react';
import { Botao } from '../components/Botao';
import { ChipDoPython } from '../components/ChipDoPython';
import { ModalComoJogar } from '../components/ModalComoJogar';
import { linkDeRetorno } from '../estado/retorno';
import { Logo } from '../components/Logo';
import mascote from '../assets/mascote.webp';
import styles from './TelaInicial.module.css';

export function TelaInicial({ temProgresso, aoComecar }: { temProgresso: boolean; aoComecar: () => void }) {
  const [comoJogar, setComoJogar] = useState(false);
  return (
    <div className={styles.tela}>
      <main className={styles.palco}>
        <div className={styles.texto}>
          <h1 className={styles.titulo}>
            <span className={styles.logo}>
              <Logo tamanho="grande" alt="Brick by Brick" />
            </span>
          </h1>
          <p className={styles.chamada}>
            Aprenda Python construindo uma cidade, <strong>tijolo por tijolo</strong>.
          </p>
          <p className={styles.descricao}>
            Cada prédio é uma aula. Cada mini desafio dá tijolos de código: encaixe certo e o Guglo, o pinguim pedreiro, assenta mais uma
            fiada. O Python roda de verdade, aqui no navegador.
          </p>
          <div className={styles.acoes}>
            <Botao tamanho="grande" icone={<Hammer size={22} aria-hidden="true" />} aoClicar={aoComecar}>
              {temProgresso ? 'Continuar construindo' : 'Começar a construir'}
            </Botao>
            <Botao tamanho="grande" variante="secundario" icone={<BookOpen size={22} aria-hidden="true" />} aoClicar={() => setComoJogar(true)}>
              Como jogar
            </Botao>
          </div>
        </div>
        <div className={styles.mascote}>
          <img src={mascote} alt="Guglo, o pinguim pedreiro de capacete, assentando tijolos diante de uma cidade em obras" width={800} height={800} />
        </div>
      </main>
      <footer className={styles.rodape}>
        <ChipDoPython />
        <span>Do básico às classes · Código aberto (AGPL-3.0)</span>
        <a className={styles.anuncie} href="#/anuncie">
          <Megaphone size={16} aria-hidden="true" />
          Anuncie aqui
        </a>
        <a className={styles.retorno} {...linkDeRetorno()}>
          <MessageSquareText size={16} aria-hidden="true" />
          Mande seu feedback
        </a>
      </footer>
      <div className={styles.muro} aria-hidden="true" />
      {comoJogar ? <ModalComoJogar aoFechar={() => setComoJogar(false)} /> : null}
    </div>
  );
}
