// Sons sintetizados com Web Audio: nenhum arquivo de áudio, nenhuma licença a gerenciar.
// Só tocam em resposta a uma ação de quem joga.

let contexto: AudioContext | null = null;
let ligado = true;

export function definirSom(valor: boolean): void {
  ligado = valor;
}

function obterContexto(): AudioContext | null {
  if (!ligado || typeof window === 'undefined' || !('AudioContext' in window)) return null;
  try {
    contexto ??= new AudioContext();
    if (contexto.state === 'suspended') void contexto.resume();
    return contexto;
  } catch {
    return null;
  }
}

interface Nota {
  frequencia: number;
  frequenciaFinal?: number;
  duracao: number;
  forma?: OscillatorType;
  volume?: number;
  atraso?: number;
}

function tocarNota(audio: AudioContext, nota: Nota): void {
  const inicio = audio.currentTime + (nota.atraso ?? 0);
  const oscilador = audio.createOscillator();
  const ganho = audio.createGain();
  oscilador.type = nota.forma ?? 'triangle';
  oscilador.frequency.setValueAtTime(nota.frequencia, inicio);
  if (nota.frequenciaFinal) oscilador.frequency.exponentialRampToValueAtTime(nota.frequenciaFinal, inicio + nota.duracao);
  ganho.gain.setValueAtTime(0.0001, inicio);
  ganho.gain.exponentialRampToValueAtTime(nota.volume ?? 0.15, inicio + 0.008);
  ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + nota.duracao);
  oscilador.connect(ganho).connect(audio.destination);
  oscilador.start(inicio);
  oscilador.stop(inicio + nota.duracao + 0.02);
}

function tocarRuido(audio: AudioContext, duracao: number, volume: number, atraso = 0): void {
  const amostras = Math.floor(audio.sampleRate * duracao);
  const buffer = audio.createBuffer(1, amostras, audio.sampleRate);
  const canal = buffer.getChannelData(0);
  for (let i = 0; i < amostras; i += 1) canal[i] = (Math.random() * 2 - 1) * (1 - i / amostras);
  const fonte = audio.createBufferSource();
  const filtro = audio.createBiquadFilter();
  const ganho = audio.createGain();
  filtro.type = 'bandpass';
  filtro.frequency.value = 1400;
  ganho.gain.value = volume;
  fonte.buffer = buffer;
  fonte.connect(filtro).connect(ganho).connect(audio.destination);
  fonte.start(audio.currentTime + atraso);
}

function tocar(compor: (audio: AudioContext) => void): void {
  const audio = obterContexto();
  if (audio) compor(audio);
}

export const sons = {
  encaixe: () =>
    tocar((audio) => {
      tocarNota(audio, { frequencia: 190, frequenciaFinal: 70, duracao: 0.1, volume: 0.22 });
      tocarRuido(audio, 0.035, 0.06);
    }),
  devolver: () => tocar((audio) => tocarNota(audio, { frequencia: 440, frequenciaFinal: 300, duracao: 0.07, forma: 'sine', volume: 0.1 })),
  linha: () =>
    tocar((audio) => {
      [523, 659, 784, 1047].forEach((frequencia, indice) =>
        tocarNota(audio, { frequencia, duracao: 0.14, volume: 0.12, atraso: indice * 0.07 }),
      );
      tocarNota(audio, { frequencia: 120, frequenciaFinal: 50, duracao: 0.18, volume: 0.25, atraso: 0.32 });
      tocarRuido(audio, 0.06, 0.08, 0.32);
    }),
  erro: () =>
    tocar((audio) => {
      tocarNota(audio, { frequencia: 233, frequenciaFinal: 196, duracao: 0.12, forma: 'square', volume: 0.05 });
      tocarNota(audio, { frequencia: 175, duracao: 0.18, forma: 'square', volume: 0.05, atraso: 0.11 });
    }),
  dica: () => tocar((audio) => tocarNota(audio, { frequencia: 880, frequenciaFinal: 1320, duracao: 0.16, forma: 'sine', volume: 0.08 })),
  obra: () =>
    tocar((audio) => {
      const melodia: Array<[number, number]> = [
        [523, 0],
        [659, 0.12],
        [784, 0.24],
        [1047, 0.36],
        [784, 0.54],
        [1047, 0.66],
      ];
      for (const [frequencia, atraso] of melodia) tocarNota(audio, { frequencia, duracao: 0.22, volume: 0.13, atraso });
    }),
  clique: () => tocar((audio) => tocarNota(audio, { frequencia: 1000, duracao: 0.03, forma: 'sine', volume: 0.04 })),
};
