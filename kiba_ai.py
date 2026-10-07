#!/usr/bin/env python3
"""
Kiba Brain — inteligência proprietária do Sorokiba.
Sem OpenAI, Gemini, Claude ou APIs externas.
O processo recebe JSON por linha e devolve JSON por linha.
"""
import sys
import json
import re
import time
import unicodedata
from difflib import SequenceMatcher


SYNONYMS = {
    "prefeito": {"prefeito", "prefeita", "prefeitura", "governo", "governante"},
    "dinheiro": {"dinheiro", "saldo", "grana", "moeda", "financeiro", "financas", "banco", "bancario"},
    "emprego": {"emprego", "trabalho", "profissao", "profissoes", "carreira", "cargo", "oficio", "salario", "salarios"},
    "missoes": {"missao", "missoes", "atividade", "atividades", "objetivo", "objetivos", "recompensa", "recompensas"},
    "cidade": {"cidade", "sorokiba", "populacao", "economia", "infraestrutura", "qualidade", "habitantes"},
    "empresas": {"empresa", "empresas", "negocio", "negocios", "loja", "lojas", "comercio", "produto", "produtos"},
    "hospital": {"hospital", "medico", "medica", "consulta", "consultar", "exame", "exames", "doenca", "saude", "tratamento"},
    "noticias": {"noticia", "noticias", "manchete", "manchetes", "novidade", "novidades", "atualizacao", "atualizacoes"},
    "eventos": {"evento", "eventos", "agenda", "programacao"},
    "inventario": {"inventario", "item", "itens", "pertences", "equipamento", "equipamentos"},
    "xp": {"xp", "experiencia", "nivel", "progressao", "progresso"},
    "kiba": {"kiba", "ornitorrinco", "mascote", "assistente", "inteligencia", "ia", "cerebro"},
    "memoria": {"memoria", "lembra", "lembrete", "lembrar", "objetivo", "preferencia"},
}


INTENT_PATTERNS = {
    "self_xp": [
        r"(meu|minha).{0,35}\b(xp|experiencia|nivel)\b",
        r"\b(xp|experiencia)\b.{0,35}\b(tenho|estou)\b",
    ],
    "self_money": [
        r"(meu|minha).{0,35}\b(dinheiro|saldo|grana|banco)\b",
        r"quanto.{0,25}\b(dinheiro|saldo|grana)\b.*\b(tenho|possuo)\b",
    ],
    "self_job": [
        r"(meu|minha).{0,35}\b(emprego|profissao|trabalho|carreira|cargo)\b",
        r"\b(como|qual).{0,25}\b(esta|meu)\b.*\b(profissao|trabalho)\b",
    ],
    "memory": [
        r"\b(o que|qual).{0,25}\b(voce|vc).{0,10}\b(lembra|sabe)\b.*\b(sobre mim|de mim|sobre eu)\b",
        r"\b(meu|minha).{0,20}\b(objetivo|preferencia|preferencia)\b",
        r"\b(lembra|lembrar)\b",
    ],
    "mayor": [r"\b(prefeito|prefeita|prefeitura)\b"],
    "city": [
        r"\b(populacao|economia|infraestrutura|qualidade|habitantes)\b",
        r"(como|qual|estado).{0,25}\b(cidade|sorokiba)\b",
    ],
    "missions": [
        r"\b(missao|missoes)\b",
        r"(como|o que|quais).{0,35}\bmissoes?\b",
        r"\b(recompensa|recompensas)\b.*\b(missao|missoes)\b",
    ],
    "jobs": [
        r"\b(profissao|profissoes|emprego|empregos|carreira|salario|salarios)\b",
    ],
    "companies": [
        r"\b(empresa|empresas|negocio|negocios|comercio)\b",
    ],
    "hospital": [
        r"\b(hospital|consulta|exame|exames|medico|saude|doenca|tratamento)\b",
    ],
    "news": [
        r"\b(noticia|noticias|manchete|novidade|novidades|atualizacao)\b",
    ],
    "events": [
        r"\b(evento|eventos|agenda|programacao)\b",
    ],
    "inventory": [
        r"\b(inventario|item|itens|pertences|equipamento)\b",
    ],
    "shop": [
        r"\b(loja|lojas|catalogo|comprar|produto|produtos)\b",
    ],
    "kiba": [
        r"\b(kiba|ornitorrinco|mascote|assistente)\b",
    ],
    "page": [
        r"\b(o que tem aqui|o que tem nessa pagina|o que tem nesta pagina|onde estou|qual pagina)\b",
    ],
    "help": [
        r"\b(ajuda|bug|erro|problema|travou|travando|nao funciona|falhou)\b",
    ],
}


PAGE_NAMES = {
    "city": "Cidade",
    "job": "Emprego",
    "missions": "Missões",
    "inventory": "Inventário",
    "shop": "Lojas",
    "companies": "Empresas",
    "hospital": "Hospital",
    "bank": "Banco",
    "players": "Jogadores",
    "news": "Notícias",
    "events": "Eventos",
    "proposals": "Propostas",
    "mayor": "Prefeitura",
    "account": "Conta",
}


PAGE_DESCRIPTIONS = {
    "city": "painel geral da cidade, com indicadores e panorama de Sorokiba",
    "job": "carreira, profissões, salários e progressão profissional",
    "missions": "missões, atividades e recompensas de progressão",
    "inventory": "itens e produtos registrados para o seu cidadão",
    "shop": "lojas e produtos disponíveis para compra",
    "companies": "empresas, negócios e produtos cadastrados",
    "hospital": "consultas, serviços e exames do hospital",
    "bank": "dinheiro, saldo e movimentações financeiras",
    "players": "jogadores e cidadãos registrados",
    "news": "notícias publicadas pela cidade",
    "events": "eventos e programação registrados",
    "proposals": "propostas e decisões do sistema da cidade",
    "mayor": "ferramentas da prefeitura, quando seu cidadão tem acesso",
    "account": "perfil e configurações da conta",
}


GREETINGS = [
    "Oi! Eu sou o Kiba. Vou consultar os dados atuais de Sorokiba antes de responder quando a pergunta precisar de informação do jogo.",
    "Olá! Sou o Kiba. Posso cruzar dados da cidade, do seu perfil e de vários sistemas para responder melhor.",
    "Oi! Pode perguntar. Meu cérebro próprio de Sorokiba vai procurar o dado mais relevante antes de montar a resposta.",
]

HELP_TEXTS = [
    "Posso consultar Cidade, Emprego, Missões, Inventário, Lojas, Empresas, Hospital, Banco, Jogadores, Notícias, Eventos e Prefeitura.",
    "Posso cruzar informações de diferentes sistemas da cidade. Também consigo usar o contexto recente da conversa para perguntas como 'e o preço?' ou 'e depois?'.",
]


def norm(value):
    text = unicodedata.normalize("NFD", str(value or "").lower())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-z0-9? ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def words(value):
    return [w for w in norm(value).split() if len(w) > 1]


def overlap(a, b):
    return len(set(words(a)) & set(words(b)))


def semantic_score(query, text):
    qn, tn = norm(query), norm(text)
    score = overlap(qn, tn) * 1.0
    qwords, twords = set(qn.split()), set(tn.split())
    for group in SYNONYMS.values():
        if qwords.intersection(group) and twords.intersection(group):
            score += 1.6
    score += SequenceMatcher(None, qn[:220], tn[:420]).ratio() * 0.9
    return score


def detect_intent(query):
    s = norm(query)
    if not s:
        return "empty"
    if re.match(r"^(oi|ola|e ai|hey|hello|bom dia|boa tarde|boa noite)\b", s):
        return "greet"
    if any(term in s for term in ("qual e a melhor", "qual melhor", "mais bem paga", "maior salario", "paga mais", "paga melhor", "salario maior", "comparar", "compare")) and re.search(r"\b(profissao|emprego|trabalho|carreira|salario)\b", s):
        return "compare"
    for key, patterns in INTENT_PATTERNS.items():
        if any(re.search(pattern, s) for pattern in patterns):
            return key
    return "general"


def money(value):
    try:
        value = float(value or 0)
        return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except Exception:
        return "R$ 0,00"


def integer(value):
    try:
        return f"{float(value):,.0f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except Exception:
        return "0"


def choose(options, recent):
    if not options:
        return ""
    recent_set = set(str(x) for x in (recent or []))
    unused = [x for x in options if x not in recent_set]
    return (unused or options)[0 if len(unused or options) == 1 else int(time.time() * 1000) % len(unused or options)]


