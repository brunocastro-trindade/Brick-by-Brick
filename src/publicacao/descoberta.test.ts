import { describe, expect, it } from 'vitest';
import indice from '../../index.html?raw';
import { processarObra } from '../jogo/conteudo';
import { OBRAS } from '../jogo/obras';
import { apresentacaoEstatica, dadosEstruturados, DESCRICAO_DA_PAGINA, llmsTxt, REPOSITORIO, TITULO_DA_PAGINA } from './descoberta';

const URL = 'https://gugloeduca.site';

describe('descoberta (ADR-0023)', () => {
  it('a apresentação traz as obras dos dois mapas, os modos e as perguntas', () => {
    const html = apresentacaoEstatica(OBRAS);
    for (const obra of OBRAS) expect(html).toContain(`<strong>${obra.nome}</strong>`);
    expect(html).toContain(`<h1>${TITULO_DA_PAGINA}</h1>`);
    expect(html).toContain('Serra Verde: textos, tuplas, conjuntos, sorteios, erros e arquivos');
    expect(html).toContain('Leia o erro');
    expect(html).toContain('<dt>Preciso instalar o Python?</dt>');
    expect(html).toContain(`href="${REPOSITORIO}"`);
  });

  it('texto do conteúdo vira texto no HTML, nunca marcação', () => {
    const obra = { ...OBRAS[0]!, nome: '<img src=x onerror=alert(1)>', conceito: 'a & b' };
    const html = apresentacaoEstatica([obra]);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('a &amp; b');
  });

  it('o JSON-LD é válido, descreve curso gratuito com os conceitos e não fecha o bloco antes da hora', () => {
    const texto = dadosEstruturados(URL, OBRAS);
    const dados = JSON.parse(texto) as { '@graph': Array<Record<string, unknown>> };
    const tipos = dados['@graph'].map((item) => item['@type']);
    expect(tipos).toEqual(['WebSite', 'Course', 'WebApplication', 'FAQPage']);
    const curso = dados['@graph'][1]!;
    expect(curso.isAccessibleForFree).toBe(true);
    expect(curso.teaches).toEqual(expect.arrayContaining(['Variáveis', 'Tuplas', 'Arquivos']));
    expect(curso.url).toBe(`${URL}/`);

    const malicioso = dadosEstruturados(URL, [{ ...OBRAS[0]!, conceito: '</script><script>alert(1)</script>' }]);
    expect(malicioso).not.toContain('</script');
    expect(JSON.parse(malicioso)['@graph'][1].teaches).toEqual(['</script><script>alert(1)</script>']);
  });

  it('o llms.txt tem título, resumo, as 20 obras e os links', () => {
    const texto = llmsTxt(URL, OBRAS);
    expect(texto.startsWith('# Brick by Brick\n\n> ')).toBe(true);
    expect(texto).toContain(`- Site: ${URL}/`);
    expect(texto).toContain(`- Código-fonte: ${REPOSITORIO}`);
    for (const obra of OBRAS) expect(texto).toContain(`${obra.numero}. ${obra.nome} (`);
    expect(texto).toContain('### Serra Verde');
  });

  it('título e descrição do index.html são os mesmos da descoberta', () => {
    expect(indice).toContain(`<title>${TITULO_DA_PAGINA}</title>`);
    expect(indice).toContain(`<meta name="description" content="${DESCRICAO_DA_PAGINA}" />`);
    expect(indice).toContain('<div id="raiz"></div>');
  });

  it('obra nova entra sozinha: nada é escrito à mão (INV-02)', () => {
    const extra = processarObra(
      {
        id: 'nova',
        ordem: 99,
        mapa: 'serra-verde',
        nome: 'Obra Nova',
        conceito: 'Conceito novo',
        nivel: 'avancado',
        modelo: 'casa',
        aula: { titulo: 'Aula nova', texto: 'Texto', exemplo: 'print(1)' },
        desafios: [{ tipo: 'digitar', titulo: 'T', contexto: 'C', codigo: 'print(1)', explicacao: 'E' }],
      },
      'nova.yaml',
    );
    expect(llmsTxt(URL, [...OBRAS, extra])).toContain('Obra Nova');
    expect(apresentacaoEstatica([...OBRAS, extra])).toContain('Obra Nova');
  });
});
