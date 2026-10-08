"""Conhecimento vivo: derivado do snapshot atual do servidor."""
from collections import Counter

def arr(v): return v if isinstance(v,list) else []
def num(v, default=0): 
    try: return float(v)
    except: return default

def city(snapshot):
    return snapshot.get("city") or {}

def facts(snapshot):
    c=city(snapshot)
    return {
        "population": int(num(c.get("population"))),
        "economy": num(c.get("economy")),
        "infrastructure": num(c.get("infrastructure")),
        "quality": num(c.get("quality")),
        "jobs": arr(snapshot.get("jobs")),
        "companies": arr(snapshot.get("companies")),
        "shop": arr(snapshot.get("shopItems")),
        "hospital": snapshot.get("hospital") or {},
        "news": arr(snapshot.get("news")),
        "events": arr(snapshot.get("events")),
        "users": arr(snapshot.get("users")),
        "missions": snapshot.get("missionRewards") or {},
        "proposals": arr(snapshot.get("proposals")),
        "updates": arr(snapshot.get("kibaUpdates")),
    }

def topic_data(snapshot, topic):
    f=facts(snapshot)
    return f.get(topic) or f

def explain(topic, snapshot):
    f=facts(snapshot)
    templates={
      "city":"Sorokiba é o conjunto de sistemas da cidade: cidadãos, economia, infraestrutura, profissões, empresas e serviços. Os dados atuais registram {population} habitantes, economia em R$ {economy:,.2f}, infraestrutura em {infrastructure:.0f}% e qualidade em {quality:.0f}%.",
      "jobs":"As profissões conectam trabalho, XP, salário e progressão. O catálogo atual possui {n} profissões cadastradas.",
      "companies":"As empresas representam negócios criados na cidade e podem possuir produtos, proprietários e saldo próprio. Atualmente há {n} empresas registradas.",
      "hospital":"O Hospital concentra consultas, exames e condições do sistema de saúde do jogo. Existem {n} serviços cadastrados no estado atual.",
      "shop":"As Lojas são o catálogo de produtos compráveis. O catálogo atual possui {n} itens.",
      "missions":"As missões são atividades de progressão. Suas recompensas podem incluir dinheiro e XP e são definidas pelos registros atuais de cada missão.",
      "bank":"O Banco é o sistema financeiro pessoal do cidadão. O saldo em dinheiro e o saldo bancário são dados separados no perfil.",
      "inventory":"O Inventário registra os itens que pertencem ao cidadão e suas quantidades.",
      "pass":"O City Pass reúne níveis, XP, missões, recompensas, balas, tickets, roleta e loja da temporada.",
      "mayor":"A Prefeitura concentra funções de governo e administração da cidade. Recursos administrativos devem respeitar as permissões do cidadão.",
      "news":"As Notícias são registros publicados pela cidade e ajudam a acompanhar mudanças e acontecimentos.",
      "events":"Os Eventos representam atividades programadas ou registradas no calendário da cidade.",
    }
    t=templates.get(topic)
    if not t: return None
    if topic=="city": return t.format(**f)
    return t.format(n=len(f.get(topic) or []))
