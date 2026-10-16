// Vídeo do jogo (ADR-0020): toca sozinho com o som do jogo; se o navegador barrar o áudio, toca mudo e oferece
// "Ligar o som". Com movimento reduzido, nada toca sozinho: o pôster aparece e a pessoa aperta o play.
import { Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { prefereMenosMovimento } from '../estado/usePython';
import abertura from '../assets/videos/inicio.mp4';
import posterDaAbertura from '../assets/videos/inicio-poster.webp';
import cidadePronta from '../assets/videos/final.mp4';
import posterDaCidadePronta from '../assets/videos/final-poster.webp';
import type { VideoDoJogo } from '../jogo/progresso';
import { Botao } from './Botao';
import styles from './VideoDoGuglo.module.css';

const VIDEOS: Record<VideoDoJogo, { src: string; poster: string; rotulo: string }> = {
  abertura: { src: abertura, poster: posterDaAbertura, rotulo: 'Vídeo: o Guglo ergue a primeira casa da cidade' },
  'cidade-pronta': { src: cidadePronta, poster: posterDaCidadePronta, rotulo: 'Vídeo: o Guglo acena da cidade em obras' },
};

export interface VideoDoGugloProps {
  video: VideoDoJogo;
  /** O botão de som do jogo: desligado, o vídeo começa mudo. */
  somLigado: boolean;
  aoTerminar?: () => void;
}

export function VideoDoGuglo({ video, somLigado, aoTerminar }: VideoDoGugloProps) {
  const { src, poster, rotulo } = VIDEOS[video];
  const elemento = useRef<HTMLVideoElement>(null);
  const [barrouOSom, setBarrouOSom] = useState(false);

  useEffect(() => {
    const atual = elemento.current;
    if (!atual || prefereMenosMovimento()) return;
    atual.muted = !somLigado;
    atual.play().catch(() => {
      // Sem um toque na página antes, o navegador não deixa tocar com áudio: toca mudo.
      if (!somLigado) return;
      atual.muted = true;
      setBarrouOSom(true);
      atual.play().catch(() => undefined);
    });
    // Só na montagem: depois disso, quem manda no som é o controle do próprio vídeo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ligarOSom = () => {
    const atual = elemento.current;
    if (!atual) return;
    atual.muted = false;
    setBarrouOSom(false);
  };

  return (
    <div className={styles.video}>
      <video ref={elemento} className={styles.tela} src={src} poster={poster} controls playsInline preload="auto" aria-label={rotulo} onEnded={aoTerminar} />
      {barrouOSom ? (
        <div className={styles.som}>
          <Botao variante="secundario" icone={<Volume2 size={18} aria-hidden="true" />} aoClicar={ligarOSom}>
            Ligar o som
          </Botao>
        </div>
      ) : null}
    </div>
  );
}
