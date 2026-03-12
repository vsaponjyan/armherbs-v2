# beckend/app/api/routes
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import SYMPTOM_INDEX_FILE
from app.services.search_service import QueryExpander
from app.services.ai_service import AIService

router = APIRouter()

# 1. We load the index once to make the program run faster.
SYMPTOM_INDEX = {}
if SYMPTOM_INDEX_FILE.exists():
    with open(SYMPTOM_INDEX_FILE, "r", encoding="utf-8") as f:
        SYMPTOM_INDEX = json.load(f)

# 2. We train our employees
expander = QueryExpander(SYMPTOM_INDEX)
ai_service = AIService()

# 3.We define what the queries should look like.
class EmbedRequest(BaseModel):
    text: str

class RAGRequest(BaseModel):
    query: str
    context: list[dict]
    primary_herb: str | None = None

# 4. Our "doors" (Endpoints)

@router.post("/embed")
async def embed(request: EmbedRequest):
    expanded_text = expander.expand(request.text)
    embedding = await ai_service.get_embedding(expanded_text)
    return {"embedding": embedding}

@router.post("/rag")
async def generate_rag_answer(request: RAGRequest):
    context_text = ""
    for idx, herb in enumerate(request.context):
        context_text += f"\n--- Դեղաբույս {idx+1}: {herb['name']} ---\n"
        context_text += f"Բուժիչ հատկություններ: {herb.get('healing', '')}\n"
        context_text += f"Նկարագրություն: {herb.get('description', '')}\n"
        context_text += f"Օգտագործում: {herb.get('usage', '')}\n"
        context_text += f"Ախտանշաններ: {', '.join(herb.get('symptoms', []))}\n"

    # system_prompt = (
    #     "Դու դեղաբույսերի և բուսաբուժության փորձառու մասնագետ ես: "
    #     "Պատասխանիր օգտատիրոջ հարցերին՝ հիմնվելով ԲԱՑԱՌԱՊԵՍ տրամադրված կոնտեքստի վրա: "
    #     "Եթե տրամադրված տվյալներում հարցի պատասխանը չկա, ապա ասացեք հետևյալը՝ «Ձեր հարցի պատասխանը միգուցե գտնեք ներքոնշյալ դեղաբույսերի մեջ»: "
    #     "Պատասխանիր հայերեն, եղիր պրոֆեսիոնալ և հակիրճ: "
    #     "Եթե պատասխանդ պարունակում է մի քանի դեղաբույս կամ կետեր, ԱՆՊԱՅՄԱՆ օգտագործիր Markdown ցուցակ "
    #     "և յուրաքանչյուր կետը սկսիր ՆՈՐ ՏՈՂԻՑ: "
    #     "Պատասխանից հետո ԵՐԲԵՔ մի տուր հետագա հարցեր:"
    # )

    system_prompt = (
        "You are a professional expert in medicinal herbs and herbal medicine. "
        "Answer the user's question ONLY using the provided context. "

        "The answer MUST be written in Armenian language. "

        "If your answer contains multiple herbs or multiple points, you MUST use a Markdown list. "
        "Each list item MUST start on a new line. "

        "Follow the FINAL ANSWER format internally, but DO NOT literally write 'FINAL ANSWER:' at the top. "
        "Just provide the content directly, respecting the Markdown rules and structure.\n"

        "STRICT RULES:\n"
        "- Do not ask follow-up questions.\n"
        "- Do not offer help.\n"
        "- Do not add suggestions.\n"
        "- Do not include closing phrases such as 'If you have more questions'.\n"
        "- Do not add any sentences after the information.\n"
        "- End the answer immediately after the relevant information.\n"

        "If the answer cannot be found in the provided context, write ONLY this sentence:\n"
        "«Ձեր հարցի պատասխանը միգուցե գտնեք ներքոնշյալ դեղաբույսերի մեջ»"
    )

    if request.primary_herb:
        # user_prompt = (
        #     f"Հարց: {request.query}\n\n"
        #     f"ԿԱՐԵՎՈՐ: Հարցը վերաբերում է «{request.primary_herb}» դեղաբույսին։ "
        #     f"Պատասխանդ պետք է բացառապես «{request.primary_herb}»-ի մասին լինի։\n\n"
        #     f"Կոնտեքստ:\n{context_text}"
        # )
        user_prompt = (
            f"Question: {request.query}\n\n"
            f"IMPORTANT RULE:\n"
            f"The question refers specifically to the medicinal herb \"{request.primary_herb}\".\n"
            f"You MUST answer ONLY about this herb and ignore all other herbs.\n\n"
            f"Context:\n{context_text}"
        )
    else:
        user_prompt = f"Հարց: {request.query}\n\nԿոնտեքստ:\n{context_text}"

    try:
        answer = await ai_service.get_rag_answer(system_prompt, user_prompt)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))