"""Orquestrador central do Kiba."""
import time
from .language import intent, resolve_context, normalize
from .memory import recent_context, relevant_memories
from .knowledge import explain, facts
from .reasoning import cross_system, calculate_wealth, explain_job
from .planner import plan
from .recommendations import recommend
from .verifier import verify
from .plugins import run as plugin_run

class KibaCore:
    def answer(self, request):
        started=time.perf_counter()
        question=str(request.get("question") or "").strip()
        user=request.get("user") or {}
        snapshot=request.get("snapshot") or {}
        conversation=recent_context(request.get("conversation") or [])
        resolved=resolve_context(question,conversation)
        parsed=intent(resolved)
        topic=parsed["topic"]
        memories=relevant_memories(resolved,snapshot.get("memory") or [],normalize)
        plugin=plugin_run(topic,snapshot,user)
        evidence=[]
        answer=None
        confidence=parsed["confidence"]

        if parsed["name"]=="greeting":
            answer="Olá! Eu sou o Kiba, a inteligência da cidade. Posso consultar os sistemas atuais de Sorokiba, cruzar informações e explicar como eles se relacionam."
            confidence=.99
        elif parsed["name"]=="about_kiba":
            answer="Eu sou o Kiba, uma inteligência própria de Sorokiba. Meu conhecimento vem dos dados que a cidade me entrega em tempo real, da memória autorizada da conversa e dos módulos internos de cidade, economia, profissões, missões, empresas, Hospital, Lojas, notícias e eventos. Quando uma informação não está confirmada, eu sinalizo isso em vez de inventar."
            confidence=.99
        elif parsed["name"]=="self_xp":
            answer=f"Seu cidadão está no nível {user.get('level',1)} com {user.get('xp',0)} XP."
            evidence=["Perfil atual do cidadão"]; confidence=1
        elif parsed["name"]=="self_money":
            answer=f"Seu dinheiro disponível é R$ {float(user.get('money') or 0):,.2f}, e seu saldo bancário é R$ {float(user.get('bankBalance') or 0):,.2f}."
            evidence=["Perfil atual do cidadão"]; confidence=1
        elif parsed["name"]=="self_job":
            answer=explain_job(snapshot,user); evidence=["Perfil","Catálogo de profissões"]; confidence=.98
        elif parsed["name"]=="self_inventory":
            inv=user.get("inventory") or {}
            positive={k:v for k,v in inv.items() if float(v or 0)>0}
            answer="Seu inventário possui "+str(len(positive))+" tipos de item com quantidade positiva."
            evidence=["Inventário atual"]; confidence=.98
        else:
            answer=cross_system(resolved,snapshot,user)
            if answer: evidence=["Dados atuais","Raciocínio entre sistemas"]; confidence=.91
            if not answer and parsed["kind"]=="recommendation":
                answer=recommend(resolved,snapshot,user)
                if answer: evidence=["Dados atuais","Motor de recomendações"]; confidence=.88
            if not answer and parsed["kind"]=="explanation":
                answer=explain(topic,snapshot)
                if answer: evidence=["Conhecimento estruturado","Estado atual da cidade"]; confidence=.92
            if not answer and parsed["kind"]=="count_or_lookup":
                data=plugin.get("records")
                if isinstance(data,list):
                    answer=f"Encontrei {len(data)} registros em {topic}."
                elif isinstance(data,dict):
                    answer=f"Consultei o módulo {topic} e encontrei os dados atuais registrados pela cidade."
                else:
                    answer="Consultei os dados atuais, mas não encontrei um registro suficiente para responder com precisão."
                evidence=[f"Módulo {topic}"]; confidence=.84
            if not answer:
                answer=explain(topic,snapshot)
                if answer: evidence=["Conhecimento estruturado"]; confidence=.82
            if not answer:
                answer="Não encontrei uma informação confirmada suficiente para responder essa pergunta. Posso continuar usando os dados oficiais que Sorokiba enviar ao Kiba, sem inventar uma resposta."
                confidence=.38

        p=plan(resolved,snapshot,user)
        if p and parsed["kind"]=="recommendation" and not answer.startswith("Não encontrei"):
            answer += "\n\nPlano sugerido:\n" + "\n".join(f"{i+1}. {x}" for i,x in enumerate(p["steps"]))
            evidence.append("Planejador de objetivos")
            confidence=max(confidence,p["confidence"])
        checked=verify(answer,evidence,confidence)
        sources=[{"name":x,"detail":"evidência interna do Kiba"} for x in evidence]
        if memories:
            sources.append({"name":"Memória contextual","detail":f"{len(memories)} memória(s) relevante(s)"})
        elapsed=round((time.perf_counter()-started)*1000)
        return {
            "answer":checked["answer"],
            "intent":parsed["name"],
            "confidence":checked["confidence"],
            "questionKind":parsed["kind"],
            "topic":topic,
            "domains":[topic],
            "sources":sources,
            "searched":sources,
            "contextUsed":bool(memories or resolved!=question),
            "memoryMatches":memories[:3],
            "evidence":evidence,
            "verification":checked["status"],
            "elapsedMs":elapsed,
            "plan":p,
            "plugin":{"domain":plugin.get("domain"),"recordCount":len(plugin.get("records") or []) if isinstance(plugin.get("records"),list) else None},
        }
