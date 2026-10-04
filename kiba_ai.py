#!/usr/bin/env python3
"""
Kiba Brain — inteligência proprietária do Sorokiba.
Sem OpenAI, Gemini, Claude ou qualquer API externa.
Protocolo: uma entrada JSON por linha -> uma saída JSON por linha.
"""
import sys, json, re, random, time, unicodedata
from difflib import SequenceMatcher
from collections import Counter

SYNONYMS = {
    "prefeito": {"prefeito","prefeitura","governante","prefeita"},
    "dinheiro": {"dinheiro","saldo","grana","moeda","financeiro","financas","financeira"},
    "emprego": {"emprego","trabalho","profissao","carreira","cargo","oficio"},
    "missoes": {"missao","missoes","atividade","atividades","objetivo","objetivos"},
    "cidade": {"cidade","sorokiba","populacao","economia","infraestrutura","qualidade"},
    "empresas": {"empresa","empresas","negocio","negocios","loja","lojas","comercio"},
    "hospital": {"hospital","medico","medica","consulta","consultar","exame","exames","doenca","saude"},
    "noticias": {"noticia","noticias","manchete","manchetes","novidade","novidades","atualizacao","atualizacoes"},
    "eventos": {"evento","eventos","agenda"},
    "inventario": {"inventario","item","itens","produto","produtos","pertences"},
    "xp": {"xp","experiencia","nivel","nivell","progressao","progresso"},
    "kiba": {"kiba","ornitorrinco","mascote","assistente","inteligencia","ia"},
}

INTENT_PATTERNS = {
    "self_xp": [
        r"(meu|minha).{0,30}\b(xp|experiencia|nivel)\b",
        r"\b(xp|experiencia)\b.{0,30}\btenho\b",
    ],
    "self_money": [
        r"(meu|minha).{0,30}\b(dinheiro|saldo|grana)\b",
        r"quanto.{0,20}\b(dinheiro|saldo)\b.*\btenho\b",
    ],
    "self_job": [r"(meu|minha).{0,30}\b(emprego|profissao|trabalho|carreira|cargo)\b"],
    "mayor": [r"\b(prefeito|prefeita|prefeitura)\b"],
    "city": [r"\b(populacao|economia|infraestrutura|qualidade)\b", r"(como|qual).{0,20}\b(cidade|sorokiba)\b"],
    "missions": [r"\b(missao|missoes)\b", r"(como|o que).{0,30}\bmissoes?\b"],
    "jobs": [r"\b(profissao|profissoes|emprego|empregos|carreira|salario|salarios)\b"],
    "companies": [r"\b(empresa|empresas|negocio|negocios|loja|lojas)\b"],
    "hospital": [r"\b(hospital|consulta|exame|exames|medico|saude|doenca)\b"],
    "news": [r"\b(noticia|noticias|manchete|novidade|novidades|atualizacao)\b"],
    "events": [r"\b(evento|eventos|agenda)\b"],
    "inventory": [r"\b(inventario|item|itens|pertences)\b"],
    "kiba": [r"\b(kiba|ornitorrinco|mascote|assistente)\b"],
    "help": [r"\b(ajuda|bug|erro|problema|travou|travando)\b"],
}

VARIANTS = {
    "greet": [
        "Oi! Eu sou o Kiba. Estou pronto para pesquisar os dados atuais de Sorokiba.",
        "Olá! Pode perguntar. Vou consultar o que estiver registrado na cidade antes de responder.",
        "Oi! Vamos descobrir isso juntos. Eu posso consultar os sistemas de Sorokiba."
    ],
    "help": [
        "Posso pesquisar Cidade, Emprego, Missões, Inventário, Lojas, Empresas, Hospital, Banco, Notícias e Eventos.",
        "Me diga o que você quer descobrir e eu procuro nos dados atuais de Sorokiba.",
        "Posso cruzar informações de vários sistemas da cidade para chegar a uma resposta mais útil."
    ],
    "unknown": [
        "Procurei nos dados disponíveis, mas ainda não encontrei evidência suficiente para responder sem inventar.",
        "Essa informação não está clara no conhecimento atual de Sorokiba. Posso pesquisar melhor se você acrescentar um detalhe.",
        "Ainda não tenho dados suficientes para responder com confiança. Prefiro não inventar."
    ],
}

