"""Recomendações personalizadas sem inventar dados."""
from .knowledge import facts
def recommend(question,snapshot,user):
    q=str(question or "").lower()
    f=facts(snapshot)
    if "profissao" in q or "emprego" in q:
        jobs=sorted(f["jobs"],key=lambda x:float(x.get("salary") or 0),reverse=True)
        if jobs:
            return "Com base apenas no catálogo atual, eu compararia estas opções: " + ", ".join(f"{j.get('name')} ({j.get('salary',0)})" for j in jobs[:5]) + ". A melhor escolha depende do XP exigido e da sua meta."
    if "compr" in q or "loja" in q:
        items=sorted(f["shop"],key=lambda x:float(x.get("price") or 0))
        if items: return "Se o objetivo é economizar, comece pelos produtos de menor preço do catálogo atual: " + ", ".join(f"{x.get('name')} ({x.get('price',0)})" for x in items[:5]) + "."
    return None