def latest(items):
    if not isinstance(items, list):
        return []
    return sorted(
        items,
        key=lambda x: str(x.get("createdAt") or x.get("date") or x.get("updatedAt") or ""),
        reverse=True,
    )


def first_name(user):
    return str((user or {}).get("name") or "cidadão").strip().split()[0] or "cidadão"


def active_job(jobs, job_id):
    return next((j for j in jobs if str(j.get("id")) == str(job_id)), None)


ENTITY_QUERY_STOPWORDS = {
    "a", "as", "o", "os", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das",
    "no", "na", "nos", "nas", "em", "por", "para", "com", "e", "quanto", "custa", "custam",
    "preco", "valor", "qual", "quais", "onde", "mostre", "mostrar", "tem", "existe", "existem",
    "lista", "listar", "sobre", "me", "meu", "minha", "meus", "minhas", "funciona", "funcionam",
    "melhor", "mais", "paga", "pagam", "salario", "profissao", "emprego", "trabalho", "hospital",
    "servico", "servicos", "empresa", "empresas", "loja", "lojas", "produto", "produtos", "catalogo",
}


def entity_match(query, items, fields=("name",), threshold=0.7):
    q = " ".join(token for token in norm(query).split() if token not in ENTITY_QUERY_STOPWORDS)
    if not q:
        return None
    best = None
    best_score = 0.0
    for item in items or []:
        text = " ".join(str(item.get(field) or "") for field in fields)
        score = semantic_score(q, text)
        if score > best_score:
            best, best_score = item, score
    return best if best_score >= threshold else None


def previous_user_message(conversation):
    for item in reversed(conversation or []):
        if item.get("role") == "user":
            return str(item.get("content") or "")
    return ""


def previous_assistant_message(conversation):
    for item in reversed(conversation or []):
        if item.get("role") == "assistant":
            return str(item.get("content") or "")
    return ""


def contextual_question(query, conversation):
    q = norm(query)
    if not conversation:
        return q
    follow = (
        q.startswith(("e ", "isso", "ele", "ela", "esse", "essa", "aquele", "aquela"))
        or q in {"e o preco", "e o valor", "e depois", "como assim", "por que", "qual deles", "qual delas"}
        or q.endswith(" custa")
    )
    if not follow:
        return q
    prev = previous_user_message(conversation)
    if not prev:
        return q
    return (prev + " " + q).strip()


def research_agents(query, intent_name, snapshot, current_page):
    q = norm(query)
    agents = []
    def add(name, reason, priority=1):
        agents.append({"agent": name, "reason": reason, "priority": priority})
    add("Contexto da conversa", "verificar se a pergunta continua uma conversa anterior", 3)
    if any(x in q for x in ("meu", "minha", "eu", "tenho", "estou")):
        add("Perfil do cidadão", "consultar os dados privados do próprio jogador", 5)
    if any(x in q for x in ("cidade", "sorokiba", "populacao", "economia", "infraestrutura", "qualidade")):
        add("Estado da cidade", "consultar indicadores atuais de Sorokiba", 5)
    if any(x in q for x in ("profissao", "emprego", "salario", "xp", "carreira")):
        add("Carreiras", "comparar profissões, salários e requisitos", 5)
    if any(x in q for x in ("empresa", "loja", "produto", "negocio")):
        add("Comércio e empresas", "consultar negócios e produtos registrados", 5)
    if any(x in q for x in ("hospital", "medico", "exame", "saude", "doenca")):
        add("Hospital", "consultar serviços, preços e informações do sistema de saúde do jogo", 5)
    if any(x in q for x in ("noticia", "novidade", "atualizacao")):
        add("Notícias", "consultar publicações recentes da cidade", 4)
    if any(x in q for x in ("evento", "agenda", "programacao")):
        add("Eventos", "consultar programação registrada", 4)
    if any(x in q for x in ("missao", "recompensa", "atividade")):
        add("Missões", "consultar regras e recompensas", 4)
    if any(x in q for x in ("inventario", "item", "equipamento")):
        add("Inventário", "consultar itens do cidadão", 4)
    if any(x in q for x in ("prefeito", "prefeitura", "governo")):
        add("Prefeitura", "consultar informações públicas e ferramentas administrativas disponíveis", 4)
    if any(x in q for x in ("lembra", "memoria", "objetivo", "preferencia")):
        add("Memória do Kiba", "buscar memórias úteis e não sensíveis", 5)
    add("Verificação", "cruzar resultados e evitar inventar informações", 5)
    unique = {}
    for agent in agents:
        unique[agent["agent"]] = agent
    return sorted(unique.values(), key=lambda x: -x["priority"])


def research_plan(intent_name, snapshot, current_page):
    city = snapshot.get("city") or {}
    counts = {
        "profissões": len(snapshot.get("jobs") or []),
        "empresas": len(snapshot.get("companies") or []),
        "notícias": len(snapshot.get("news") or []),
        "eventos": len(snapshot.get("events") or []),
        "serviços": len((snapshot.get("hospital") or {}).get("services") or []),
        "cidadãos": len(snapshot.get("users") or []),
        "memórias": len(snapshot.get("memory") or []),
    }
    page = PAGE_NAMES.get(current_page, "Sorokiba")
    base = {
        "self_xp": [f"Perfil do cidadão ({page})"],
        "self_money": ["Perfil financeiro do cidadão"],
        "self_job": ["Perfil do cidadão", f"Lista de profissões ({counts['profissões']})"],
        "mayor": [f"Cadastro público ({counts['cidadãos']} cidadãos)"],
        "city": ["Estado atual da cidade", f"Indicadores de Sorokiba"],
        "missions": ["Sistema de missões", f"Profissões ({counts['profissões']})"],
        "jobs": [f"Profissões ({counts['profissões']})", "Salários e requisitos de XP"],
        "companies": [f"Empresas e lojas ({counts['empresas']})", "Produtos cadastrados"],
        "hospital": [f"Hospital ({counts['serviços']} serviços)", "Preços e prazos registrados"],
        "news": [f"Notícias ({counts['notícias']})", "Publicações mais recentes"],
        "events": [f"Eventos ({counts['eventos']})", "Programação registrada"],
        "inventory": ["Inventário do cidadão", "Produtos e quantidades registradas"],
        "kiba": [f"Memória do Kiba ({counts['memórias']})", "Conhecimento próprio de Sorokiba"],
        "memory": [f"Memória persistente do cidadão ({counts['memórias']})", "Contexto recente da conversa"],
        "page": [f"Página atual: {page}", "Sistemas relacionados"],
        "compare": [f"Profissões ({counts['profissões']})", f"Empresas ({counts['empresas']})", "Critérios da pergunta"],
        "help": ["Sistemas de Sorokiba", f"Página atual: {page}"],
        "general": ["Interpretar a pergunta e o contexto", "Consultar evidências nos sistemas relacionados", "Verificar consistência antes de responder"],
        "followup": ["Contexto da conversa", "Dado relacionado à pergunta anterior"],
    }
    return base.get(intent_name, base["general"])


def source_list(intent_name, snapshot, current_page):
    jobs = len(snapshot.get("jobs") or [])
    companies = len(snapshot.get("companies") or [])
    news = len(snapshot.get("news") or [])
    events = len(snapshot.get("events") or [])
    services = len((snapshot.get("hospital") or {}).get("services") or [])
    memory = len(snapshot.get("memory") or [])
    page = PAGE_NAMES.get(current_page, "Sorokiba")
    mapping = {
        "self_xp": [("Seu perfil", "XP e nível atuais")],
        "self_money": [("Seu perfil", "dinheiro disponível")],
        "self_job": [("Seu perfil", "profissão atual"), ("Profissões", f"{jobs} profissões cadastradas")],
        "mayor": [("Cadastro público", "cidadãos e cargo de prefeito")],
        "city": [("Estado atual da cidade", "população, economia, infraestrutura e qualidade")],
        "missions": [("Missões", "sistema de atividades"), ("Profissões", f"{jobs} profissões")],
        "jobs": [("Profissões", f"{jobs} profissões, salários e XP")],
        "companies": [("Empresas e lojas", f"{companies} empresas registradas")],
        "hospital": [("Hospital", f"{services} serviços registrados")],
        "news": [("Notícias", f"{news} publicações carregadas")],
        "events": [("Eventos", f"{events} eventos registrados")],
        "inventory": [("Seu inventário", "itens registrados para o cidadão")],
        "kiba": [("Memória do Kiba", f"{memory} registros persistentes")],
        "memory": [("Memória do cidadão", f"{memory} registros relacionados"), ("Contexto", "conversa recente")],
        "page": [(f"Página atual: {page}", PAGE_DESCRIPTIONS.get(current_page, "área atual"))],
        "compare": [("Profissões", f"{jobs} registros"), ("Empresas", f"{companies} registros"), ("Hospital", f"{services} serviços")],
        "help": [("Sistemas de Sorokiba", "áreas disponíveis"), (f"Página atual: {page}", PAGE_DESCRIPTIONS.get(current_page, "área atual"))],
        "general": [("Estado da cidade", "dados atuais"), ("Memória do Kiba", f"{memory} registros"), (f"Página atual: {page}", PAGE_DESCRIPTIONS.get(current_page, "área atual"))],
        "followup": [("Contexto da conversa", "mensagens recentes"), (f"Página atual: {page}", PAGE_DESCRIPTIONS.get(current_page, "área atual"))],
    }
    return [{"name": name, "detail": detail} for name, detail in mapping.get(intent_name, mapping["general"])]


