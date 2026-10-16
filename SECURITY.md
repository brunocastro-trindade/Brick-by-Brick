# Segurança

Obrigado por ajudar a manter o Brick by Brick seguro para quem estuda.

## Como relatar uma falha

Não abra uma issue pública. Use um destes canais privados:

- **GitHub:** [relatar uma vulnerabilidade](https://github.com/brunocastro-trindade/Brick-by-Brick/security/advisories/new), em *Security → Report a vulnerability*.
- **E-mail:** [amaatShin@proton.me](mailto:amaatShin@proton.me?subject=Seguran%C3%A7a%20no%20Brick%20by%20Brick), com "Segurança" no assunto.

Conte o que encontrou, os passos para reproduzir, o impacto que você enxerga e, se tiver, uma sugestão de correção. O projeto é mantido por uma pessoa: a resposta vem assim que possível, e você fica sabendo quando a correção entrar no ar.

## Versões cobertas

Só a versão no ar em [gugloeduca.site](https://gugloeduca.site/), que é a branch `main` deste repositório.

## O que está no escopo

- O site e o que ele envia ao navegador: código, cabeçalhos, política de segurança de conteúdo e service worker.
- Qualquer forma de um conteúdo vindo de fora (um arquivo de progresso importado, um link) executar código, ler dados
  ou fazer requisições que o jogo não faria.
- Vazamento de dados de quem joga para fora do navegador dela.
- Segredo ou dado pessoal publicado por engano neste repositório.

## O que não é vulnerabilidade

- **Rodar Python no próprio navegador.** É o jogo: o código que a pessoa escreve roda no Pyodide, num Web Worker, só no
  aparelho dela, sem acesso à rede de fora nem ao progresso salvo.
- Alterar o próprio progresso (no armazenamento do navegador ou num arquivo) ou "passar" num desafio mexendo no
  próprio navegador: não há ranking nem servidor, e ninguém mais é afetado.
- Ataques que exigem acesso físico ao aparelho, engenharia social ou um navegador já comprometido.
- Negação de serviço, testes de carga e relatórios automáticos de scanners sem prova de impacto.

## Testes de boa-fé

Pesquisa feita de boa-fé, dentro deste escopo, sem acessar dados de outras pessoas e sem prejudicar o site, é bem-vinda
e não será tratada como ataque.
