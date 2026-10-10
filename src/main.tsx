import '@fontsource-variable/rubik';
import '@fontsource-variable/jetbrains-mono';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { pythonDoJogo } from './python/executor';

// O Pyodide começa a carregar já na tela inicial: quando a pessoa chegar à primeira obra, ele está pronto.
pythonDoJogo.iniciar();

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz não encontrado em index.html');

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
