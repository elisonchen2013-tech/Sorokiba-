"""Raciocínio determinístico e explicações relacionando sistemas da cidade."""
from .knowledge import facts
def money(v):
    return "R$ {:,.2f}".format(float(v or 0)).replace(",","X").replace(".",",").replace("X",".")
def job_for(snapshot,user):
    jobs=facts(snapshot)["jobs"]
    jid=str((user or {}).get("jobId") or "")
    return next((j for j in jobs if str(j.get("id"))==jid), next((j for j in jobs if str(j.get("name","")).lower()==str((user or {}).get("jobName","")).lower()), None))
def calculate_wealth(user):
    return float((user or {}).get("money") or 0)+float((user or {}).get("bankBalance") or 0)
def explain_job(snapshot,user):
    j=job_for(snapshot,user)
    if not j: return "Sua profissão atual não está associada a um registro do catálogo enviado pela cidade."
    return f"A profissão {j.get('name')} combina uma exigência de {j.get('xpRequired',0)} XP com salário de {money(j.get('salary',0))}. A tarefa registrada é: {j.get('task') or 'não especificada'}."
def cross_system(question,snapshot,user):
    q=str(question).lower()
    f=facts(snapshot)
    if ("rico" in q or "dinheiro" in q or "ganhar" in q) and ("como" in q or "devo" in q):
        jobs=sorted(f["jobs"],key=lambda x:float(x.get("salary") or 0),reverse=True)
        top=jobs[:3]
        return "Para aumentar seu dinheiro, o caminho depende de profissão, missões e compras. Entre os salários cadastrados, os maiores são: " + ", ".join(f"{j.get('name')} ({money(j.get('salary'))})" for j in top) + ". Eu também consideraria suas missões disponíveis e evitaria compras que reduzam seu saldo sem benefício para seu objetivo."
    if "profissao" in q and ("xp" in q or "desbloque" in q):
        return explain_job(snapshot,user)
    if "economia" in q and ("por que" in q or "como" in q):
        c=f["city"]; return f"A economia da cidade é um indicador agregado do estado atual. Ela não deve ser interpretada isoladamente: infraestrutura, população, empresas e atividade dos cidadãos também ajudam a explicar o cenário. Agora o indicador econômico está em {money(c.get('economy'))}."
    return None
