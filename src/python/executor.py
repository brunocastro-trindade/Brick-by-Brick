"""Executor do Brick by Brick.

Roda o programa do jogador com entradas simuladas, limite de passos (contra laço infinito)
e captura da saída. O mesmo arquivo é usado pelo Web Worker do jogo e pelos testes (ADR-0002).
"""

import builtins
import inspect
import io
import json
import re
import sys
import traceback
import types

MARCA_ENTRADA_INICIO = "\x02"
MARCA_ENTRADA_FIM = "\x03"
ARQUIVO_PROGRAMA = "obra.py"
ARQUIVO_VERIFICACAO = "verificacao.py"
NOMES_IGNORADOS = {"__name__", "__builtins__", "input"}
ENDERECO_DE_MEMORIA = re.compile(r" at 0x[0-9a-fA-F]+")


class LimiteDePassos(Exception):
    """O programa passou do limite de passos: provavelmente um laço infinito."""


def _assinatura(funcao):
    try:
        return f"{funcao.__name__}{inspect.signature(funcao)}"
    except (TypeError, ValueError):
        return f"{funcao.__name__}(...)"


def _resumir(valor, profundidade=0):
    """repr curto e estável, para comparar o estado final de dois programas."""
    if isinstance(valor, types.FunctionType):
        return f"<função {_assinatura(valor)}>"
    if isinstance(valor, type):
        metodos = ", ".join(_assinatura(item) for item in vars(valor).values() if isinstance(item, types.FunctionType))
        return f"<classe {valor.__name__}: {metodos}>" if metodos else f"<classe {valor.__name__}>"
    if isinstance(valor, (set, frozenset)):
        return "{" + ", ".join(sorted(repr(item) for item in valor)) + "}"
    if profundidade < 2 and not isinstance(valor, types.ModuleType) and hasattr(valor, "__dict__"):
        atributos = ", ".join(f"{nome}={_resumir(item, profundidade + 1)}" for nome, item in vars(valor).items())
        return f"<{type(valor).__name__} {atributos}>"
    try:
        return ENDERECO_DE_MEMORIA.sub("", repr(valor))
    except Exception:  # um __repr__ escrito pelo jogador pode quebrar
        return f"<{type(valor).__name__}>"


def _variaveis(escopo):
    return {
        nome: _resumir(valor)
        for nome, valor in escopo.items()
        if nome not in NOMES_IGNORADOS and not nome.startswith("__") and not isinstance(valor, types.ModuleType)
    }


def _mensagem(erro):
    """Última linha da mensagem oficial, com sugestões como "Did you mean: 'nome'?".

    A sugestão de NameError precisa do traceback (é dele que saem os nomes existentes),
    por isso from_exception, e não format_exception_only.
    """
    linhas = list(traceback.TracebackException.from_exception(erro).format_exception_only())
    ultima = linhas[-1].strip() if linhas else type(erro).__name__
    prefixo = f"{type(erro).__name__}: "
    return ultima[len(prefixo):] if ultima.startswith(prefixo) else ultima


def _descrever_erro(erro, fase, arquivo):
    if isinstance(erro, LimiteDePassos):
        return {"tipo": "LimiteDePassos", "mensagem": "o programa passou do limite de passos", "linha": None, "fase": fase}
    if isinstance(erro, SyntaxError):
        linha = erro.lineno if erro.filename == arquivo else None
        return {"tipo": type(erro).__name__, "mensagem": erro.msg, "linha": linha, "fase": fase}
    linha = None
    for quadro in traceback.extract_tb(erro.__traceback__):
        if quadro.filename == arquivo:
            linha = quadro.lineno
    return {"tipo": type(erro).__name__, "mensagem": _mensagem(erro), "linha": linha, "fase": fase}


def _rodar(fonte, arquivo, escopo, saida, rastrear):
    """Executa `fonte` no escopo e devolve a exceção levantada, ou None."""
    stdout_original = sys.stdout
    sys.stdout = saida
    try:
        compilado = compile(fonte, arquivo, "exec")
        sys.settrace(rastrear)
        try:
            exec(compilado, escopo)
        finally:
            sys.settrace(None)
    except BaseException as erro:  # o programa do jogador pode lançar qualquer coisa, até SystemExit
        return erro
    finally:
        sys.stdout = stdout_original
    return None


def executar(codigo, verificacao="", entradas=(), limite_passos=200_000):
    saida = io.StringIO()
    fila = [str(valor) for valor in entradas]
    passos = 0

    def entrada_simulada(pergunta=""):
        saida.write(str(pergunta))
        if not fila:
            raise EOFError("o programa pediu mais entradas do que o teste fornece")
        valor = fila.pop(0)
        saida.write(f"{MARCA_ENTRADA_INICIO}{valor}{MARCA_ENTRADA_FIM}\n")
        return valor

    def rastrear(quadro, evento, argumento):
        nonlocal passos
        if evento == "line":
            passos += 1
            if passos > limite_passos:
                raise LimiteDePassos()
        return rastrear

    escopo = {"__name__": "__main__", "__builtins__": builtins, "input": entrada_simulada}
    erro = _rodar(codigo, ARQUIVO_PROGRAMA, escopo, saida, rastrear)
    resultado = {
        "saida": saida.getvalue(),
        "saidaVerificacao": "",
        "erro": _descrever_erro(erro, "programa", ARQUIVO_PROGRAMA) if erro else None,
        "variaveis": _variaveis(escopo),
    }
    if erro is None and verificacao:
        saida_verificacao = io.StringIO()
        erro = _rodar(verificacao, ARQUIVO_VERIFICACAO, escopo, saida_verificacao, rastrear)
        resultado["saidaVerificacao"] = saida_verificacao.getvalue()
        if erro:
            resultado["erro"] = _descrever_erro(erro, "verificacao", ARQUIVO_VERIFICACAO)
    return json.dumps(resultado, ensure_ascii=False)
