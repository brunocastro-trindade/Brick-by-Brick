import { describe, expect, it } from 'vitest';
import { analisarLinhaMontar, ErroDeConteudo, linhasDoBloco, processarCidade, processarObra } from './conteudo';
import { OBRAS } from './obras';
import { abreBloco, fecharBlocoAberto, linhasAntesDoPasso, textoDoPrograma } from './programa';

const obraMinima = {
  id: 'teste',
  ordem: 1,
  nome: 'Teste',
  conceito: 'print',
  nivel: 'basico',
  modelo: 'casa',
  aula: { titulo: 'Aula', texto: 'Texto', exemplo: 'print(1)\n' },
  desafios: [
    {
      tipo: 'montar',
      titulo: 'Olá',
      contexto: 'Diga olá.',
      linha: '`print``(``"Olá"``)`',
      extras: [{ texto: 'Print', porque: 'Maiúscula.' }],
      explicacao: 'Assim.',
    },
  ],
};

describe('analisarLinhaMontar', () => {
  it('separa trechos fixos e vagas', () => {
    expect(analisarLinhaMontar('nome = `input(`"Oi")', 'x')).toEqual({
      partes: [
        { tipo: 'fixo', texto: 'nome = ' },
        { tipo: 'vaga', indice: 0 },
        { tipo: 'fixo', texto: '"Oi")' },
      ],
      resposta: ['input('],
    });
  });

  it('aceita vagas coladas', () => {
    expect(analisarLinhaMontar('`a``b`', 'x').resposta).toEqual(['a', 'b']);
  });

  it('recusa crase sem par, vaga vazia e linha sem vaga', () => {
    expect(() => analisarLinhaMontar('print(`"a")', 'x')).toThrow(ErroDeConteudo);
    expect(() => analisarLinhaMontar('a = ` `', 'x')).toThrow(/vaga/);
    expect(() => analisarLinhaMontar('a = 1', 'x')).toThrow(/ao menos uma vaga/);
  });
});

describe('linhasDoBloco', () => {
  it('lê recuo de 4 em 4 espaços e soma o recuo base', () => {
    expect(linhasDoBloco('if x:\n    y = 1\n', 1, 'x')).toEqual([
      { recuo: 1, texto: 'if x:' },
      { recuo: 2, texto: 'y = 1' },
    ]);
  });

  it('aceita lista começando recuada', () => {
    expect(linhasDoBloco(['    a()', 'else:'], 0, 'x')).toEqual([
      { recuo: 1, texto: 'a()' },
      { recuo: 0, texto: 'else:' },
    ]);
  });

  it('recusa recuo torto, tab e linha em branco', () => {
    expect(() => linhasDoBloco('  a = 1', 0, 'x')).toThrow(/múltiplo de 4/);
    expect(() => linhasDoBloco('\ta = 1', 0, 'x')).toThrow(/tab/);
    expect(() => linhasDoBloco('a\n\nb', 0, 'x')).toThrow(/em branco/);
  });
});

describe('processarObra', () => {
  it('monta tijolos, linha canônica e total de linhas', () => {
    const obra = processarObra(obraMinima, 'teste.yaml');
    const desafio = obra.desafios[0];
    expect(desafio?.tipo).toBe('montar');
    if (desafio?.tipo !== 'montar') return;
    expect(desafio.linhas).toEqual([{ recuo: 0, texto: 'print("Olá")' }]);
    expect(desafio.tijolos.map((tijolo) => tijolo.texto)).toEqual(['print', '(', '"Olá"', ')', 'Print']);
    expect(desafio.tijolos.at(-1)?.classificacao).toBe('problema');
    expect(obra.totalLinhas).toBe(1);
    expect(obra.entradas).toEqual([[]]);
  });

  it('aponta o caminho do erro de autoria', () => {
    const quebrada = { ...obraMinima, desafios: [{ ...obraMinima.desafios[0], explicacao: undefined }] };
    expect(() => processarObra(quebrada, 'teste.yaml')).toThrow('teste.yaml › desafio 1 › explicacao');
  });

  it('não deixa um extra repetir um tijolo da resposta', () => {
    const repetida = {
      ...obraMinima,
      desafios: [{ ...obraMinima.desafios[0], extras: [{ texto: 'print', porque: 'x' }] }],
    };
    expect(() => processarObra(repetida, 'teste.yaml')).toThrow(/já é um tijolo da resposta/);
  });
});

describe('programa', () => {
  it('fecha bloco aberto com pass provisório, ignorando comentário', () => {
    expect(abreBloco({ recuo: 0, texto: 'if x:  # pergunta' })).toBe(true);
    expect(abreBloco({ recuo: 0, texto: '# Quem enviou o cartão:' })).toBe(false);
    expect(fecharBlocoAberto([{ recuo: 1, texto: 'for i in x:' }])).toEqual([
      { recuo: 1, texto: 'for i in x:' },
      { recuo: 2, texto: 'pass' },
    ]);
  });
});

describe('obras da cidade', () => {
  it('carrega as vinte obras em ordem, sem erro de autoria: dez da Vila e dez da Serra Verde (ADR-0021)', () => {
    expect(OBRAS.map((obra) => obra.ordem)).toEqual(Array.from({ length: 20 }, (_, indice) => indice + 1));
    expect(OBRAS.map((obra) => obra.mapa)).toEqual([...Array<string>(10).fill('vila'), ...Array<string>(10).fill('serra-verde')]);
  });

  it('mapa desconhecido, ou fora da ordem dos mapas, é erro de autoria (ADR-0021)', () => {
    expect(() => processarCidade([{ origem: 'x.yaml', dados: { ...obraMinima, mapa: 'lua' } }])).toThrow(/mapa/);
    expect(() =>
      processarCidade([
        { origem: 'a.yaml', dados: { ...obraMinima, id: 'a', ordem: 1, mapa: 'serra-verde' } },
        { origem: 'b.yaml', dados: { ...obraMinima, id: 'b', ordem: 2 } },
      ]),
    ).toThrow(/ajuste a ordem/);
  });

  it('todo desafio tem dica, e todo tijolo extra tem porquê', () => {
    for (const obra of OBRAS) {
      for (const desafio of obra.desafios) {
        expect(desafio.dica, desafio.id).toBeTruthy();
        if (desafio.tipo === 'digitar') continue;
        for (const tijolo of desafio.tijolos.filter((t) => t.classificacao)) expect(tijolo.porque, tijolo.id).toBeTruthy();
      }
    }
  });

  it('o programa completo é a soma do alicerce com as linhas de cada desafio', () => {
    for (const obra of OBRAS) {
      const linhas = linhasAntesDoPasso(obra, obra.desafios.length);
      expect(linhas).toHaveLength(obra.totalLinhas);
      expect(textoDoPrograma(linhas)).not.toMatch(/`/);
    }
  });
});
