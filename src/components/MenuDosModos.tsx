// "Modos de jogo" no cabeçalho da cidade: um botão que abre a lista dos modos (Guglo Wars, "Qual é a saída?", "Leia o erro").
// Padrão de divulgação: o botão diz se a lista está aberta; Esc e clique fora fecham, e o foco volta ao botão.
import { Bug, ChevronDown, Gamepad2, SquareTerminal, Swords } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import styles from './MenuDosModos.module.css';

export interface MenuDosModosProps {
  aoAbrirGugloWars: () => void;
  aoAbrirQualSaida: () => void;
  aoAbrirLeiaOErro: () => void;
}

export function MenuDosModos({ aoAbrirGugloWars, aoAbrirQualSaida, aoAbrirLeiaOErro }: MenuDosModosProps) {
  const [aberto, setAberto] = useState(false);
  const idDaLista = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      setAberto(false);
      botao.current?.focus();
    };
    const aoClicarFora = (evento: PointerEvent) => {
      if (!caixa.current?.contains(evento.target as Node)) setAberto(false);
    };
    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('pointerdown', aoClicarFora);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('pointerdown', aoClicarFora);
    };
  }, [aberto]);

  const escolher = (abrir: () => void) => {
    setAberto(false);
    abrir();
  };

  const modos = [
    { nome: 'Guglo Wars', frase: 'Digite o código antes de a peça cair.', Icone: Swords, abrir: aoAbrirGugloWars },
    { nome: 'Qual é a saída?', frase: 'Leia o código e preveja o que aparece na tela.', Icone: SquareTerminal, abrir: aoAbrirQualSaida },
    { nome: 'Leia o erro', frase: 'Leia o erro do Python e escolha a correção.', Icone: Bug, abrir: aoAbrirLeiaOErro },
  ];

  return (
    <div className={styles.menu} ref={caixa}>
      <button
        ref={botao}
        type="button"
        className={styles.botao}
        aria-expanded={aberto}
        aria-controls={idDaLista}
        onClick={() => setAberto((atual) => !atual)}
      >
        <Gamepad2 size={18} aria-hidden="true" className={styles.controle} />
        Modos de jogo
        <ChevronDown size={18} aria-hidden="true" className={styles.seta} />
      </button>
      <ul id={idDaLista} className={styles.lista} hidden={!aberto}>
        {modos.map(({ nome, frase, Icone, abrir }) => (
          <li key={nome}>
            <button type="button" className={styles.modo} onClick={() => escolher(abrir)}>
              <Icone size={20} aria-hidden="true" className={styles.icone} />
              <span className={styles.textos}>
                <span className={styles.nome}>{nome}</span>
                <span className={styles.frase}>{frase}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