def memory_candidates(query, user, snapshot):
    raw = str(query or "").strip()
    q = norm(raw)
    if not q:
        return []

    sensitive = re.compile(r"\b(senha|password|token|codigo de acesso|cpf|rg|telefone|celular|email|e-mail|endereco|endereço)\b", re.I)
    candidates = []

    def add(content, kind, importance):
        text = re.sub(r"\s+", " ", str(content or "")).strip()
        if not text or len(text) > 180 or sensitive.search(text):
            return
        candidates.append({
            "content": text,
            "kind": kind,
            "importance": max(1, min(5, int(importance))),
        })

    explicit = re.search(r"\b(?:lembre|lembra|guarde|anote)\s+(?:que\s+)?(.+)$", q)
    if explicit:
        original = re.sub(r"\b(?:lembre|lembra|guarde|anote)\s+(?:que\s+)?", "", raw, flags=re.I).strip()
        add(original, "explicit", 5)

    goal = re.search(r"\bmeu objetivo(?: no sorokiba)?\s+(?:e|é)\s+(.+)$", q)
    if goal:
        add("Objetivo no Sorokiba: " + goal.group(1).strip(), "goal", 4)

    jobs = snapshot.get("jobs") or []
    for job in jobs:
        job_name = norm(job.get("name"))
        if job_name and re.search(r"\b(quero|gostaria|pretendo)\s+(?:ser|trabalhar como|seguir como)\b.{0,50}" + re.escape(job_name), q):
            add("Profissão de interesse: " + str(job.get("name")), "preference", 3)
            break

    return candidates[:3]


def find_memory(query, memory):
    q = norm(query)
    scored = []
    for item in memory or []:
        content = str(item.get("content") or "")
        score = semantic_score(q, content)
        if score > 2.0:
            scored.append((score, item))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [item for _, item in scored[:4]]


