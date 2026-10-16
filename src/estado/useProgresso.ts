import { useCallback, useEffect, useState } from 'react';
import { CHAVE_DO_PROGRESSO, carregarProgresso, salvarProgresso, type Armazenamento, type Progresso } from '../jogo/progresso';

/** localStorage pode não existir ou lançar (modo privado, site bloqueado): o jogo segue sem salvar. */
function armazenamentoDoNavegador(): Armazenamento | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function useProgresso(): readonly [Progresso, (mudar: (atual: Progresso) => Progresso) => void] {
  const [progresso, setProgresso] = useState(() => carregarProgresso(armazenamentoDoNavegador()));

  useEffect(() => {
    salvarProgresso(progresso, armazenamentoDoNavegador());
  }, [progresso]);

  // Jogo aberto em duas abas (ou no app instalado e numa aba): quando a outra grava, esta passa a valer o que ela
  // gravou. Sem isso, a primeira mudança aqui gravaria por cima com a cópia velha e apagaria o que foi feito lá.
  useEffect(() => {
    const aoMudarEmOutraAba = (evento: StorageEvent) => {
      if (evento.key !== CHAVE_DO_PROGRESSO || evento.newValue === null) return;
      setProgresso(carregarProgresso(armazenamentoDoNavegador()));
    };
    window.addEventListener('storage', aoMudarEmOutraAba);
    return () => window.removeEventListener('storage', aoMudarEmOutraAba);
  }, []);

  const atualizar = useCallback((mudar: (atual: Progresso) => Progresso) => setProgresso(mudar), []);
  return [progresso, atualizar] as const;
}
