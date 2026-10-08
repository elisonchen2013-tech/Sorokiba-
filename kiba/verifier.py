"""Verificação de respostas antes de enviar ao jogador."""
def verify(answer, evidence, confidence):
    text=str(answer or "").strip()
    problems=[]
    if not text: problems.append("empty")
    if len(text)>1800: text=text[:1797]+"..."
    # No factual claim should pretend certainty when there is no evidence.
    if not evidence and float(confidence)<0.8:
        confidence=min(float(confidence),0.65)
    status="confirmed" if evidence and float(confidence)>=0.85 else ("calculated" if evidence else "limited")
    return {"answer":text,"confidence":round(max(0,min(1,float(confidence))),3),"status":status,"problems":problems}