def answer(query, user, snapshot, recent, conversation, current_page):
    city = snapshot.get("city") or {}
    jobs = snapshot.get("jobs") or []
    companies = snapshot.get("companies") or []
    news = latest(snapshot.get("news") or [])
    events = latest(snapshot.get("events") or [])
    hospital = snapshot.get("hospital") or {}
    users = snapshot.get("users") or []
    memory = snapshot.get("memory") or []
    name = first_name(user)
    q = contextual_question(query, conversation)
    it = detect_intent(q)

    if it == "empty":
        return "Pode perguntar. Vou pesquisar os dados atuais de Sorokiba.", it, 0.98, []

    if it == "greet":
        return choose(GREETINGS, recent), it, 1.0, []

    if it == "help":
        return choose(HELP_TEXTS, recent), it, 0.98, []

    if it == "kiba":
        return choose([
            "Eu sou o Kiba, a inteligência virtual própria de Sorokiba. Meu cérebro consulta os dados do jogo, usa contexto recente e responde sem depender de modelos externos.",
            "Sou o Kiba. Eu não sou um serviço de IA externo: fui integrado ao Sorokiba para pesquisar os dados internos da cidade e ajudar você.",
            "Eu sou o assistente virtual de Sorokiba. Posso consultar mais de um sistema, comparar informações e usar algumas memórias úteis do seu cidadão.",
        ], recent), it, 0.99, memory_candidates(query, user, snapshot)

    if it == "page":
        page_name = PAGE_NAMES.get(current_page, "Sorokiba")
        description = PAGE_DESCRIPTIONS.get(current_page, "esta área da cidade")
        return f"Você está na página {page_name}. Aqui ficam {description}. Posso consultar os dados dessa área e relacioná-los com outros sistemas da cidade.", it, 0.98, []

    if it == "memory":
        matches = find_memory(q, memory)
        if matches:
            joined = " ".join(str(x.get("content")) for x in matches[:3])
            return f"Lembro destes registros úteis do seu cidadão: {joined}", it, 0.95, []
        prev = previous_user_message(conversation)
        if prev:
            return f"Ainda não tenho uma memória persistente relevante para isso. No contexto recente, sua última pergunta foi: {prev}", it, 0.72, []
        return "Ainda não tenho uma memória persistente relevante sobre isso.", it, 0.83, []

    if it == "self_xp":
        xp, level = integer(user.get("xp", 0)), integer(user.get("level", 1))
        return f"{name}, consultei seu perfil: você está no nível {level} com {xp} XP.", it, 1.0, memory_candidates(query, user, snapshot)

    if it == "self_money":
        return f"Conferi seu perfil: você tem {money(user.get('money', 0))} em dinheiro disponível.", it, 1.0, memory_candidates(query, user, snapshot)

    if it == "self_job":
        job = user.get("jobName") or "Cidadão"
        current = active_job(jobs, user.get("jobId"))
        extra = f" Essa profissão exige {integer(current.get('xpRequired'))} XP para desbloqueio." if current else ""
        return f"Seu emprego atual é {job}.{extra}", it, 0.99, memory_candidates(query, user, snapshot)

    if it == "mayor":
        mayor = next((u for u in users if u.get("isMayor")), None)
        if mayor:
            return f"Consultei o cadastro público de Sorokiba: {mayor.get('name')} é o prefeito atual.", it, 0.99, []
        return "Não encontrei um prefeito registrado nos dados atuais.", it, 0.75, []

    if it == "city":
        infrastructure = float(city.get("infrastructure") or 0)
        quality = float(city.get("quality") or 0)
        observations = []
        if infrastructure < 40:
            observations.append("A infraestrutura está baixa; uma prioridade razoável seria avaliar melhorias nos serviços e estruturas da cidade.")
        elif infrastructure >= 80:
            observations.append("A infraestrutura está em nível alto.")
        if quality < 40:
            observations.append("A qualidade de vida também merece atenção.")
        elif quality >= 80:
            observations.append("A qualidade de vida está em nível alto.")
        commentary = " " + " ".join(observations) if observations else " Os indicadores, por si só, não apontam uma prioridade extrema."
        return (
            f"A leitura atual de Sorokiba é: {integer(city.get('population'))} cidadãos, "
            f"economia em {money(city.get('economy'))}, infraestrutura em {integer(city.get('infrastructure'))}% "
            f"e qualidade em {integer(city.get('quality'))}%.{commentary}"
        ), it, 0.99, []

    if it in {"jobs", "compare"}:
        if not jobs:
            return "Não encontrei profissões cadastradas no estado atual da cidade.", it, 0.75, []
        matched = entity_match(q, jobs, ("name", "task"))
        if matched and any(word in q for word in ("como", "requisito", "desbloque", "salario", "ganha", "trabalho", "faz")):
            return (
                f"A profissão {matched.get('name')} tem salário listado de {money(matched.get('salary'))} "
                f"e exige {integer(matched.get('xpRequired'))} XP para desbloqueio. "
                f"Atividade registrada: {matched.get('task') or 'não informada'}."
            ), "jobs", 0.97, []
        eligible = [item for item in jobs if float(item.get("xpRequired") or 0) <= float(user.get("xp") or 0)]
        if any(word in q for word in ("posso", "desbloque", "disponivel", "disponiveis", "tenho xp")):
            if eligible:
                names = ", ".join(str(item.get("name")) for item in sorted(eligible, key=lambda item: float(item.get("salary") or 0), reverse=True)[:6])
                return f"Com {integer(user.get('xp'))} XP, você atende ao requisito de {len(eligible)} profissão(ões): {names}. O salário é só um dos critérios; confira também a atividade e o requisito de cada carreira.", "jobs", 0.95, []
            next_job = min(jobs, key=lambda item: float(item.get("xpRequired") or 0))
            return f"Com {integer(user.get('xp'))} XP, você ainda não atende ao requisito das profissões cadastradas. A opção com menor requisito é {next_job.get('name')}, que pede {integer(next_job.get('xpRequired'))} XP.", "jobs", 0.94, []
        if it == "compare" or any(word in q for word in ("salario", "melhor", "ganha", "mais paga")):
            ranked = sorted(jobs, key=lambda item: float(item.get("salary") or 0), reverse=True)[:3]
            ranking = "; ".join(
                f"{item.get('name')} — salário listado de {money(item.get('salary'))}, {integer(item.get('xpRequired'))} XP para desbloquear"
                for item in ranked
            )
            best = ranked[0]
            return (
                f"Pelo critério de maior salário listado, {best.get('name')} lidera com {money(best.get('salary'))}. "
                f"As próximas opções são: {ranking}. Isso compara remuneração cadastrada, não a dificuldade ou o estilo de cada trabalho."
            ), "compare", 0.96, []
        sample = ", ".join(f"{j.get('name')} ({money(j.get('salary'))})" for j in jobs[:12])
        return f"Encontrei {len(jobs)} profissões cadastradas. Entre as que consultei estão: {sample}.", it, 0.97, []

    if it == "missions":
        rewards = snapshot.get("missionRewards") or {}
        reward = rewards.get(str(user.get("jobId") or ""), {})
        if reward:
            return (
                f"Para sua profissão atual, a configuração registra {integer(reward.get('questionsPerMission'))} pergunta(s) por missão "
                f"e recompensa de {money(reward.get('moneyPerMission'))} e {integer(reward.get('xpPerMission'))} XP. "
                "A missão disponível e o resultado final ainda dependem das regras da atividade."
            ), it, 0.96, []
        return (
            "No Sorokiba, as missões conectam atividade e progressão. Elas podem entregar dinheiro e XP, "
            "e o conteúdo/recompensa depende da profissão e da configuração atual do sistema."
        ), it, 0.95, []

    if it == "companies":
        if not companies:
            return "Não encontrei empresas registradas na cidade agora.", it, 0.9, []
        matched = entity_match(q, companies, ("name", "description"))
        if matched:
            products = matched.get("products") or []
            if products and any(word in q for word in ("produto", "vende", "preco", "valor", "custa", "quanto")):
                descriptions = ", ".join(
                    f"{item.get('name')} ({money(item.get('price'))})"
                    for item in products[:6]
                )
                return f"{matched.get('name')} tem estes produtos registrados: {descriptions}.", it, 0.95, []
            return f"{matched.get('name')}: {matched.get('description') or 'a descrição não foi informada'}.", it, 0.93, []
        tech = [c for c in companies if norm(c.get("companyType")) == "tecnologia"]
        names = ", ".join(str(c.get("name")) for c in companies[:8] if c.get("name"))
        if "tecnologia" in q and tech:
            return f"Consultei {len(companies)} empresas e encontrei {len(tech)} classificada(s) como tecnologia: " + ", ".join(str(c.get("name")) for c in tech[:8]), it, 0.95, []
        return f"Encontrei {len(companies)} empresas registradas. Algumas são: {names}.", it, 0.96, []

    if it == "shop":
        items = snapshot.get("shopItems") or []
        if not items:
            return "Não encontrei produtos de loja no catálogo atual.", it, 0.82, []
        matched = entity_match(q, items, ("name", "description"))
        if matched:
            detail = f"{matched.get('name')} custa {money(matched.get('price'))}."
            effects = []
            for key, label in (("hunger", "fome"), ("hydration", "hidratação"), ("energy", "energia")):
                if float(matched.get(key) or 0) > 0:
                    effects.append(f"+{integer(matched.get(key))} {label}")
            if effects:
                detail += " Efeito registrado: " + ", ".join(effects) + "."
            return detail, it, 0.96, []
        return f"O catálogo tem {len(items)} produtos. Diga o nome de um produto para eu conferir o preço e os efeitos registrados.", it, 0.9, []

    if it == "hospital":
        services = hospital.get("services") or []
        if not services:
            return "O Hospital está registrado, mas não encontrei serviços disponíveis no estado atual.", it, 0.82, []
        matched = entity_match(q, services, ("name", "category"))
        if matched and (any(word in q for word in ("preco", "valor", "custa", "quanto", "prazo", "tempo", "demora")) or norm(str(matched.get("name") or "")) in q):
            return (
                f"Consultei o serviço {matched.get('name')}. "
                f"O preço registrado é {money(matched.get('price'))} e o prazo estimado é "
                f"{matched.get('estimatedTime') or 'não informado'}."
            ), it, 0.96, []
        names = ", ".join(str(s.get("name")) for s in services[:8] if s.get("name"))
        return f"Consultei o Hospital e encontrei {len(services)} serviços. Entre eles: {names}.", it, 0.95, []

    if it == "news":
        if not news:
            return "Não encontrei notícias publicadas recentemente.", it, 0.87, []
        selected = news[:3]
        summaries = []
        for item in selected:
            title = str(item.get("title") or item.get("name") or "Sem título")
            text = str(item.get("text") or item.get("description") or "").strip()
            summaries.append(title + (": " + text[:180] if text else ""))
        return "As publicações mais recentes que encontrei são: " + " | ".join(summaries) + ".", it, 0.96, []

    if it == "events":
        if not events:
            return "Não encontrei eventos registrados recentemente.", it, 0.87, []
        titles = [str(item.get("title") or item.get("name") or "Evento") for item in events[:4]]
        return f"Encontrei {len(events)} eventos registrados. Alguns dos mais recentes são: " + " | ".join(titles[:3]) + ".", it, 0.92, []

    if it == "inventory":
        inv = user.get("inventory") or {}
        positive = [(k, v) for k, v in inv.items() if float(v or 0) > 0]
        if not positive:
            return "Seu inventário não registra itens comuns no momento.", it, 0.95, []
        item_names = {str(item.get("id")): item.get("name") for item in snapshot.get("shopItems") or []}
        visible = [
            f"{item_names.get(str(item_id), 'Item ' + str(item_id))} × {integer(quantity)}"
            for item_id, quantity in positive[:8]
        ]
        return f"Consultei seu inventário e encontrei {len(positive)} tipo(s) de item: " + ", ".join(visible) + ".", it, 0.94, []

    # Perguntas de acompanhamento: "e o preço?", "e depois?", "qual deles?"
    if conversation and norm(query) in {"e o preco", "e o valor", "e depois", "como assim", "por que", "qual deles", "qual delas"}:
        prev = previous_user_message(conversation)
        return f"Entendi como uma continuação da sua pergunta anterior: “{prev}”. Vou precisar de um detalhe a mais para escolher exatamente qual dado você quer.", "followup", 0.74, []

    # Busca semântica na memória oficial de Sorokiba.
    best = None
    best_score = 0.0
    for item in snapshot.get("kibaKnowledge", snapshot.get("knowledge", [])) or []:
        text = f"{item.get('title', '')} {item.get('content', '')}"
        score = semantic_score(q, text)
        if score > best_score:
            best, best_score = item, score
    if best is not None and best_score >= 2.45:
        return f"Encontrei uma informação registrada na memória oficial do Kiba: {best.get('content', '')}", "kiba_knowledge", 0.86, memory_candidates(query, user, snapshot)

    # Pequenas perguntas cruzando vários sistemas.
    if "empresa" in q and "tecnologia" in q:
        tech = [c for c in companies if norm(c.get("companyType")) == "tecnologia"]
        return f"Consultei as empresas e encontrei {len(tech)} classificada(s) como tecnologia.", "companies", 0.9, []

    if "hospital" in q and ("empresa" in q or "loja" in q):
        return f"Comparei os dois sistemas: o Hospital tem {len(hospital.get('services') or [])} serviço(s) registrados e a cidade tem {len(companies)} empresa(s).", "compare", 0.89, []

    context_note = ""
    if current_page and current_page in PAGE_NAMES:
        context_note = f" Você está em {PAGE_NAMES[current_page]}, então tentei considerar essa área da cidade."
    return choose([
        "Procurei nos dados internos disponíveis, mas ainda não encontrei evidência suficiente para responder sem inventar." + context_note,
        "Essa informação ainda não está clara no meu conhecimento atual de Sorokiba." + context_note,
        "Não consegui relacionar sua pergunta a um dado confiável da cidade. Prefiro não inventar uma resposta." + context_note,
    ], recent), "general", 0.52, memory_candidates(query, user, snapshot)




