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
