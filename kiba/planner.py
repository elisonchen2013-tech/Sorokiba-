"""Planejador de objetivos do cidadão."""
from .knowledge import facts
def plan(question,snapshot,user):
    q=str(question or "").lower(); f=facts(snapshot)
    if not any(x in q for x in ("quero","preciso","como faço","como faco","devo","objetivo","meta","conseguir")): return None
    steps=[]
    if "rico" in q or "dinheiro" in q:
        jobs=sorted(f["jobs"],key=lambda x:float(x.get("salary") or 0),reverse=True)
        if jobs: steps.append("Compare sua profissão com as opções de maior salário cadastradas.")
        steps += ["Priorize missões que aumentem XP e dinheiro.","Evite gastos que não contribuam para sua meta.","Separe uma reserva no Banco e acompanhe seu patrimônio total."]
    elif "xp" in q or "nivel" in q or "nível" in q:
        steps=["Confira as missões compatíveis com sua profissão.","Complete atividades que concedam XP.","Acompanhe o progresso até o próximo nível."]
    elif "empresa" in q or "negocio" in q:
        steps=["Defina o tipo de negócio.","Confira produtos, preços e concorrência.","Avalie custo inicial e despesas recorrentes.","Acompanhe vendas e saldo da empresa."]
    else:
        steps=["Defina o resultado que você quer alcançar.","Consulte os sistemas da cidade relacionados ao objetivo.","Compare opções com seus recursos atuais.","Escolha a alternativa compatível com seus recursos e acompanhe o resultado."]
    return {"goal":question,"steps":steps,"basis":["estado atual da cidade","perfil do cidadão","sistemas relacionados"],"confidence":.86}
