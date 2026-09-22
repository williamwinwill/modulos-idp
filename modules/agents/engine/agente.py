"""Base de H3; Python 3.9+. Adaptadores reais são responsabilidade de H2/H4/H1."""
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Protocol
from uuid import uuid4
from zoneinfo import ZoneInfo

FUSO = ZoneInfo("America/Sao_Paulo")
VERSAO_APP = "0.1.0-base"
VERSAO_INSTRUCOES = "v1"


@dataclass(frozen=True)
class Solicitacao:
    id: str
    origem: str
    filtro: Dict[str, str]
    inicio: str
    corte: str

    @classmethod
    def criar(cls, origem, filtro, agora=None):
        if origem not in {"manual", "automatica"}:
            raise ValueError("Origem inválida")
        if filtro.get("tipo") not in {"todos", "sigla", "repositorio"}:
            raise ValueError("Filtro inválido")
        if filtro["tipo"] != "todos" and not filtro.get("valor", "").strip():
            raise ValueError("Filtro exige valor")
        agora = agora or datetime.now(FUSO)
        if agora.tzinfo is None:
            raise ValueError("O instante deve ter fuso horário")
        corte = agora.astimezone(FUSO)
        inicio = corte.replace(hour=0, minute=0, second=0, microsecond=0)
        return cls(str(uuid4()), origem, dict(filtro), inicio.isoformat(), corte.isoformat())


@dataclass
class Execucao:
    # Chave estável fornecida por H2: repositório + run_id + tentativa, se disponível.
    identidade: str
    repositorio: str
    status: str
    evidencias: Dict[str, str]  # id -> conteúdo; referência original fica em H2/S3.


@dataclass
class Coleta:
    execucoes: List[Execucao]
    completa: bool = True
    limitacoes: List[str] = field(default_factory=list)


class Coletor(Protocol):
    def coletar(self, solicitacao: Solicitacao) -> Coleta:
        """H2: API direta, escopo autorizado, paginação e evidências persistidas.

        Deve incluir todos os status e marcar coleta parcial; falha total lança erro.
        Validar o campo temporal e a inclusão das tentativas com a API corporativa.
        """
        ...


class Modelo(Protocol):
    def analisar(self, instrucoes: str, contexto_json: str) -> str:
        """Adaptador Bedrock: instruções separadas do contexto; retornar JSON textual."""
        ...


class Historico(Protocol):
    def salvar_estado(self, id: str, registro: Dict[str, Any]) -> None: ...
    def salvar_relatorio(self, id: str, relatorio: Dict[str, Any]) -> None: ...


def validar_saida(texto, execucao):
    saida = json.loads(texto)
    if not isinstance(saida, dict) or set(saida) != {"achados", "limitacoes"}:
        raise ValueError("Formato de saída inválido")
    if not isinstance(saida["limitacoes"], list) or not all(
        isinstance(x, str) and x.strip() for x in saida["limitacoes"]
    ):
        raise ValueError("Limitações inválidas")
    if not isinstance(saida["achados"], list):
        raise ValueError("Achados inválidos")
    chaves = {"execucao", "evidencia_id", "tipo", "explicacao", "recomendacao"}
    for achado in saida["achados"]:
        if not isinstance(achado, dict) or set(achado) != chaves:
            raise ValueError("Estrutura de achado inválida")
        if not all(isinstance(v, str) and v.strip() for v in achado.values()):
            raise ValueError("Campos do achado devem ser textos não vazios")
        if achado["execucao"] != execucao.identidade:
            raise ValueError("Execução não corresponde ao contexto")
        if achado["evidencia_id"] not in execucao.evidencias:
            raise ValueError("Referência de evidência inexistente")
        if achado["tipo"] not in {"observacao", "hipotese"}:
            raise ValueError("Tipo de achado inválido")
    if not saida["achados"] and not saida["limitacoes"]:
        raise ValueError("Saída vazia deve explicar a limitação")
    return saida


