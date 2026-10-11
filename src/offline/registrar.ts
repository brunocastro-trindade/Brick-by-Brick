// Registro do service worker (ADR-0010). Só no build, e só depois do Python pronto: na primeira visita o
// download do jogo vem antes, e a cópia para o cache sai do cache HTTP em vez de baixar tudo de novo.
import { pythonDoJogo } from '../python/executor';

function registrar(): void {
  // Sem service worker (navegador antigo, modo privado restrito) o jogo segue pela rede, como antes.
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {});
}

export function guardarJogoNoAparelho(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  if (pythonDoJogo.pronto()) return registrar();
  const parar = pythonDoJogo.aoMudarEstado((estado) => {
    if (estado !== 'pronto') return;
    parar();
    registrar();
  });
}
