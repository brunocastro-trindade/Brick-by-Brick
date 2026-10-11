// Tela de abertura: logo, mascote e o convite para construir.
import { BookOpen, Hammer, Megaphone } from 'lucide-react';
import { useState } from 'react';
import { Botao } from '../components/Botao';
import { ChipDoPython } from '../components/ChipDoPython';
import { ModalComoJogar } from '../components/ModalComoJogar';
import logo from '../assets/logo.webp';
import mascote from '../assets/mascote.webp';
import styles from './TelaInicial.module.css';

export function TelaInicial({ temProgresso, aoComecar }: { temProgresso: boolean; aoComecar: () => void }) {
  const [comoJogar, setComoJogar] = useState(false);
  return (
    <div className={styles.tela}>
      <main className={styles.palco}>
        <div className={styles.texto}>
          <h1 className={styles.titulo}>
            <img className={styles.logo} src={logo} alt="Brick by Brick" width={900} height={668} />
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
          <img src={mascote} alt="Guglo, o pinguim pedreiro, assentando um tijolo num muro" width={560} height={560} />
        </div>
      </main>
      <footer className={styles.rodape}>
        <ChipDoPython />
        <span>Do básico às classes · Código aberto (AGPL-3.0)</span>
        <a className={styles.anuncie} href="#/anuncie">
          <Megaphone size={16} aria-hidden="true" />
          Anuncie aqui
        </a>
      </footer>
      <div className={styles.muro} aria-hidden="true" />
      {comoJogar ? <ModalComoJogar aoFechar={() => setComoJogar(false)} /> : null}
    </div>
  );
}
