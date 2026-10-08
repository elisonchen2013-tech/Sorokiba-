"""Interpretação local de linguagem para o Kiba."""
import re,unicodedata
STOP={"a","o","e","de","do","da","dos","das","um","uma","para","por","com","em","no","na","nos","nas","que","qual","como","me","meu","minha","eu","voce","vc","tem","tenho","isso","essa","esse","esta","está"}
ALIASES={
"city":{"cidade","sorokiba","populacao","habitantes","economia","infraestrutura","qualidade"},
"jobs":{"profissao","profissoes","emprego","empregos","trabalho","carreira","cargo","salario","salarios","xp","nivel"},
"missions":{"missao","missoes","atividade","atividades","objetivo","objetivos","recompensa","recompensas"},
"companies":{"empresa","empresas","negocio","negocios","comercio"},
"shop":{"loja","lojas","produto","produtos","comprar","preco","catalogo"},
"hospital":{"hospital","medico","medica","consulta","consultar","exame","exames","saude","doenca","tratamento"},
"bank":{"banco","saldo","dinheiro","grana","financeiro","financas","deposito","saque","transferencia"},
"news":{"noticia","noticias","manchete","novidade","novidades","atualizacao"},
"events":{"evento","eventos","agenda","programacao"},
"inventory":{"inventario","item","itens","pertences","equipamento"},
"pass":{"passe","citypass","balas","tickets","ticket","roleta","recompensas"},
"mayor":{"prefeito","prefeita","prefeitura","governo","governante"},
"kiba":{"kiba","ornitorrinco","assistente","inteligencia","ia","cerebro"},
"account":{"conta","perfil","avatar","personagem"}
}
def normalize(value):
    s=unicodedata.normalize("NFD",str(value or "")).encode("ascii","ignore").decode().lower()
    return re.sub(r"\s+"," ",re.sub(r"[^a-z0-9?%$.,:-]"," ",s)).strip()
def words(value): return [x for x in normalize(value).split() if x and x not in STOP]
def detect_kind(q):
    s=normalize(q)
    if re.search(r"\b(quantos|quantas|quanto|qual|quais)\b",s): return "count_or_lookup"
    if re.search(r"\b(por que|porque|como funciona|explique|explica|o que significa|qual a diferenca|diferença)\b",s): return "explanation"
    if re.search(r"\b(o que devo|o que posso|qual a melhor|me recomenda|vale a pena|como consigo|como faco|como fazer|devo)\b",s): return "recommendation"
    if re.search(r"\b(agora|atual|atualmente|hoje|neste momento|status)\b",s): return "live_status"
    if re.search(r"\b(onde|qual pagina|onde fica)\b",s): return "navigation"
    return "direct"
def detect_topic(q):
    s=set(words(q)); scores={t:len(s&aliases) for t,aliases in ALIASES.items()}; n=normalize(q)
    if re.search(r"\b(meu|minha)\b.*\b(xp|nivel|experiencia)\b",n): scores["jobs"]+=3
    if re.search(r"\b(meu|minha)\b.*\b(dinheiro|saldo|banco)\b",n): scores["bank"]+=3
    if re.search(r"\b(meu|minha)\b.*\b(inventario|item|itens)\b",n): scores["inventory"]+=3
    topic=max(scores,key=scores.get)
    return topic if scores[topic]>0 else "city"
def intent(q):
    n=normalize(q); kind=detect_kind(n); topic=detect_topic(n)
    if re.search(r"\b(oi|ola|bom dia|boa tarde|boa noite|e ai|hey)\b",n): return {"name":"greeting","topic":"kiba","kind":"direct","confidence":.99,"domains":["kiba"]}
    if re.search(r"\b(quem (e|eh) o kiba|o que (e|eh) o kiba)\b",n): return {"name":"about_kiba","topic":"kiba","kind":"explanation","confidence":.99,"domains":["kiba"]}
    if re.search(r"\b(meu|minha)\b.*\b(xp|nivel|experiencia)\b|\bquanto.*xp.*tenho\b",n): return {"name":"self_xp","topic":"jobs","kind":"count_or_lookup","confidence":.99,"domains":["jobs","account"]}
    if re.search(r"\b(meu|minha)\b.*\b(dinheiro|saldo|grana|banco)\b|\bquanto.*dinheiro.*tenho\b",n): return {"name":"self_money","topic":"bank","kind":"count_or_lookup","confidence":.99,"domains":["bank","account"]}
    if re.search(r"\b(meu|minha)\b.*\b(profissao|emprego|trabalho|carreira|cargo)\b",n): return {"name":"self_job","topic":"jobs","kind":"count_or_lookup","confidence":.99,"domains":["jobs","account"]}
    if re.search(r"\b(o que|qual).{0,30}\btenho\b",n) and "invent" in n: return {"name":"self_inventory","topic":"inventory","kind":"count_or_lookup","confidence":.97,"domains":["inventory","account"]}
    return {"name":topic,"topic":topic,"kind":kind,"confidence":.65 if topic!="city" else .45,"domains":[topic]}
def resolve_context(question,conversation):
    n=normalize(question)
    if not conversation or len(words(question))>2:return question
    last=next((str(x.get("content") or "") for x in reversed(conversation) if x.get("role")=="user"),"")
    if last and n in {"e isso","e esse","e essa","como assim","por que","porque","quanto","e depois","e ai"}: return last+" "+question
    return question
