"""Registro de plugins internos do Kiba. Todos leem o snapshot oficial do servidor."""
from .knowledge import facts

PLUGIN_NAMES=["city","jobs","missions","companies","hospital","shop","bank","inventory","pass","news","events","mayor","proposals","players"]

def run(topic,snapshot,user):
    f=facts(snapshot); topic=topic if topic in PLUGIN_NAMES else "city"
    mapping={
      "city":{"population":f["population"],"economy":f["economy"],"infrastructure":f["infrastructure"],"quality":f["quality"],"taxRate":f["taxRate"]},
      "jobs":f["jobs"],"missions":f["missions"],"companies":f["companies"],"shop":f["shop"],
      "hospital":f["hospital"],"bank":{"money":user.get("money",0),"bankBalance":user.get("bankBalance",0)},
      "inventory":user.get("inventory") or {},"pass":user.get("cityPass") or {},
      "news":f["news"],"events":f["events"],"mayor":[u for u in f["users"] if u.get("isMayor")],
      "proposals":f["proposals"],"players":f["users"]
    }
    data=mapping.get(topic,{})
    return {"domain":topic,"records":data,"recordCount":len(data) if isinstance(data,(list,dict)) else None}
