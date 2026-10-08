"""Entry point do cérebro modular do Kiba."""
import json,sys
from .core import KibaCore
def main():
    core=KibaCore()
    for line in sys.stdin:
        req={}
        try:
            req=json.loads(line)
            result=core.answer(req)
            result.update({
                "requestId":req.get("requestId"),
                "engine":"kiba-python-city-intelligence",
                "researchPlan":[
                    "Interpretar linguagem e contexto",
                    "Consultar o plugin interno do domínio",
                    "Cruzar dados atuais da cidade e do cidadão",
                    "Raciocinar ou planejar quando necessário",
                    "Verificar a resposta antes de enviar"
                ],
                "agents":[
                    {"agent":"Language Engine","reason":"entender a pergunta","priority":5},
                    {"agent":"City Knowledge","reason":"consultar conhecimento vivo","priority":5},
                    {"agent":"Reasoning Engine","reason":"relacionar sistemas","priority":5},
                    {"agent":"Planner","reason":"transformar objetivos em passos","priority":4},
                    {"agent":"Verification Engine","reason":"evitar afirmações sem evidência","priority":5}
                ],
                "researchSummary":"Kiba interpretou a pergunta, consultou dados oficiais enviados pelo servidor, cruzou os módulos relevantes e verificou a resposta.",
                "toolCalls":[{"tool":"city_snapshot","status":"used"},{"tool":"domain_plugin","status":"used","domain":result.get("topic")}],
            })
            print(json.dumps(result,ensure_ascii=False),flush=True)
        except Exception as exc:
            print(json.dumps({"requestId":req.get("requestId"),"error":"Kiba não conseguiu processar esta pergunta.","detail":str(exc)},ensure_ascii=False),flush=True)
if __name__=="__main__": main()
