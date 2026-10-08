"""Memória contextual e memória explícita do cidadão."""
def recent_context(conversation,limit=8):
    out=[]
    for item in (conversation or [])[-limit:]:
        role="assistant" if item.get("role")=="assistant" else "user"
        content=str(item.get("content") or "").strip()[:500]
        if content: out.append({"role":role,"content":content})
    return out

def relevant_memories(question,memory,normalize,limit=5):
    q=set(normalize(question).split()); scored=[]
    for item in memory or []:
        text=str(item.get("content") or "")
        if not text: continue
        overlap=len(q & set(normalize(text).split()))
        if overlap: scored.append((overlap,int(item.get("importance") or 1),item))
    scored.sort(key=lambda x:(x[0],x[1]),reverse=True)
    return [x[2] for x in scored[:limit]]

def safe_memory_candidates(question,answer):
    q=str(question or "").strip(); low=q.lower()
    if not q or len(q)>180: return []
    if any(x in low for x in ("senha","password","token","cpf","rg","telefone","email","e-mail","endereco","endereço")): return []
    explicit=any(x in low for x in ("lembre que","lembra que","meu objetivo é","meu objetivo e","prefiro "))
    if not explicit: return []
    kind="goal" if "objetivo" in low else ("preference" if "prefiro" in low else "note")
    return [{"content":q,"kind":kind,"importance":4}]
