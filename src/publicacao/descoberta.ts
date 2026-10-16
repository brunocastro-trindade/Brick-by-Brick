// Como o projeto é achado (ADR-0023): a apresentação em HTML dentro do #raiz (para quem não roda JavaScript: robôs de
// IA e parte dos buscadores), os dados estruturados em JSON-LD e o /llms.txt. Tudo sai das obras em YAML (INV-02),
// no build; aqui fica só a regra, testável.
import { DADOS_DOS_MAPAS, obrasDoMapa } from '../jogo/mapas';
import { MAPAS, type MapaId, type Obra } from '../jogo/tipos';

export const TITULO_DA_PAGINA = 'Brick by Brick: aprenda Python grátis, do zero, construindo uma cidade';
export const DESCRICAO_DA_PAGINA =
  'Jogo gratuito para aprender Python do zero, em português: cada prédio é uma aula, do print() aos arquivos. ' +
  'O Python roda de verdade no navegador, sem instalar nada e sem cadastro.';

export const REPOSITORIO = 'https://github.com/brunocastro-trindade/Brick-by-Brick';

const RESUMO_DO_MAPA: Record<MapaId, string> = {
  vila: 'do print() às classes',
  'serra-verde': 'textos, tuplas, conjuntos, sorteios, erros e arquivos',
};

interface Modo {
  nome: string;
  texto: string;
}

const MODOS: Modo[] = [
  { nome: 'Obras', texto: 'Encaixe tijolos de código, empilhe linhas com o recuo certo ou digite à mão; o Guglo explica cada erro.' },
  { nome: 'Vistoria', texto: 'Reescreva de memória o programa de uma obra pronta, linha por linha.' },
  { nome: 'Guglo Wars', texto: 'Digite as linhas das suas obras antes de a peça chegar ao fundo do poço.' },
  { nome: 'Qual é a saída?', texto: 'Leia o código e preveja o que ele mostra na tela.' },
  { nome: 'Leia o erro', texto: 'Veja o erro real do Python num programa estragado e escolha a correção.' },
];

interface Pergunta {
  pergunta: string;
  resposta: string;
}

const PERGUNTAS: Pergunta[] = [
  { pergunta: 'O Brick by Brick é grátis?', resposta: 'Sim. O jogo é gratuito, sem cadastro e de código aberto.' },
  {
    pergunta: 'Preciso instalar o Python?',
    resposta: 'Não. O Python 3.14 roda de verdade no navegador (Pyodide), e o código que você escreve fica só no seu aparelho.',
  },
  { pergunta: 'Para quem é?', resposta: 'Para quem nunca programou: a primeira obra começa no print(), e cada aula explica o conceito antes do desafio.' },
  {
    pergunta: 'Funciona no celular e sem internet?',
    resposta: 'Sim. O jogo se adapta ao celular, pode ser instalado como app e, depois da primeira visita, abre sem internet.',
  },
  { pergunta: 'Onde fica o meu progresso?', resposta: 'No próprio navegador. Dá para baixar o progresso num arquivo e levar para outro aparelho.' },
  {
    pergunta: 'É de código aberto?',
    resposta: 'Sim. O jogo é AGPL-3.0 e as aulas são CC BY-SA 4.0: qualquer pessoa pode estudar, copiar e melhorar.',
  },
];

