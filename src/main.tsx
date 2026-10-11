import '@fontsource-variable/rubik';
import '@fontsource-variable/jetbrains-mono';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LimiteDeErro } from './components/LimiteDeErro';
import { anotarErro, ouvirErrosDoNavegador } from './estado/registroDeErros';
import { guardarJogoNoAparelho } from './offline/registrar';
import { pythonDoJogo } from './python/executor';

// Erros que escapam ficam anotados para o retorno do beta (ADR-0012).
ouvirErrosDoNavegador();
pythonDoJogo.aoMudarEstado((estado) => {
  if (estado === 'falhou') anotarErro(`O Python não carregou: ${pythonDoJogo.motivoDaFalha() ?? 'sem motivo'}`);
});

// O Pyodide começa a carregar já na tela inicial: quando a pessoa chegar à primeira obra, ele está pronto.
pythonDoJogo.iniciar();
// Com o Python pronto, o jogo inteiro é guardado no aparelho para a próxima visita e para jogar sem internet.
guardarJogoNoAparelho();

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz não encontrado em index.html');

createRoot(raiz).render(
  <StrictMode>
    <LimiteDeErro>
      <App />
    </LimiteDeErro>
  </StrictMode>,
);
