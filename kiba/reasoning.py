"""Raciocínio determinístico e relações entre sistemas."""
from .knowledge import facts

def money(v):
    return "R$ {:,.2f}".format(float(v or 0)).replace(",","X").replace(".",",").replace("X",".")

def job_for(snapshot,user):
    jobs=facts(snapshot)["jobs"]; jid=str((user or {}).get("jobId") or "")
    return next((j for j in jobs if str(j.get("id"))==jid),next((j for j in jobs if str(j.get("name","")).lower()==str((user or {}).get("jobName","")).lower()),None))

def calculate_wealth(user):
    return float((user or {}).get("money") or 0)+float((user or {}).get("bankBalance") or 0)

def explain_job(snapshot,user):
    j=job_for(snapshot,user)
    if not j:return "Sua profissão atual não está associada a um registro do catálogo enviado pela cidade."
    return f"A profissão {j.get('name')} combina exigência de {j.get('xpRequired',0)} XP com salário de {money(j.get('salary',0))}. Tarefa registrada: {j.get('task') or 'não especificada'}."

def compare_jobs(snapshot,user):
    jobs=facts(snapshot)["jobs"]
    current=job_for(snapshot,user)
    ordered=sorted(jobs,key=lambda x:float(x.get("salary") or 0),reverse=True)
    return {"current":current,"top":ordered[:5]}

def city_health(snapshot):
    f=facts(snapshot); c=f
    score=(float(c["quality"])*.45+float(c["infrastructure"])*.35+min(100,float(c["population"]))/100*.20)
    return {"score":round(score,1),"quality":c["quality"],"infrastructure":c["infrastructure"]}

def cross_system(question,snapshot,user):
    q=str(question).lower(); f=facts(snapshot)
    if ("rico" in q or "dinheiro" in q or "ganhar" in q) and ("como" in q or "devo" in q):
        jobs=sorted(f["jobs"],key=lambda x:float(x.get("salary") or 0),reverse=True)[:3]
        if jobs:return "Para aumentar seu dinheiro, eu cruzaria profissão, missões e gastos. Os maiores salários cadastrados agora são: "+"; ".join(f"{j.get('name')} ({money(j.get('salary'))})" for j in jobs)+"."
    if "profissao" in q and ("xp" in q or "desbloque" in q):
        return explain_job(snapshot,user)
    if "economia" in q and ("por que" in q or "porque" in q or "como" in q):
        return f"A economia deve ser analisada junto de atividade, empresas, população e infraestrutura. O indicador atual está em {money(f['economy'])}."
    if ("empresa" in q and "compr" in q) or ("loja" in q and "empresa" in q):
        companies=f["companies"]
        if companies:
            return f"Existem {len(companies)} empresas cadastradas; para comprar, o catálogo de Lojas é a fonte adequada e a compra deve respeitar as regras do sistema."
    return None