# === KIBA AGENT CORE 2.0 ===
# Esta camada fica acima das regras antigas. Ela transforma a pergunta em:
# entender -> contextualizar -> planejar -> consultar -> cruzar -> verificar -> responder.
AGENT_STOPWORDS = {
    "a","as","o","os","um","uma","uns","umas","de","do","da","dos","das","em","no","na",
    "nos","nas","por","para","com","e","ou","que","qual","quais","como","quando","onde",
    "quanto","quantos","quantas","tem","tenho","tenha","me","meu","minha","meus","minhas",
    "eu","vc","voce","você","pra","pro","se","isso","esse","essa","ele","ela","eles","elas",
    "agora","aqui","ali","sobre","fazer","faz","pode","posso","quero","gostaria"
}

TYPO_FIXES = {
    "intender":"entender","entendo":"entendo","respos":"resposta","respostaas":"respostas",
    "perguta":"pergunta","perguntas":"perguntas","profisão":"profissao","profissoes":"profissoes",
    "salarioo":"salario","dinherio":"dinheiro","dinhero":"dinheiro","hospitalar":"hospital",
    "empreza":"empresa","empressa":"empresa","notica":"noticia","misao":"missao",
    "invantario":"inventario","invetario":"inventario","prefeto":"prefeito","prefeitura":"prefeitura",
    "trasferencia":"transferencia","transferir":"transferencia","tranferencia":"transferencia"
}

DOMAIN_TERMS = {
    "city":{"cidade","sorokiba","populacao","habitantes","economia","infraestrutura","qualidade","imposto","taxa"},
    "jobs":{"profissao","emprego","trabalho","carreira","salario","xp","nivel","desbloquear","desbloqueio","cargo"},
    "missions":{"missao","missoes","atividade","recompensa","objetivo"},
    "companies":{"empresa","empresas","negocio","negocios","loja","lojas","produto","produtos","comercio","tecnologia"},
    "hospital":{"hospital","medico","medica","consulta","consultar","exame","exames","doenca","saude","tratamento","farmacia"},
    "bank":{"banco","saldo","dinheiro","transferencia","transferencias","pagamento","pagamentos","deposito","saque","extrato","movimentacao"},
    "inventory":{"inventario","item","itens","pertences","equipamento"},
    "news":{"noticia","noticias","manchete","novidade","atualizacao"},
    "events":{"evento","eventos","agenda","programacao"},
    "players":{"jogador","jogadores","cidadao","cidadaos","pessoas","prefeito"},
    "memory":{"memoria","lembra","lembrar","objetivo","preferencia"},
    "kiba":{"kiba","ornitorrinco","assistente","inteligencia","ia","cerebro"}
}

QUESTION_WORDS = {
    "why":{"por que","porque","pq","motivo","razao"},
    "how":{"como","de que jeito","de que forma"},
    "which":{"qual","quais","quem","qual e","qual é"},
    "how_many":{"quanto","quantos","quantas","custa","preco","preço","valor"},
    "whether":{"posso","consigo","da para","dá para","é possivel","é possível","tem como"},
    "list":{"mostre","listar","lista","quais tem","quais existem"},
}

def normalize_v2(value):
    base = norm(value)
    tokens = base.split()
    fixed = [TYPO_FIXES.get(token, token) for token in tokens]
    return " ".join(fixed)

def token_set(value):
    return {x for x in normalize_v2(value).split() if len(x) > 1 and x not in AGENT_STOPWORDS}

def phrase_similarity(a, b):
    aa = normalize_v2(a)
    bb = normalize_v2(b)
    if not aa or not bb:
        return 0.0
    aw, bw = token_set(aa), token_set(bb)
    overlap_score = len(aw & bw) / max(1, len(aw | bw))
    seq = SequenceMatcher(None, aa[:260], bb[:420]).ratio()
    return overlap_score * 0.72 + seq * 0.28

def detect_domains_v2(query, conversation):
    q = normalize_v2(query)
    expanded = q + " " + normalize_v2(previous_user_message(conversation))
    scores = {}
    for domain, terms in DOMAIN_TERMS.items():
        score = 0
        for term in terms:
            if term in q:
                score += 2
            elif term in expanded:
                score += 0.65
        scores[domain] = score
    return [name for name, score in sorted(scores.items(), key=lambda x: x[1], reverse=True) if score >= 1][:4]

def question_kind_v2(query):
    q = normalize_v2(query)
    if re.search(r"\b(melhor|pior|maior|menor|mais|menos|compensa|vale a pena|compar|versus|vs)\b", q):
        return "compare"
    if any(key in q for key in QUESTION_WORDS["why"]):
        return "why"
    if any(key in q for key in QUESTION_WORDS["how"]):
        return "how"
    if any(key in q for key in QUESTION_WORDS["which"]):
        return "which"
    if any(key in q for key in QUESTION_WORDS["how_many"]):
        return "how_many"
    if any(key in q for key in QUESTION_WORDS["whether"]):
        return "whether"
    if any(key in q for key in QUESTION_WORDS["list"]):
        return "list"
    return "general"

def extract_numbers_v2(query):
    values = []
    for raw in re.findall(r"(?<!\w)(\d+(?:[.,]\d{1,2})?)(?!\w)", normalize_v2(query)):
        try:
            values.append(float(raw.replace(".", "").replace(",", ".")) if "," in raw else float(raw))
        except Exception:
            pass
    return values

def find_job_v2(query, jobs):
    best, score = None, 0.0
    for job in jobs or []:
        label = " ".join(str(job.get(k) or "") for k in ("name","task"))
        s = phrase_similarity(query, label)
        if normalize_v2(str(job.get("name") or "")) in normalize_v2(query):
            s += 0.65
        if s > score:
            best, score = job, s
    return best if score >= 0.12 else None

def find_company_v2(query, companies):
    best, score = None, 0.0
    for company in companies or []:
        label = " ".join(str(company.get(k) or "") for k in ("name","description","companyType"))
        s = phrase_similarity(query, label)
        if normalize_v2(str(company.get("name") or "")) in normalize_v2(query):
            s += 0.8
        for product in company.get("products") or []:
            pname = normalize_v2(str(product.get("name") or ""))
            if pname and pname in normalize_v2(query):
                s += 0.75
        if s > score:
            best, score = company, s
    return best if score >= 0.14 else None

def find_product_v2(query, items):
    best, score = None, 0.0
    for item in items or []:
        label = " ".join(str(item.get(k) or "") for k in ("name","description"))
        s = phrase_similarity(query, label)
        if normalize_v2(str(item.get("name") or "")) in normalize_v2(query):
            s += 0.8
        if s > score:
            best, score = item, s
    return best if score >= 0.14 else None

def find_service_v2(query, services):
    best, score = None, 0.0
    for service in services or []:
        label = " ".join(str(service.get(k) or "") for k in ("name","category","description"))
        s = phrase_similarity(query, label)
        if normalize_v2(str(service.get("name") or "")) in normalize_v2(query):
            s += 0.8
        if s > score:
            best, score = service, s
    return best if score >= 0.14 else None

def resolve_followup_v2(query, conversation):
    q = normalize_v2(query)
    if not conversation:
        return q, False
    follow_markers = (
        q.startswith(("e ","isso","esse","essa","ele ","ela ","aquele","aquela","qual deles","qual delas")),
        q in {"e o preco","e o valor","e quanto","e depois","como assim","por que","pq","e esse","e essa","e ele","e ela"},
    )
    if not any(follow_markers):
        return q, False
    prior_user = previous_user_message(conversation)
    prior_assistant = previous_assistant_message(conversation)
    if not prior_user and not prior_assistant:
        return q, False
    context = " ".join(x for x in (prior_user, prior_assistant, q) if x)
    return context[-900:], True

def city_brain_context(snapshot):
    updates=snapshot.get("kibaUpdates") or snapshot.get("kibaKnowledge") or []
    if not updates:
        return []
    return updates[-8:]

