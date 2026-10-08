"""Recomendações personalizadas usando somente dados disponíveis."""
from .knowledge import facts
def recommend(question,snapshot,user):
    q=str(question or "").lower(); f=facts(snapshot)
    if "profissao" in q or "emprego" in q:
        jobs=sorted(f["jobs"],key=lambda x:float(x.get("salary") or 0),reverse=True)
        if jobs:return "Com base no catálogo atual, eu compararia: "+", ".join(f"{j.get('name')} (salário {j.get('salary',0)}, XP {j.get('xpRequired',0)})" for j in jobs[:5])+". A melhor escolha depende da sua meta e do XP disponível."
    if "compr" in q or "loja" in q:
        items=sorted(f["shop"],key=lambda x:float(x.get("price") or 0))
        if items:return "Se sua prioridade é economizar, os itens mais baratos do catálogo atual são: "+", ".join(f"{x.get('name')} ({x.get('price',0)})" for x in items[:5])+"."
    return None
