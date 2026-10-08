"""Grafo de conhecimento determinístico da cidade.
Conecta entidades sem inventar relações que não estejam no snapshot.
"""
from .knowledge import facts

RELATIONS={
 "jobs":["xpRequired","salary","task"],
 "companies":["ownerName","products","balance"],
 "hospital":["services","conditions"],
 "missions":["moneyPerMission","xpPerMission","questionsPerMission"],
 "shop":["price","hunger","hydration","energy"],
 "city":["population","economy","infrastructure","quality","taxRate"],
}

def build(snapshot,user=None):
    f=facts(snapshot); u=user or {}
    graph={
      "citizen":{"level":u.get("level",1),"xp":u.get("xp",0),"jobId":u.get("jobId"),"jobName":u.get("jobName"),"money":u.get("money",0),"bankBalance":u.get("bankBalance",0)},
      "city":{k:f[k] for k in ("population","economy","infrastructure","quality","taxRate")},
      "jobs":f["jobs"],"companies":f["companies"],"missions":f["missions"],
      "hospital":f["hospital"],"shop":f["shop"],"news":f["news"],"events":f["events"]
    }
    return graph

def links(snapshot,user=None):
    g=build(snapshot,user); out=[]
    citizen=g["citizen"]
    job=next((j for j in g["jobs"] if str(j.get("id"))==str(citizen.get("jobId"))),None)
    if job:
        out += [
          ("citizen","profession",job.get("name")),
          ("profession","xp_required",job.get("xpRequired")),
          ("profession","salary",job.get("salary")),
          ("profession","task",job.get("task")),
        ]
    for company in g["companies"][:30]:
        out.append(("company",str(company.get("name") or "Empresa"),"owner",company.get("ownerName")))
    return out

def connected_domains(question):
    q=str(question or "").lower()
    domains=[]
    if any(x in q for x in ("profissao","emprego","salario","xp")): domains += ["jobs","missions"]
    if any(x in q for x in ("dinheiro","rico","saldo","banco")): domains += ["bank","jobs","companies","shop"]
    if any(x in q for x in ("empresa","negocio")): domains += ["companies","shop","bank"]
    if any(x in q for x in ("hospital","exame","saude")): domains += ["hospital","bank"]
    if any(x in q for x in ("cidade","economia","populacao")): domains += ["city","companies","jobs"]
    return list(dict.fromkeys(domains))
