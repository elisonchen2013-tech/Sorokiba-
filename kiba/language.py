"""Kiba Language Engine: interpretação local, sem modelos externos."""
import re
import unicodedata

STOP = {"a","o","e","de","do","da","dos","das","um","uma","para","por","com","em","no","na","nos","nas","que","qual","como","me","meu","minha","eu","voce","vc","tem","tenho","isso","essa","este","esta"}

ALIASES = {
    "city": {"cidade","sorokiba","populacao","habitantes","economia","infraestrutura","qualidade","estado"},
    "jobs": {"profissao","profissoes","emprego","empregos","trabalho","carreira","cargo","salario","salarios","xp"},
    "missions": {"missao","missoes","atividade","atividades","objetivo","objetivos","recompensa","recompensas"},
    "companies": {"empresa","empresas","negocio","negocios","comercio","comercios"},
    "shop": {"loja","lojas","produto","produtos","comprar","preco","catalogo"},
    "hospital": {"hospital","medico","medica","consulta","consultar","exame","exames","saude","doenca","tratamento"},
    "bank": {"banco","saldo","dinheiro","grana","financeiro","financas","deposito","saque","transferencia"},
    "news": {"noticia","noticias","manchete","novidade","novidades","atualizacao","atualizacoes"},
    "events": {"evento","eventos","agenda","programacao"},
    "inventory": {"inventario","item","itens","pertences","equipamento","equipamentos"},
    "pass": {"passe","citypass","balas","tickets","ticket","roleta","recompensas"},
    "mayor": {"prefeito","prefeita","prefeitura","governo","governante"},
    "kiba": {"kiba","ornitorrinco","assistente","inteligencia","ia","cerebro"},
    "account": {"conta","perfil","avatar","personagem"},
}

def normalize(value):
    s = unicodedata.normalize("NFD", str(value or "")).encode("ascii","ignore").decode().lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9?%$.,:-]", " ", s)).strip()

def words(value):
    return [x for x in normalize(value).split() if x and x not in STOP]

def detect_kind(q):
    s = normalize(q)
    if re.search(r"\b(quantos|quantas|quanto|qual|quais)\b", s): return "count_or_lookup"
    if re.search(r"\b(por que|porque|como funciona|explique|explica|o que significa|qual a diferenca)\b", s): return "explanation"
    if re.search(r"\b(o que devo|o que posso|qual a melhor|me recomenda|vale a pena|como consigo|como faco|como fazer)\b", s): return "recommendation"
    if re.search(r"\b(agora|atual|atualmente|hoje|neste momento|status)\b", s): return "live_status"
    if re.search(r"\b(onde|qual pagina|onde fica)\b", s): return "navigation"
    return "direct"

def detect_topic(q):
    s = set(words(q))
    scores = {}
    for topic, aliases in ALIASES.items():
        scores[topic] = len(s & aliases)
    # Phrases that should dominate generic words.
    n = normalize(q)
    if re.search(r"\b(meu|minha)\b.*\b(xp|nivel|profissao|trabalho|dinheiro|saldo|inventario)\b", n):
        scores["account"] += 2
    if "meu" in s or "minha" in s:
        for t in ("bank","jobs","inventory"): scores[t] += 1
    topic = max(scores, key=scores.get)
    return topic if scores[topic] > 0 else "city"

def intent(q):
    n = normalize(q)
    kind = detect_kind(n)
    topic = detect_topic(n)
    if re.search(r"\b(oi|ola|olá|bom dia|boa tarde|boa noite|e ai|hey)\b", n):
        return {"name":"greeting","topic":"kiba","kind":"direct","confidence":0.99}
    if re.search(r"\b(quem (e|eh|é) o kiba|o que (e|eh|é) o kiba)\b", n):
        return {"name":"about_kiba","topic":"kiba","kind":"explanation","confidence":0.99}
    if re.search(r"\b(meu|minha)\b.*\b(xp|nivel|experiencia)\b|\bquanto.*xp.*tenho\b", n):
        return {"name":"self_xp","topic":"jobs","kind":"count_or_lookup","confidence":0.99}
    if re.search(r"\b(meu|minha)\b.*\b(dinheiro|saldo|grana|banco)\b|\bquanto.*dinheiro.*tenho\b", n):
        return {"name":"self_money","topic":"bank","kind":"count_or_lookup","confidence":0.99}
    if re.search(r"\b(meu|minha)\b.*\b(profissao|emprego|trabalho|carreira|cargo)\b", n):
        return {"name":"self_job","topic":"jobs","kind":"count_or_lookup","confidence":0.99}
    if re.search(r"\b(o que|qual).{0,30}\btenho\b", n) and "invent" in n:
        return {"name":"self_inventory","topic":"inventory","kind":"count_or_lookup","confidence":0.97}
    return {"name":topic, "topic":topic, "kind":kind, "confidence":0.65 if topic != "city" else 0.45}

def resolve_context(question, conversation):
    n = normalize(question)
    if not conversation or len(words(question)) > 2:
        return question
    last = ""
    for item in reversed(conversation):
        if item.get("role") == "user":
            last = str(item.get("content") or "")
            break
    if last and n in {"e isso","e esse","e essa","como assim","por que","porque","quanto","e depois","e ai"}:
        return last + " " + question
    return question
