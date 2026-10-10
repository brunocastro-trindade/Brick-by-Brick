import { useCallback, useEffect, useState } from 'react';
import { carregarProgresso, salvarProgresso, type Armazenamento, type Progresso } from '../jogo/progresso';

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

  const atualizar = useCallback((mudar: (atual: Progresso) => Progresso) => setProgresso(mudar), []);
  return [progresso, atualizar] as const;
}