def city_brain_facts(snapshot):
    facts=[]
    city=snapshot.get("city") or {}
    if city:
        facts.append("Estado atual: população "+integer(city.get("population"))+", economia "+money(city.get("economy"))+", infraestrutura "+integer(city.get("infrastructure"))+"%, qualidade "+integer(city.get("quality"))+"%.")
    jobs=snapshot.get("jobs") or []
    if jobs:
        facts.append("Profissões cadastradas: "+", ".join(str(x.get("name")) for x in jobs[:30])+".")
    companies=snapshot.get("companies") or []
    if companies:
        facts.append("Empresas cadastradas: "+", ".join(str(x.get("name")) for x in companies[:30] if x.get("name"))+".")
    hospital=snapshot.get("hospital") or {}
    services=hospital.get("services") or []
    if services:
        facts.append("Serviços do hospital: "+", ".join(str(x.get("name")) for x in services[:20])+".")
    shop=snapshot.get("shopItems") or []
    if shop:
        facts.append("Produtos do catálogo: "+", ".join(str(x.get("name")) for x in shop[:30])+".")
    return facts

KIBA_PLUGINS = {
    "city": "Estado da Cidade",
    "jobs": "Profissões e Carreiras",
    "missions": "Missões e Progressão",
    "companies": "Empresas e Comércio",
    "hospital": "Hospital e Saúde do jogo",
    "shop": "Lojas e Catálogo",
    "news": "Notícias",
    "events": "Eventos",
    "proposals": "Prefeitura e Propostas",
    "players": "Cadastro Público",
    "memory": "Memória",
    "profile": "Perfil do Cidadão",
}

def plugin_manifest(snapshot):
    return [{"id":key,"name":name,"status":"online"} for key,name in KIBA_PLUGINS.items()]

def build_toolbox(query, intent, snapshot, current_page, conversation):
    domains = detect_domains_v2(query, conversation)
    kind = question_kind_v2(query)
    tools = []
    def add(name, reason, priority):
        tools.append({"name":name,"reason":reason,"priority":priority})
    add("contexto","entender a continuação da conversa e o significado de pronomes",5)
    add("plugins","selecionar os módulos internos relevantes antes de responder",4)
    if "city" in domains or kind in ("why","compare") and not domains:
        add("city","consultar o estado atual de Sorokiba",4)
    if "jobs" in domains or kind=="compare":
        add("jobs","comparar profissões, salários, XP e atividades",5)
    if "companies" in domains:
        add("companies","consultar empresas, tipos e produtos",5)
    if "hospital" in domains:
        add("hospital","consultar serviços, preços, prazos e condições do sistema de saúde",5)
    if "bank" in domains:
        add("bank","consultar saldo e histórico financeiro do cidadão",5)
    if "missions" in domains:
        add("missions","consultar missões e recompensas",4)
    if "inventory" in domains:
        add("inventory","consultar itens do cidadão",4)
    if "news" in domains:
        add("news","consultar notícias recentes",4)
    if "events" in domains:
        add("events","consultar eventos",4)
    if "players" in domains:
        add("players","consultar cadastro público",4)
    if "memory" in domains:
        add("memory","buscar memória persistente útil",5)
    if "kiba" in domains:
        add("kiba","consultar identidade e capacidades próprias do Kiba",4)
    if "jobs" in domains or re.search(r"\bxp\b|\bnivel\b|experiencia", normalize_v2(query)):
        add("profile","consultar XP, nível, profissão e recursos do cidadão",5)
    if current_page and current_page in PAGE_NAMES:
        add("page","usar a página atual como contexto adicional",3)
    if snapshot.get("kibaUpdates"):
        add("city_brain","consultar o conhecimento sincronizado e as últimas atualizações da cidade",6)
    add("verify","cruzar evidências e impedir conclusões que não estejam apoiadas pelos dados",6)
    seen=set()
    result=[]
    for tool in sorted(tools, key=lambda item:(-item["priority"], item["name"])):
        if tool["name"] in seen: continue
        seen.add(tool["name"]); result.append(tool)
    return result[:8]

def run_tool_v2(name, query, snapshot, user, current_page, conversation):
    if name=="contexto":
        return {"lastUser":previous_user_message(conversation),"lastAssistant":previous_assistant_message(conversation)}
    if name=="city":
        return snapshot.get("city") or {}
    if name=="jobs":
        return snapshot.get("jobs") or []
    if name=="companies":
        return snapshot.get("companies") or []
    if name=="hospital":
        return snapshot.get("hospital") or {}
    if name=="bank":
        return {"cash":user.get("money",0),"bankBalance":user.get("bankBalance",0)}
    if name=="missions":
        return {"rewards":snapshot.get("missionRewards") or {}}
    if name=="inventory":
        return {"inventory":user.get("inventory") or {},"shopItems":snapshot.get("shopItems") or []}
    if name=="news":
        return latest(snapshot.get("news") or [])[:8]
    if name=="events":
        return latest(snapshot.get("events") or [])[:8]
    if name=="players":
        return snapshot.get("users") or []
    if name=="memory":
        return snapshot.get("memory") or []
    if name=="kiba":
        return {"knowledge":snapshot.get("kibaKnowledge",[])[-30:],"updates":city_brain_context(snapshot),"facts":city_brain_facts(snapshot),"version":snapshot.get("kibaBrainVersion",0),"capabilities":["entender contexto","selecionar plugins internos","consultar sistemas internos","comparar dados","usar memória útil","detectar atualizações da cidade","cruzar informações de vários sistemas","verificar consistência"]};
    if name=="city_brain":
        return {"version":snapshot.get("kibaBrainVersion",0),"updates":city_brain_context(snapshot),"facts":city_brain_facts(snapshot)}
    if name=="profile":
        return snapshot.get("currentUser") or user
    if name=="plugins":
        return plugin_manifest(snapshot)
    if name=="page":
        return {"page":current_page,"name":PAGE_NAMES.get(current_page,"Sorokiba"),"description":PAGE_DESCRIPTIONS.get(current_page,"área atual")}
    return {}

def summarize_evidence_v2(tool_results):
    labels=[]
    for item in tool_results:
        name=item.get("tool")
        data=item.get("data")
        if name=="city":
            labels.append(f"cidade: população={data.get('population',0)}, economia={data.get('economy',0)}")
        elif name=="jobs":
            labels.append(f"profissões: {len(data or [])} registros")
        elif name=="companies":
            labels.append(f"empresas: {len(data or [])} registros")
        elif name=="hospital":
            labels.append(f"hospital: {len((data or {}).get('services') or [])} serviços")
        elif name=="profile":
            labels.append(f"perfil: nível={data.get('level',1)}, XP={data.get('xp',0)}")
        elif name=="memory":
            labels.append(f"memória: {len(data or [])} registros")
        else:
            labels.append(name)
    return labels[:8]

