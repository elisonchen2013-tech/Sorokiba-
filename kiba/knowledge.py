"""Conhecimento vivo e busca semântica determinística sobre Sorokiba."""
from collections import Counter

def arr(v): return v if isinstance(v, list) else []
def num(v, default=0):
    try: return float(v)
    except: return default

def city(snapshot): return snapshot.get("city") or {}

def facts(snapshot):
    c=city(snapshot)
    return {
        "population":int(num(c.get("population"))),
        "economy":num(c.get("economy")),
        "infrastructure":num(c.get("infrastructure")),
        "quality":num(c.get("quality")),
        "taxRate":num(c.get("taxRate")),
        "jobs":arr(snapshot.get("jobs")),
        "companies":arr(snapshot.get("companies")),
        "shop":arr(snapshot.get("shopItems")),
        "hospital":snapshot.get("hospital") or {},
        "pharmacy":arr(snapshot.get("pharmacy")),
        "news":arr(snapshot.get("news")),
        "events":arr(snapshot.get("events")),
        "users":arr(snapshot.get("users")),
        "missions":snapshot.get("missionRewards") or {},
        "proposals":arr(snapshot.get("proposals")),
        "updates":arr(snapshot.get("kibaUpdates")),
    }

TOPIC_TERMS={
 "city":["cidade","sorokiba","populacao","habitantes","economia","infraestrutura","qualidade"],
 "jobs":["profissao","profissoes","emprego","trabalho","carreira","salario","xp"],
 "missions":["missao","missoes","atividade","recompensa","objetivo"],
 "companies":["empresa","empresas","negocio","comercio"],
 "shop":["loja","produto","comprar","preco","catalogo"],
 "hospital":["hospital","consulta","exame","medico","saude","doenca","tratamento"],
 "bank":["banco","saldo","dinheiro","deposito","saque","transferencia"],
 "news":["noticia","manchete","novidade","atualizacao"],
 "events":["evento","agenda","programacao"],
 "inventory":["inventario","item","pertences","equipamento"],
 "pass":["passe","citypass","balas","tickets","roleta","recompensas"],
 "mayor":["prefeito","prefeitura","governo"],
}

def _norm(s):
    import unicodedata,re
    return re.sub(r"\s+"," ",unicodedata.normalize("NFD",str(s or "")).encode("ascii","ignore").decode().lower()).strip()

def _topic(q):
    n=_norm(q); scores={}
    for t,terms in TOPIC_TERMS.items(): scores[t]=sum(1 for x in terms if x in n)
    return max(scores,key=scores.get) if scores and max(scores.values()) else "city"

def topic_data(snapshot,topic):
    f=facts(snapshot); return f.get(topic) or f

def explain(topic,snapshot):
    f=facts(snapshot)
    templates={
      "city":"Sorokiba reúne cidadãos, economia, infraestrutura, profissões, empresas e serviços. Agora registra {population} habitantes, economia em R$ {economy:,.2f}, infraestrutura em {infrastructure:.0f}% e qualidade em {quality:.0f}%.",
      "jobs":"As profissões conectam trabalho, XP, salário e progressão. O catálogo atual possui {n} profissões.",
      "companies":"As empresas representam negócios da cidade, com proprietários e produtos. Há {n} empresas registradas no estado atual.",
      "hospital":"O Hospital concentra consultas, exames e condições do sistema de saúde do jogo. Existem {n} serviços cadastrados.",
      "shop":"As Lojas formam o catálogo de produtos compráveis. Existem {n} itens cadastrados.",
      "missions":"As missões são atividades de progressão e podem entregar XP e dinheiro conforme os registros atuais.",
      "bank":"O Banco separa dinheiro disponível e saldo bancário no perfil do cidadão.",
      "inventory":"O Inventário registra os itens pertencentes ao cidadão e suas quantidades.",
      "pass":"O City Pass reúne níveis, XP, missões, recompensas, balas, tickets, roleta e loja da temporada.",
      "mayor":"A Prefeitura concentra funções administrativas da cidade e respeita as permissões do cidadão.",
      "news":"As Notícias registram publicações e acontecimentos relevantes da cidade.",
      "events":"Os Eventos representam atividades programadas ou registradas pela cidade."
    }
    t=templates.get(topic)
    if not t:return None
    return t.format(**f,n=len(f.get(topic) or []))

def search_knowledge(question,snapshot):
    n=_norm(question); topic=_topic(n); f=facts(snapshot)
    if topic=="news" and f["news"]:
        x=f["news"][0]
        return {"answer":f'A notícia mais recente registrada é “{x.get("title") or x.get("name") or "Sem título"}”.',"evidence":["Notícias atuais"],"confidence":.96}
    if topic=="events" and f["events"]:
        x=f["events"][0]
        return {"answer":f'O evento mais recente registrado é “{x.get("title") or x.get("name") or "Sem título"}”.',"evidence":["Eventos atuais"],"confidence":.92}
    if topic=="jobs" and ("qual" in n or "quais" in n) and f["jobs"]:
        top=sorted(f["jobs"],key=lambda x:num(x.get("salary")),reverse=True)[:7]
        return {"answer":"Algumas profissões cadastradas são: "+", ".join(str(x.get("name")) for x in top)+".","evidence":["Catálogo de profissões"],"confidence":.95}
    return None