def norm(s):
    s = unicodedata.normalize("NFD", str(s or "").lower())
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = re.sub(r"[^a-z0-9? ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def words(s):
    return [w for w in norm(s).split() if len(w) > 1]

def overlap(a,b):
    A=set(words(a)); B=set(words(b))
    return len(A & B)

def semantic_score(q,text):
    qn=norm(q); tn=norm(text)
    score=overlap(qn,tn)*1.0
    for group in SYNONYMS.values():
        if any(w in qn.split() for w in group) and any(w in tn.split() for w in group):
            score += 1.8
    score += SequenceMatcher(None, qn[:160], tn[:320]).ratio()*0.8
    return score

def intent(q):
    s=norm(q)
    if not s: return "empty"
    for key,pats in INTENT_PATTERNS.items():
        if any(re.search(p,s) for p in pats): return key
    if re.match(r"^(oi|ola|e ai|hey|hello|bom dia|boa tarde|boa noite)\b",s):
        return "greet"
    return "general"

def money(v):
    try: return f"R$ {float(v or 0):,.2f}".replace(",","X").replace(".",",").replace("X",".")
    except Exception: return "R$ 0,00"

def number(v):
    try: return f"{float(v):,.0f}".replace(",","X").replace(".",",").replace("X",".")
    except Exception: return "0"

def choose(options,recent):
    unused=[x for x in options if x not in recent]
    pool=unused or options
    return random.choice(pool)

def latest(items):
    if not isinstance(items,list): return []
    return sorted(items,key=lambda x:str(x.get("createdAt") or x.get("date") or x.get("updatedAt") or ""),reverse=True)

def source_list(kind,snapshot):
    mapping={
        "self_xp":["Seu perfil"],
        "self_money":["Seu perfil"],
        "self_job":["Seu perfil","Profissões"],
        "mayor":["Cadastro público"],
        "city":["Estado atual da cidade"],
        "missions":["Missões","Profissões e progressão"],
        "jobs":["Profissões e progressão"],
        "companies":["Empresas e lojas"],
        "hospital":["Hospital"],
        "news":["Notícias"],
        "events":["Eventos"],
        "inventory":["Seu inventário"],
        "kiba":["Conhecimento do Kiba"],
        "general":["Estado da cidade","Profissões","Empresas","Notícias","Eventos"],
    }
    result=[]
    for name in mapping.get(kind,["Estado da cidade"]):
        detail = {
            "Seu perfil":"XP, nível, dinheiro e profissão",
            "Estado atual da cidade":"População, economia, infraestrutura e qualidade",
            "Profissões e progressão":"Profissões, salários e XP necessário",
            "Empresas e lojas":"Empresas e produtos registrados",
            "Hospital":"Serviços e informações do hospital do jogo",
            "Notícias":"Publicações recentes",
            "Eventos":"Eventos registrados",
            "Missões":"Sistema de missões e progressão",
            "Seu inventário":"Itens registrados para o jogador",
            "Cadastro público":"Cidadãos e prefeito",
            "Conhecimento do Kiba":"Memórias oficiais ensinadas ao Kiba",
        }.get(name,"Dados internos de Sorokiba")
        result.append({"name":name,"detail":detail})
    return result

def research_plan(kind,snapshot):
    names = {
        "self_xp":["Perfil do cidadão"],
        "self_money":["Perfil financeiro"],
        "self_job":["Perfil do cidadão","Profissões"],
        "mayor":["Cadastro público"],
        "city":["Estado atual da cidade"],
        "missions":["Missões","Profissões e progressão"],
        "jobs":["Profissões e progressão"],
        "companies":["Empresas","Produtos e lojas"],
        "hospital":["Hospital"],
        "news":["Notícias recentes"],
        "events":["Eventos"],
        "inventory":["Inventário"],
        "kiba":["Memória do Kiba"],
        "followup":["Contexto da conversa"],
        "general":["Estado da cidade","Memória do Kiba","Sistemas de Sorokiba"],
        "help":["Sistemas de Sorokiba"]
    }
    return names.get(kind,["Sistemas de Sorokiba"])

def answer(q,user,snapshot,recent,conversation):
    it=intent(q)
    city=snapshot.get("city") or {}
    jobs=snapshot.get("jobs") or []
    companies=snapshot.get("companies") or []
    news=latest(snapshot.get("news") or [])
    events=latest(snapshot.get("events") or [])
    hospital=snapshot.get("hospital") or {}
    knowledge=snapshot.get("knowledge") or []
    users=snapshot.get("users") or []
    name=str(user.get("name") or "cidadão").split()[0]
    if it=="empty": return "Pode perguntar. Vou pesquisar os dados atuais de Sorokiba.",it,0.96
    if it=="greet": return choose(VARIANTS["greet"],recent),it,1.0
    if it=="help": return choose(VARIANTS["help"],recent),it,.95
    if it=="kiba":
        return choose([
            "Eu sou o Kiba, a inteligência virtual própria de Sorokiba. Fui criado para consultar os sistemas da cidade e conversar com você.",
            "Sou o Kiba. Meu cérebro consulta os dados do jogo, usa o contexto da conversa e tenta não inventar informações.",
            "Eu sou o Kiba, o assistente virtual de Sorokiba. Posso pesquisar vários sistemas da cidade antes de responder."
        ],recent),it,.99
    if it=="self_xp":
        return choose([
            f"{name}, consultei seu perfil: você está no nível {number(user.get('level',1))} com {number(user.get('xp',0))} XP.",
            f"Seu perfil registra {number(user.get('xp',0))} XP e nível {number(user.get('level',1))}.",
            f"Acabei de verificar seus dados: nível {number(user.get('level',1))} e {number(user.get('xp',0))} XP."
        ],recent),it,1.0
    if it=="self_money":
        return choose([
            f"Seu dinheiro disponível agora é {money(user.get('money',0))}.",
            f"Conferi seu perfil: você está com {money(user.get('money',0))} disponíveis.",
            f"Seu saldo em dinheiro no jogo está em {money(user.get('money',0))}."
        ],recent),it,1.0
    if it=="self_job":
        job=user.get("jobName") or "Cidadão"
        return choose([
            f"Seu emprego atual é {job}.",
            f"Consultei seu perfil: sua profissão atual é {job}.",
            f"Sua carreira está registrada como {job}."
        ],recent),it,.99
    if it=="mayor":
        mayor=next((u for u in users if u.get("isMayor")),None)
        if mayor:
            return choose([
                f"O prefeito registrado atualmente é {mayor.get('name')}.",
                f"Consultei o cadastro público de Sorokiba: {mayor.get('name')} é o prefeito atual.",
                f"Nos dados atuais da cidade, {mayor.get('name')} ocupa o cargo de prefeito."
            ],recent),it,.99
        return "Não encontrei um prefeito registrado nos dados atuais.",it,.7
    if it=="city":
        return choose([
            f"Sorokiba está com {number(city.get('population'))} cidadãos, economia em {money(city.get('economy'))}, infraestrutura em {number(city.get('infrastructure'))}% e qualidade em {number(city.get('quality'))}%.",
            f"Os dados atuais mostram população de {number(city.get('population'))}, economia de {money(city.get('economy'))}, infraestrutura de {number(city.get('infrastructure'))}% e qualidade de {number(city.get('quality'))}%.",
            f"A leitura mais recente da cidade é: {number(city.get('population'))} habitantes; economia {money(city.get('economy'))}; infraestrutura {number(city.get('infrastructure'))}%; qualidade {number(city.get('quality'))}%."
        ],recent),it,.99
    if it=="jobs":
        if not jobs: return "Não encontrei a lista de profissões no estado atual da cidade.",it,.7
        sample=", ".join(f"{j.get('name')} ({money(j.get('salary'))})" for j in jobs[:10])
        return f"Encontrei {len(jobs)} profissões cadastradas. Entre as que consultei estão: {sample}. O XP exigido varia conforme a profissão.",it,.96
    if it=="missions":
        return choose([
            "Missões são atividades de progressão que podem entregar XP e dinheiro. As disponíveis dependem da sua profissão e do estado atual do sistema.",
            "No Sorokiba, as missões conectam trabalho e progressão: você conclui atividades e recebe as recompensas configuradas para sua profissão.",
            "As missões são uma das principais formas de avançar no jogo. Posso consultar os dados atuais e explicar uma missão específica."
        ],recent),it,.94
    if it=="companies":
        if not companies: return "Não encontrei empresas registradas na cidade agora.",it,.9
        names=", ".join(str(c.get("name")) for c in companies[:8] if c.get("name"))
        return f"Encontrei {len(companies)} empresas registradas. Algumas são: {names}.",it,.95
    if it=="hospital":
        services=hospital.get("services") or []
        if not services:return "O Hospital está registrado, mas não encontrei serviços no momento.",it,.8
        names=", ".join(str(s.get("name")) for s in services[:6] if s.get("name"))
        return f"Consultei o Hospital e encontrei {len(services)} serviços. Entre eles: {names}. Os preços e prazos vêm do sistema atual.",it,.95
    if it=="news":
        if not news:return "Não encontrei notícias publicadas recentemente.",it,.86
        titles=[str(x.get("title") or x.get("name") or "Sem título") for x in news[:3]]
        return "Procurei as notícias mais recentes. "+ " | ".join(titles[:2]) + ".",it,.96
    if it=="events":
        if not events:return "Não encontrei eventos registrados recentemente.",it,.85
        titles=[str(x.get("title") or x.get("name") or "Evento") for x in events[:3]]
        return f"Encontrei {len(events)} eventos registrados. Os primeiros que consultei são: "+ " | ".join(titles[:3]) + ".",it,.9
    if it=="inventory":
        inv=user.get("inventory") or {}
        positive=[(k,v) for k,v in inv.items() if float(v or 0)>0]
        if not positive:return "Seu inventário não registra itens comuns no momento.",it,.95
        return "Consultei seu inventário e encontrei "+str(len(positive))+" tipo(s) de item com quantidade positiva.",it,.9
    if it=="general":
        s=norm(q)
        if ("salario" in s or "ganha" in s or "dinheiro" in s) and ("profissao" in s or "emprego" in s):
            if jobs:
                best=max(jobs,key=lambda j:float(j.get("salary") or 0))
                return f"Comparei as profissões cadastradas. Entre os salários que consultei, {best.get('name')} aparece com o maior valor listado: {money(best.get('salary'))}. O XP exigido é {number(best.get('xpRequired'))}.",it,.92
        if "empresa" in s and "tecnologia" in s and companies:
            tech=[c for c in companies if norm(c.get("companyType",""))=="tecnologia"]
            if tech:
                return f"Consultei as empresas e encontrei {len(tech)} classificada(s) como tecnologia. Os registros disponíveis permitem comparar essas empresas com as demais categorias.",it,.92
    # memory / semantic search
    best=None; best_score=0.0
    for item in knowledge:
        text=f"{item.get('title','')} {item.get('content','')}"
        score=semantic_score(q,text)
        if score>best_score:best_score=score;best=item
    if best and best_score>=2.3:
        return f"Encontrei uma informação registrada na memória do Kiba: {best.get('content','')}",it,.84
    # Contextual follow-up
    if conversation:
        previous=conversation[-1].get("content","")
        if norm(q) in {"e ele","e ela","e isso","e ai","e depois","como assim","por que"}:
            return f"Sobre o que você acabou de perguntar: {previous}. Acrescente um pouco mais do que você quer saber para eu consultar o dado certo.", "followup", .55
    return choose(VARIANTS["unknown"],recent),it,.48

def main():
    for line in sys.stdin:
        try:
            req=json.loads(line)
            started=time.perf_counter()
            ans,it,confidence=answer(req.get("question",""),req.get("user") or {},req.get("snapshot") or {},req.get("recentResponses") or [],req.get("conversation") or [])
            elapsed=round((time.perf_counter()-started)*1000)
            sources=source_list(it,req.get("snapshot") or {})
            plan=research_plan(it,req.get("snapshot") or {})
            print(json.dumps({
                "answer":ans,
                "intent":it,
                "confidence":confidence,
                "elapsedMs":elapsed,
                "searched":sources,
                "researchPlan":plan,
                "researchSummary":"Pergunta classificada como '"+it+"', dados internos relacionados foram consultados e a resposta foi montada a partir deles."
            },ensure_ascii=False),flush=True)
        except Exception as exc:
            print(json.dumps({"error":"Kiba não conseguiu processar esta pergunta.","detail":str(exc)},ensure_ascii=False),flush=True)

if __name__=="__main__":
    main()