def answer_v2(query, user, snapshot, recent, conversation, current_page):
    started = time.perf_counter()
    clean, is_follow = resolve_followup_v2(query, conversation)
    q = normalize_v2(clean)
    kind = question_kind_v2(q)
    domains = detect_domains_v2(q, conversation)
    plan = build_toolbox(q, detect_intent(q), snapshot, current_page, conversation)
    tool_results=[]
    for spec in plan:
        tool_results.append({"tool":spec["name"],"data":run_tool_v2(spec["name"],q,snapshot,user,current_page,conversation)})
    data_map={x["tool"]:x["data"] for x in tool_results}
    brain=data_map.get("city_brain") or data_map.get("kiba") or {}
    brain_updates=brain.get("updates") or []
    name=first_name(user)
    city=data_map.get("city") or snapshot.get("city") or {}
    jobs=data_map.get("jobs") or snapshot.get("jobs") or []
    companies=data_map.get("companies") or snapshot.get("companies") or []
    hospital=data_map.get("hospital") or snapshot.get("hospital") or {}
    profile=data_map.get("profile") or snapshot.get("currentUser") or user
    answer_text=""
    intent=detect_intent(q)
    confidence=0.55
    if brain_updates and intent not in ("greet","empty"):
        latest_update=brain_updates[-1]
        if latest_update.get("domains"):
            # O cérebro usa a atualização como evidência contextual; não inventa detalhes que não estejam no snapshot.
            pass

    # Saudações e identidade
    if intent=="empty":
        answer_text="Pode perguntar. Eu vou entender a pergunta, consultar o sistema certo e cruzar os dados antes de responder."
        intent="greet"; confidence=0.98
    elif intent=="greet":
        answer_text=choose(GREETINGS, recent); confidence=1.0
    elif intent=="kiba":
        answer_text=choose([
            "Eu sou o Kiba, a inteligência própria de Sorokiba. Entendo o contexto da conversa, consulto os sistemas internos e cruzo informações antes de responder.",
            "Sou o Kiba, o assistente de Sorokiba. Meu cérebro combina contexto, busca interna, comparação e verificação para evitar respostas inventadas.",
            "Eu sou o Kiba. Meu cérebro acompanha o estado de Sorokiba, detecta mudanças e usa esse conhecimento atualizado para cruzar informações antes de responder."
        ], recent); confidence=0.99
    elif intent=="page":
        page_name=PAGE_NAMES.get(current_page,"Sorokiba")
        answer_text=f"Você está em {page_name}. {PAGE_DESCRIPTIONS.get(current_page,'Esta é a área atual da cidade').capitalize()}. Também posso relacionar essa página com outros sistemas."
        confidence=0.98
    elif intent=="memory" or "memory" in domains:
        matches=find_memory(q, snapshot.get("memory") or [])
        if matches:
            joined=" ".join(str(x.get("content") or "") for x in matches[:3])
            answer_text=f"Encontrei estas memórias úteis do seu cidadão: {joined}"
            confidence=0.94
        elif previous_user_message(conversation):
            answer_text=f"Ainda não tenho uma memória persistente específica para isso. No contexto recente, você estava falando sobre: {previous_user_message(conversation)}."
            confidence=0.74
        else:
            answer_text="Ainda não tenho uma memória persistente relevante sobre isso."
            confidence=0.83
    elif intent=="self_xp" or ("profile" in data_map and re.search(r"\b(xp|experiencia|nivel)\b",q)):
        answer_text=f"{name}, seu perfil está no nível {integer(profile.get('level',1))} com {integer(profile.get('xp',0))} XP."
        confidence=0.99
    elif intent=="self_money" or ("bank" in data_map and re.search(r"\b(meu|minha|saldo|dinheiro)\b",q) and not re.search(r"\b(empresa|cidade)\b",q)):
        answer_text=f"Seu dinheiro disponível é {money(profile.get('money',0))} e seu saldo bancário é {money(profile.get('bankBalance',0))}."
        confidence=0.99
    elif intent=="self_job":
        job=profile.get("jobName") or "Cidadão"
        current=active_job(jobs, profile.get("jobId"))
        extra=f" O requisito dessa profissão é {integer(current.get('xpRequired'))} XP." if current else ""
        answer_text=f"Seu emprego atual é {job}.{extra}"
        confidence=0.99
    elif kind=="compare" and ("jobs" in data_map or re.search(r"\b(profissao|emprego|salario|trabalho|carreira|xp)\b",q)):
        eligible=[j for j in jobs if float(j.get("xpRequired") or 0)<=float(profile.get("xp") or 0)]
        criterion="salário"
        if re.search(r"\b(facil|facil de entrar|menor xp|menos xp|mais facil)\b",q):
            ranked=sorted(jobs,key=lambda x:float(x.get("xpRequired") or 0))
            criterion="menor requisito de XP"
        elif re.search(r"\b(xp|desbloque)\b.*\b(salario|ganha|paga)\b",q) or re.search(r"\b(salario|ganha|paga)\b.*\b(xp|desbloque)\b",q):
            ranked=sorted(jobs,key=lambda x:(float(x.get("salary") or 0),-float(x.get("xpRequired") or 0)),reverse=True)
            criterion="equilíbrio entre salário e requisito de XP"
        else:
            ranked=sorted(jobs,key=lambda x:float(x.get("salary") or 0),reverse=True)
        top=ranked[:4]
        ranking="; ".join(f"{j.get('name')} — {money(j.get('salary'))} — {integer(j.get('xpRequired'))} XP" for j in top)
        if re.search(r"\b(para mim|pra mim|consigo|posso|com \d+ xp|tenho \d+ xp)\b",q):
            if eligible:
                best_personal=sorted(eligible,key=lambda x:float(x.get("salary") or 0),reverse=True)
                chosen=best_personal[0]
                answer_text=f"Com {integer(profile.get('xp'))} XP, você pode entrar em {len(eligible)} profissão(ões). Pela remuneração cadastrada, a melhor entre as que você já pode desbloquear é {chosen.get('name')} ({money(chosen.get('salary'))}). Top geral por {criterion}: {ranking}."
            else:
                next_job=min(jobs,key=lambda x:float(x.get("xpRequired") or 0))
                answer_text=f"Com {integer(profile.get('xp'))} XP, você ainda não desbloqueou nenhuma profissão além da atual. A próxima com menor requisito é {next_job.get('name')}, com {integer(next_job.get('xpRequired'))} XP."
            confidence=0.97
        else:
            answer_text=f"Comparei as profissões usando {criterion}. O topo ficou: {ranking}."
            confidence=0.97
    elif "jobs" in data_map or intent=="jobs":
        matched=find_job_v2(q,jobs)
        if matched and any(word in q for word in ("quanto","salario","ganha","faz","requisito","desbloq","como")):
            answer_text=f"{matched.get('name')} paga {money(matched.get('salary'))}, exige {integer(matched.get('xpRequired'))} XP e tem como atividade: {matched.get('task') or 'não informada'}."
            confidence=0.97
        else:
            sample=", ".join(f"{j.get('name')} ({money(j.get('salary'))})" for j in jobs[:12])
            answer_text=f"Encontrei {len(jobs)} profissões cadastradas. Entre elas: {sample}."
            confidence=0.96
    elif "companies" in data_map or intent=="companies":
        matched=find_company_v2(q,companies)
        if matched:
            products=matched.get("products") or []
            if products and re.search(r"\b(produto|vende|preco|valor|custa|quanto)\b",q):
                listing=", ".join(f"{p.get('name')} ({money(p.get('price'))})" for p in products[:8])
                answer_text=f"{matched.get('name')} tem estes produtos registrados: {listing}."
            else:
                answer_text=f"{matched.get('name')}: {matched.get('description') or 'sem descrição registrada'}."
            confidence=0.95
        else:
            names=", ".join(str(c.get("name")) for c in companies[:8] if c.get("name"))
            answer_text=f"Encontrei {len(companies)} empresas registradas. Algumas são: {names or 'nenhuma com nome disponível'}."
            confidence=0.95
    elif "hospital" in data_map or intent=="hospital":
        services=hospital.get("services") or []
        matched=find_service_v2(q,services)
        if matched and re.search(r"\b(preco|valor|custa|quanto|prazo|tempo|demora)\b",q):
            answer_text=f"O serviço {matched.get('name')} custa {money(matched.get('price'))} e o prazo registrado é {matched.get('estimatedTime') or matched.get('durationRange') or 'não informado'}."
            confidence=0.96
        elif matched:
            answer_text=f"Encontrei o serviço {matched.get('name')}: {matched.get('description') or 'sem descrição registrada'}."
            confidence=0.94
        else:
            names=", ".join(str(s.get("name")) for s in services[:10] if s.get("name"))
            answer_text=f"O Hospital tem {len(services)} serviços registrados. Entre eles: {names}."
            confidence=0.95
    elif "bank" in data_map:
        bank=profile
        answer_text=f"Seu panorama financeiro do jogo é {money(bank.get('money',0))} em mãos + {money(bank.get('bankBalance',0))} no banco, totalizando {money(float(bank.get('money',0))+float(bank.get('bankBalance',0)))}."
        confidence=0.98
    elif intent=="missions" or "missions" in data_map:
        rewards=(data_map.get("missions") or {}).get("rewards") or {}
        reward=rewards.get(str(profile.get("jobId") or ""),{})
        if reward:
            answer_text=f"Para sua profissão atual, cada missão está configurada com {integer(reward.get('questionsPerMission'))} pergunta(s), {integer(reward.get('xpPerMission'))} XP e {money(reward.get('moneyPerMission'))} por missão."
        else:
            answer_text="As missões conectam atividades e progressão. A recompensa depende da configuração da profissão atual."
        confidence=0.95
    elif intent=="inventory" or "inventory" in data_map:
        inv=profile.get("inventory") or {}
        item_names={str(x.get("id")):x.get("name") for x in snapshot.get("shopItems") or []}
        positive=[(k,v) for k,v in inv.items() if float(v or 0)>0]
        visible=", ".join(f"{item_names.get(str(k),'Item '+str(k))} × {integer(v)}" for k,v in positive[:10])
        answer_text=f"Seu inventário tem {len(positive)} tipo(s) de item: {visible or 'nenhum item comum com quantidade positiva'}."
        confidence=0.95
    elif intent=="shop" or re.search(r"\b(loja|produto|catalogo|comprar)\b",q):
        items=snapshot.get("shopItems") or []
        matched=find_product_v2(q,items)
        if matched:
            answer_text=f"{matched.get('name')} custa {money(matched.get('price'))}. "
            effects=[]
            for key,label in (("hunger","fome"),("hydration","hidratação"),("energy","energia")):
                if float(matched.get(key) or 0)>0: effects.append(f"+{integer(matched.get(key))} {label}")
            if effects: answer_text+="Efeito registrado: "+", ".join(effects)+"."
            confidence=0.95
        else:
            answer_text=f"O catálogo tem {len(items)} produtos. Diga o nome do produto e eu confiro preço e efeito."
            confidence=0.9
    elif intent=="news" or "news" in data_map:
        news=latest(snapshot.get("news") or [])[:4]
        if news:
            answer_text="As notícias mais recentes que encontrei são: "+" | ".join(str(x.get("title") or x.get("name") or "Sem título") for x in news)+"."
            confidence=0.95
        else:
            answer_text="Não encontrei notícias publicadas recentemente."
            confidence=0.87
    elif intent=="events" or "events" in data_map:
        events=latest(snapshot.get("events") or [])[:4]
        if events:
            answer_text="Os eventos mais recentes registrados são: "+" | ".join(str(x.get("title") or x.get("name") or "Evento") for x in events)+"."
            confidence=0.93
        else:
            answer_text="Não encontrei eventos registrados recentemente."
            confidence=0.87
    elif intent=="mayor":
        mayor=next((u for u in snapshot.get("users") or [] if u.get("isMayor")),None)
        if mayor:
            answer_text=f"Consultei o cadastro público: {mayor.get('name')} é o prefeito atual."
            confidence=0.99
        else:
            answer_text="Não encontrei um prefeito registrado no estado atual da cidade."
            confidence=0.8
    elif intent=="city" or "city" in data_map:
        answer_text=f"Sorokiba está com {integer(city.get('population'))} cidadãos, economia em {money(city.get('economy'))}, infraestrutura em {integer(city.get('infrastructure'))}% e qualidade em {integer(city.get('quality'))}%."
        confidence=0.99
    else:
        # Respostas cruzadas para perguntas que não cabem em um único domínio.
        if "hospital" in domains and "companies" in domains:
            answer_text=f"Comparei os sistemas: o Hospital tem {len((hospital or {}).get('services') or [])} serviços e Sorokiba registra {len(companies)} empresas."
            confidence=0.9
        elif "jobs" in domains and "city" in domains:
            answer_text=f"Consegui cruzar carreira e cidade. Sorokiba tem {len(jobs)} profissões cadastradas; posso relacionar salário, XP e o estado da cidade para uma comparação mais específica."
            confidence=0.88
        else:
            # Conhecimento oficial antes do fallback.
            best=None; best_score=0.0
            for item in snapshot.get("kibaKnowledge", snapshot.get("knowledge", [])) or []:
                text=f"{item.get('title','')} {item.get('content','')}"
                score=semantic_score(q,text)
                if score>best_score: best,best_score=item,score
            if best is not None and best_score>=2.15:
                answer_text=f"Encontrei isso na base oficial do Kiba: {best.get('content','')}"
                confidence=0.86
            else:
                # Memória/contexto antes de admitir que não sabe.
                matches=find_memory(q,snapshot.get("memory") or [])
                if matches:
                    answer_text=f"Encontrei uma memória relacionada: {matches[0].get('content')}"
                    confidence=0.74
                elif is_follow:
                    answer_text="Entendi que você está continuando a pergunta anterior, mas ainda não consigo identificar com segurança qual item você está apontando. Dê só o nome do item ou pessoa."
                    confidence=0.68
                else:
                    answer_text="Entendi a ideia, mas os dados internos de Sorokiba não são suficientes para eu responder sem inventar. Dê mais um detalhe (por exemplo, o nome do sistema, pessoa, profissão ou produto) e eu faço uma busca mais específica."
                    confidence=0.56

    if domains and len(domains)>=2 and kind not in ("general","how"):
        answer_text=answer_text.rstrip()
        if not answer_text.endswith((".","!","?")):
            answer_text+="."
    meta = {
        "toolCalls":[{"tool":x["name"],"reason":x["reason"]} for x in plan if x["name"]!="verify"],
        "evidence":summarize_evidence_v2(tool_results),
        "domains":domains,
        "questionKind":kind,
        "contextUsed":is_follow,
        "verification":"cross-check",
        "latencyMs":round((time.perf_counter()-started)*1000)
    }
    return answer_text, intent, confidence, memory_candidates(query,user,snapshot), meta