/** Texto do YAML é confiável (está no repositório), mas vira HTML: escapa do mesmo jeito. */
function escaparHtml(texto: string): string {
  return texto.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function mapasComObras(obras: readonly Obra[]) {
  return MAPAS.map((mapa) => ({ mapa, dados: DADOS_DOS_MAPAS[mapa], obras: obrasDoMapa(obras, mapa) })).filter((item) => item.obras.length > 0);
}

/** Conceitos de todas as obras, na ordem: o que o curso ensina. */
function conceitos(obras: readonly Obra[]): string[] {
  return [...new Set(obras.map((obra) => obra.conceito))];
}

/** A apresentação dentro do #raiz: o React a troca pelo jogo ao montar. */
export function apresentacaoEstatica(obras: readonly Obra[]): string {
  const h = escaparHtml;
  const mapas = mapasComObras(obras)
    .map(
      ({ mapa, dados, obras: doMapa }) => `
      <h3>${h(dados.nome)}: ${h(RESUMO_DO_MAPA[mapa])}</h3>
      <ol>${doMapa.map((obra) => `<li><strong>${h(obra.nome)}</strong>: ${h(obra.conceito)}. ${h(obra.aula.titulo)}.</li>`).join('')}</ol>`,
    )
    .join('');
  const modos = MODOS.map((modo) => `<li><strong>${h(modo.nome)}</strong>: ${h(modo.texto)}</li>`).join('');
  const perguntas = PERGUNTAS.map((item) => `<dt>${h(item.pergunta)}</dt><dd>${h(item.resposta)}</dd>`).join('');
  return `
    <main class="apresentacao">
      <h1>${h(TITULO_DA_PAGINA)}</h1>
      <p>${h(DESCRICAO_DA_PAGINA)}</p>
      <p class="apresentacao-carregando">Carregando o jogo…</p>
      <h2>O que você aprende</h2>
      <p>${obras.length} obras em ${mapasComObras(obras).length} mapas, do básico ao avançado. Cada obra é uma aula com mini desafios.</p>${mapas}
      <h2>Modos de jogo</h2>
      <ul>${modos}</ul>
      <h2>Perguntas frequentes</h2>
      <dl>${perguntas}</dl>
      <p>Código aberto no <a href="${REPOSITORIO}">GitHub</a>.</p>
    </main>
  `;
}

/** JSON-LD do site, do curso, do app e das perguntas. `<` vira <: nada fecha o bloco antes da hora. */
export function dadosEstruturados(url: string, obras: readonly Obra[]): string {
  const raiz = `${url}/`;
  const grafo = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${raiz}#site`,
        url: raiz,
        name: 'Brick by Brick',
        description: DESCRICAO_DA_PAGINA,
        inLanguage: 'pt-BR',
      },
      {
        '@type': 'Course',
        '@id': `${raiz}#curso`,
        name: 'Python do zero com o Brick by Brick',
        description: `Curso gratuito de Python em forma de jogo: ${obras.length} aulas práticas, ${mapasComObras(obras)
          .map(({ dados, mapa }) => `${dados.nome} (${RESUMO_DO_MAPA[mapa]})`)
          .join(' e ')}.`,
        url: raiz,
        inLanguage: 'pt-BR',
        isAccessibleForFree: true,
        educationalLevel: 'Iniciante',
        teaches: conceitos(obras),
        provider: { '@type': 'Organization', name: 'Brick by Brick', url: raiz, sameAs: [REPOSITORIO] },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL', category: 'Free' },
        hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online' },
        license: 'https://creativecommons.org/licenses/by-sa/4.0/',
      },
      {
        '@type': 'WebApplication',
        '@id': `${raiz}#app`,
        name: 'Brick by Brick',
        url: raiz,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Navegador',
        inLanguage: 'pt-BR',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
        license: 'https://www.gnu.org/licenses/agpl-3.0.html',
      },
      {
        '@type': 'FAQPage',
        '@id': `${raiz}#perguntas`,
        mainEntity: PERGUNTAS.map((item) => ({
          '@type': 'Question',
          name: item.pergunta,
          acceptedAnswer: { '@type': 'Answer', text: item.resposta },
        })),
      },
    ],
  };
  return JSON.stringify(grafo).replaceAll('<', '\\u003c');
}

/** /llms.txt (llmstxt.org): resumo em Markdown para modelos de linguagem e buscadores de IA. */
export function llmsTxt(url: string, obras: readonly Obra[]): string {
  const raiz = `${url}/`;
  const mapas = mapasComObras(obras)
    .map(({ mapa, dados, obras: doMapa }) => {
      const linhas = doMapa.map((obra) => `${obra.numero}. ${obra.nome} (${dados.bairros[obra.nivel]}): ${obra.conceito}. ${obra.aula.titulo}.`);
      return `### ${dados.nome}: ${RESUMO_DO_MAPA[mapa]}\n\n${linhas.join('\n')}`;
    })
    .join('\n\n');
  return `# Brick by Brick

> ${DESCRICAO_DA_PAGINA}

Brick by Brick é um jogo educacional em português do Brasil para aprender a programar em Python. O jogador constrói uma cidade em pixel art: cada prédio (obra) é uma aula, e cada mini desafio entrega tijolos de código para montar o programa da obra. O código roda em Python 3.14 de verdade, dentro do navegador (Pyodide, num Web Worker); nada é enviado a servidor. O mascote é o Guglo, um pinguim pedreiro.

- Site: ${raiz}
- Código-fonte: ${REPOSITORIO}
- Idioma: português do Brasil
- Preço: gratuito, sem cadastro e sem anúncio no meio do exercício
- Licenças: código AGPL-3.0; aulas CC BY-SA 4.0
- Público: quem nunca programou, do print() até classes, exceções e arquivos

## Currículo

${obras.length} obras em ${mapasComObras(obras).length} mapas. O segundo mapa abre quando o primeiro termina.

${mapas}

## Modos de jogo

${MODOS.map((modo) => `- ${modo.nome}: ${modo.texto}`).join('\n')}

## Como funciona

- Três mecânicas nos desafios: montar (encaixar tijolos nas vagas), empilhar (ordenar linhas com o recuo certo) e digitar.
- A resposta é validada pela planta e pelo comportamento: um programa diferente que faz a mesma coisa também passa.
- As mensagens de erro do Python aparecem no original, em inglês, com a explicação em português ao lado.
- O progresso fica no navegador; dá para exportar num arquivo. Depois da primeira visita, o jogo abre sem internet.

## Perguntas frequentes

${PERGUNTAS.map((item) => `- ${item.pergunta} ${item.resposta}`).join('\n')}
`;
}
