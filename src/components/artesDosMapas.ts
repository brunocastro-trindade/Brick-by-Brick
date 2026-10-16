// A arte de cada mapa e as medidas tiradas dela (ADR-0006, ADR-0021). As coordenadas estão nos pixels da própria
// imagem: arte nova pede medir de novo terrenos, selos, paradas e a estrada.
import type { MapaId } from '../jogo/tipos';
import arteDaVila from '../assets/mapa-da-cidade.webp';
import arteDaSerra from '../assets/mapa-serra-verde.webp';

export interface Lugar {
  /** Terreno na arte: canto superior esquerdo e tamanho. Também é a área de toque. */
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** Selo com o número, por cima do número impresso na arte. */
  selo: [number, number];
  /** Onde o Guglo para, na estrada em frente ao terreno. */
  parada: [number, number];
}

export interface ArteDoMapa {
  imagem: string;
  largura: number;
  altura: number;
  /** Linha central da estrada, do começo do mapa até o fim. */
  estrada: string;
  /** Terrenos na ordem da estrada: o primeiro é a obra 1 do mapa. */
  lugares: Lugar[];
  /** Onde fica a placa do fim do mapa: o caminho para o mapa seguinte, ou "em breve". */
  placaDoFim: [number, number];
  /** Outdoor do "Anuncie aqui" (ADR-0008); pés em (x, y). Só na Vila. */
  outdoor: { x: number; y: number; lado: number } | null;
  /** Onde o Guglo aparece ao abrir o mapa, no começo da estrada. */
  inicioDoGuglo: [number, number];
}

/**
 * Vila: Vila do Alicerce (1–4), Centro (5–7, da direita para a esquerda) e Alto da Colina (8–10). A arte não tem o
 * 5: o terreno marcado "6" é a obra 5 e as lojas são a 6.
 */
const VILA: ArteDoMapa = {
  imagem: arteDaVila,
  largura: 1619,
  altura: 971,
  estrada:
    'M150 752 C164 758 205 780 235 788 C265 796 302 796 330 797 C358 798 388 797 400 797 H1370 ' +
    'C1380 797 1410 799 1430 797 C1450 795 1471 795 1488 786 C1505 777 1523 760 1532 744 ' +
    'C1541 728 1542 708 1540 690 C1538 672 1529 649 1519 634 C1509 619 1495 608 1480 598 ' +
    'C1465 588 1448 580 1430 576 C1412 572 1380 574 1370 573 H400 ' +
    'C388 572 352 572 330 570 C308 568 290 567 270 558 C250 549 226 533 208 517 ' +
    'C190 501 174 480 165 460 C156 440 153 420 157 400 C161 380 174 355 190 343 ' +
    'C206 331 227 328 250 328 C273 328 305 340 330 345 C355 350 388 357 400 359 H1520',
  lugares: [
    { x: 560, y: 640, largura: 165, altura: 120, selo: [587, 746], parada: [642, 797] },
    { x: 770, y: 605, largura: 185, altura: 155, selo: [790, 735], parada: [862, 797] },
    { x: 1010, y: 620, largura: 195, altura: 140, selo: [1033, 741], parada: [1107, 797] },
    { x: 1265, y: 600, largura: 200, altura: 155, selo: [1292, 743], parada: [1368, 797] },
    { x: 1180, y: 390, largura: 150, altura: 140, selo: [1203, 515], parada: [1255, 573] },
    { x: 845, y: 372, largura: 205, altura: 156, selo: [866, 512], parada: [948, 573] },
    { x: 270, y: 395, largura: 185, altura: 135, selo: [299, 516], parada: [362, 572] },
    { x: 340, y: 185, largura: 210, altura: 137, selo: [360, 308], parada: [445, 360] },
    { x: 605, y: 195, largura: 210, altura: 135, selo: [627, 312], parada: [710, 359] },
    { x: 910, y: 150, largura: 225, altura: 175, selo: [944, 314], parada: [1022, 359] },
  ],
  // A casa no fim do Alto da Colina guarda o caminho para a Serra Verde.
  placaDoFim: [1365, 330],
  outdoor: { x: 1205, y: 330, lado: 116 },
  inicioDoGuglo: [150, 752],
};

/**
 * Serra Verde: Vale das Araucárias (1–5, na faixa de baixo), Lago Central (6–7, da direita para a esquerda) e Alto da
 * Serra (8–10). A arte repete o 3 e não tem o 5: o segundo "3" é a obra 4 e o "4" é a 5; os selos cobrem os números.
 */
const SERRA_VERDE: ArteDoMapa = {
  imagem: arteDaSerra,
  largura: 1672,
  altura: 941,
  estrada:
    'M320 787 H1430 C1472 787 1490 762 1491 722 L1490 640 C1488 600 1466 575 1430 573 H330 ' +
    'C285 573 252 560 234 532 C216 504 206 472 200 440 C195 408 206 376 238 364 C256 358 272 358 292 358 H1400',
  lugares: [
    { x: 295, y: 600, largura: 190, altura: 150, selo: [310, 740], parada: [390, 787] },
    { x: 560, y: 595, largura: 200, altura: 160, selo: [574, 731], parada: [660, 787] },
    { x: 790, y: 640, largura: 195, altura: 115, selo: [810, 732], parada: [888, 787] },
    { x: 1005, y: 625, largura: 195, altura: 130, selo: [1030, 736], parada: [1103, 787] },
    { x: 1245, y: 590, largura: 195, altura: 165, selo: [1267, 736], parada: [1342, 787] },
    { x: 1180, y: 410, largura: 225, altura: 120, selo: [1198, 513], parada: [1292, 573] },
    { x: 300, y: 410, largura: 190, altura: 120, selo: [315, 509], parada: [395, 573] },
    { x: 335, y: 175, largura: 245, altura: 150, selo: [363, 308], parada: [458, 358] },
    { x: 620, y: 200, largura: 225, altura: 125, selo: [644, 306], parada: [732, 358] },
    { x: 925, y: 200, largura: 270, altura: 125, selo: [946, 307], parada: [1060, 358] },
  ],
  // O coreto no alto da serra guarda o lugar do próximo mapa.
  placaDoFim: [1258, 112],
  outdoor: null,
  inicioDoGuglo: [320, 787],
};

export const ARTES_DOS_MAPAS: Record<MapaId, ArteDoMapa> = { vila: VILA, 'serra-verde': SERRA_VERDE };