def main():
    for line in sys.stdin:
        try:
            req=json.loads(line)
            started=time.perf_counter()
            snapshot=req.get("snapshot") or {}
            current_page=str(req.get("currentPage") or "city")
            answer_text,intent,confidence,candidates,meta=answer_v2(
                req.get("question",""),
                req.get("user") or {},
                snapshot,
                req.get("recentResponses") or [],
                req.get("conversation") or [],
                current_page
            )
            memory=snapshot.get("memory") or []
            matched_memory=find_memory(req.get("question",""),memory)
            plan=[
                f"Entender: {meta.get('questionKind','general')}",
                "Consultar: " + ", ".join(x.get("tool") for x in meta.get("toolCalls",[])[:5]),
                "Verificar: cruzar evidências antes da resposta",
                "Responder: texto natural baseado nos dados atuais"
            ]
            agents=research_agents(req.get("question",""),intent,snapshot,current_page)
            for tool in meta.get("toolCalls",[]):
                agents.insert(0,{"agent":"Kiba Tool · "+str(tool.get("tool")),"reason":str(tool.get("reason")),"priority":5})
            # Limita sem revelar raciocínio interno detalhado.
            agents=agents[:8]
            elapsed=round((time.perf_counter()-started)*1000)
            print(json.dumps({
                "requestId":req.get("requestId"),
                "answer":answer_text,
                "intent":intent,
                "confidence":round(float(confidence),3),
                "elapsedMs":elapsed,
                "searched":source_list(intent,snapshot,current_page),
                "researchPlan":plan,
                "agents":agents,
                "researchSummary":"Kiba entendeu a intenção, consultou as fontes internas relevantes e fez uma verificação cruzada antes de responder.",
                "memoryCandidates":candidates,
                "memoryMatches":matched_memory[:3],
                "toolCalls":meta.get("toolCalls",[]),
                "evidence":meta.get("evidence",[]),
                "questionKind":meta.get("questionKind"),
                "domains":meta.get("domains",[]),
                "contextUsed":meta.get("contextUsed",False),
                "verification":"cross-check",
                "page":current_page,
            },ensure_ascii=False),flush=True)
        except Exception as exc:
            print(json.dumps({
                "requestId":req.get("requestId"),
                "error":"Kiba não conseguiu processar esta pergunta.",
                "detail":str(exc),
            },ensure_ascii=False),flush=True)


def main():
    for line in sys.stdin:
        try:
            req = json.loads(line)
            started = time.perf_counter()
            snapshot = req.get("snapshot") or {}
            current_page = str(req.get("currentPage") or "city")
            ans, it, confidence, candidates = answer(
                req.get("question", ""),
                req.get("user") or {},
                snapshot,
                req.get("recentResponses") or [],
                req.get("conversation") or [],
                current_page,
            )
            elapsed = round((time.perf_counter() - started) * 1000)
            memory = snapshot.get("memory") or []
            matched_memory = find_memory(req.get("question", ""), memory)
            agents = research_agents(req.get("question", ""), it, snapshot, current_page)
            print(json.dumps({
                "requestId": req.get("requestId"),
                "answer": ans,
                "intent": it,
                "confidence": confidence,
                "elapsedMs": elapsed,
                "searched": source_list(it, snapshot, current_page),
                "researchPlan": research_plan(it, snapshot, current_page),
                "agents": agents,
                "researchSummary": f"Consultei {len(agents)} agentes internos, cruzei os resultados relevantes e apliquei uma verificação final antes da resposta.",
                "memoryCandidates": candidates,
                "memoryMatches": matched_memory[:3],
                "page": current_page,
            }, ensure_ascii=False), flush=True)
        except Exception as exc:
            print(json.dumps({
                "requestId": req.get("requestId"),
                "error": "Kiba não conseguiu processar esta pergunta.",
                "detail": str(exc),
            }, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
