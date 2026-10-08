"""Plugins internos: cada domínio lê o mesmo estado oficial enviado pelo servidor."""
from .knowledge import facts
def run(topic,snapshot,user):
    f=facts(snapshot)
    if topic=="city": return {"domain":"city","records":f["city"] if "city" in f else facts(snapshot)}
    if topic=="jobs": return {"domain":"jobs","count":len(f["jobs"]),"records":f["jobs"][:50]}
    if topic=="companies": return {"domain":"companies","count":len(f["companies"]),"records":f["companies"][:50]}
    if topic=="shop": return {"domain":"shop","count":len(f["shop"]),"records":f["shop"][:50]}
    if topic=="hospital": return {"domain":"hospital","records":f["hospital"]}
    if topic=="missions": return {"domain":"missions","records":f["missions"]}
    if topic=="news": return {"domain":"news","count":len(f["news"]),"records":f["news"][:20]}
    if topic=="events": return {"domain":"events","count":len(f["events"]),"records":f["events"][:20]}
    if topic=="bank": return {"domain":"bank","records":{"money":user.get("money",0),"bankBalance":user.get("bankBalance",0)}}
    if topic=="inventory": return {"domain":"inventory","records":user.get("inventory") or {}}
    if topic=="pass": return {"domain":"pass","records":{"cityPass":user.get("cityPass") or {}}}
    return {"domain":topic,"records":{}}