class AgenteAnaliseCICD:
    def __init__(self, coletor: Coletor, modelo: Modelo, historico: Historico):
        self.coletor, self.modelo, self.historico = coletor, modelo, historico
        self.instrucoes = Path(__file__).with_name("instrucoes-v1.txt").read_text()

    def executar(self, solicitacao: Solicitacao):
        registro = {**asdict(solicitacao), "versao_app": VERSAO_APP,
                    "versao_instrucoes": VERSAO_INSTRUCOES}
        etapa = "inicio"

        def estado(status):
            self.historico.salvar_estado(solicitacao.id, {
                **registro, "estado": status, "etapa": etapa,
                "atualizado_em": datetime.now(FUSO).isoformat()})

        try:
            etapa = "coleta"
            estado("processando")
            coleta = self.coletor.coletar(solicitacao)
            # Não duplica tentativas dentro da análise. H4/H6 deduplicam entre análises.
            execucoes = {e.identidade: e for e in coleta.execucoes}
            resultados, falhas = [], []
            for execucao in execucoes.values():
                try:
                    etapa = "contexto"
                    contexto = json.dumps({"intervalo": {
                        "inicio": solicitacao.inicio, "corte": solicitacao.corte},
                        "execucao": asdict(execucao)}, ensure_ascii=False)
                    etapa = "analise"
                    bruto = self.modelo.analisar(self.instrucoes, contexto)
                    etapa = "validacao"
                    resultado = validar_saida(bruto, execucao)
                    resultados.append({"execucao": execucao.identidade,
                        "provisoria": execucao.status != "completed", **resultado})
                except Exception as erro:
                    falhas.append({"execucao": execucao.identidade, "etapa": etapa,
                                   "erro_tipo": type(erro).__name__})
            limitacoes = list(coleta.limitacoes)
            if not coleta.completa:
                limitacoes.append("Coleta parcial: o total conhecido pode estar incompleto.")
            if any(e.status != "completed" for e in execucoes.values()):
                limitacoes.append("Há execuções em andamento; resultados são provisórios.")
            status = "parcial" if falhas or not coleta.completa else "concluida"
            relatorio = {**registro, "estado": status, "coleta_completa": coleta.completa,
                "encontradas": len(execucoes), "analisadas": len(resultados),
                "pendentes": len(falhas), "resultados": resultados,
                "falhas": falhas, "limitacoes": limitacoes}
            etapa = "persistencia_relatorio"
            self.historico.salvar_relatorio(solicitacao.id, relatorio)
            etapa = "finalizacao"
            estado(status)
            return relatorio
        except Exception as erro:
            registro["erro_tipo"] = type(erro).__name__
            # Se o armazenamento estiver indisponível, a falha propaga ao worker.
            estado("falha")
            raise


class HistoricoLocal:
    """Somente demonstração. H4 implementará persistência e consulta no S3."""
    def __init__(self, pasta):
        self.pasta = Path(pasta)

    def _salvar(self, id, nome, dado):
        pasta = self.pasta / id
        pasta.mkdir(parents=True, exist_ok=True)
        (pasta / nome).write_text(json.dumps(dado, ensure_ascii=False, indent=2))

    def salvar_estado(self, id, registro):
        self._salvar(id, "estado.json", registro)

    def salvar_relatorio(self, id, relatorio):
        self._salvar(id, "relatorio.json", relatorio)


if __name__ == "__main__":
    class ColetorDemo:
        def coletar(self, solicitacao):
            return Coleta([Execucao("SRO-agenda:123:1", "SRO-agenda", "completed",
                                   {"job-build-step-2": "Exemplo fictício: build falhou."})])

    class ModeloDemo:
        def analisar(self, instrucoes, contexto_json):
            return json.dumps({"achados": [], "limitacoes": [
                "Demonstração sem Bedrock: faltam logs detalhados para recomendar mudanças."]})

    agente = AgenteAnaliseCICD(ColetorDemo(), ModeloDemo(), HistoricoLocal("saida-demo"))
    print(json.dumps(agente.executar(Solicitacao.criar("manual", {"tipo": "todos"})),
                     ensure_ascii=False, indent=2))
