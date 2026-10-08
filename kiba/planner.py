"""Planejamento de objetivos do cidadão."""
from .knowledge import facts
def plan(question,snapshot,user):
    q=str(question or "").lower()
    f=facts(snapshot)
    if not any(x in q for x in ("quero","preciso","como faço","como faco","devo","objetivo","meta","conseguir")):
        return None
    steps=[]
    if "rico" in q or "dinheiro" in q:
        jobs=sorted(f["jobs"],key=lambda x:float(x.get("salary") or 0),reverse=True)
        if jobs: steps.append("Compare sua profissão atual com as profissões de maior salário registradas.")
        steps.append("Priorize missões que aumentem XP e dinheiro.")
        steps.append("Evite compras desnecessárias enquanto sua meta financeira estiver ativa.")
        steps.append("Use o Banco para separar o dinheiro de curto prazo do valor que você quer guardar.")
    elif "xp" in q or "nivel" in q or "nível" in q:
        steps += ["Confira as missões compatíveis com sua profissão.","Complete atividades que concedam XP.","Acompanhe seu progresso até o próximo nível."]
    elif "empresa" in q or "negocio" in q:
        steps += ["Defina o tipo de negócio.","Confira os produtos e preços disponíveis.","Avalie o custo de criação e as despesas recorrentes antes de investir.","Depois acompanhe vendas e saldo da empresa."]
    else:
        steps += ["Defina o resultado que você quer alcançar.","Consulte os sistemas da cidade relacionados ao objetivo.","Compare as opções com seus recursos atuais.","Execute a opção de menor risco para sua meta e acompanhe o resultado."]
    return {"goal":question,"steps":steps,"basis":["estado atual da cidade","perfil atual do cidadão","sistemas relacionados"],"confidence":0.86}
