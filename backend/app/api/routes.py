import json
from contextlib import asynccontextmanager
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import SYMPTOM_INDEX_FILE
from app.services.search_service import QueryExpander
from app.services.ai_service import AIService
from app.services.nlp_service import ArmenianNLP

router = APIRouter()


SYMPTOM_INDEX = {}
expander    = None
ai_service  = None
nlp_service = None


class EmbedRequest(BaseModel):
    text: str

class RAGRequest(BaseModel):
    query: str
    context: list[dict]
    primary_herb: str | None = None
#_____________________________________
class ConversationTurnDTO(BaseModel):
    query: str
    herb_name: str | None = None

class ResolveContextRequest(BaseModel):
    query: str
    history: list[ConversationTurnDTO] = []
#_____________________________________    

@router.post("/embed")
async def embed(request: EmbedRequest):
    cleaned       = nlp_service.clean_text(request.text)
    expanded_text = expander.expand(cleaned)
    embedding     = await ai_service.get_embedding(expanded_text)
    return {"embedding": embedding}


@router.post("/rag")
async def generate_rag_answer(request: RAGRequest):
    
    filtered_context = request.context
    if request.primary_herb:
        
        filtered_context = [
            herb for herb in request.context 
            if herb.get('name', '').lower() == request.primary_herb.lower() or herb.get('id') == request.primary_herb
        ]
        
        if not filtered_context:
            filtered_context = request.context

    context_text = ""
    for idx, herb in enumerate(filtered_context):
        context_text += f"\n--- Դեղաբույս {idx+1} | ID: {herb['id']} ---\n"
        context_text += f"Անուն: {herb['name']}\n"
        context_text += f"Բուժիչ հատկություններ: {herb.get('healing', '')}\n"
        context_text += f"Նկարագրություն: {herb.get('description', '')}\n"
        context_text += f"Օգտագործում: {herb.get('usage', '')}\n"
        context_text += f"Ախտանշաններ: {', '.join(herb.get('symptoms', []))}\n"

    system_prompt = (
        "Դու դեղաբույսերի և բուսաբուժության փորձառու մասնագետ ես։\n"
        "Քո խնդիրն է անել հետևյալ գործողությունները ՄԵԿ պատասխանով.\n\n"

        "ՄԱՍ 1 — RERANKING:\n"
        "Վերլուծիր բոլոր տրամադրված բույսերը և դասավորիր դրանց ID-ները "
        "ըստ հարցի հետ կապի կարևորության։\n"
        "Գրիր հետևյալ ձևով (պարտադիր).\n"
        "RANKED_IDS: [\"id1\", \"id2\", \"id3\"]\n\n"

        "ՄԱՍ 2 — ՊԱՏԱՍԽԱՆ:\n"
        "Տուր պատասխան՝ հիմնվելով ԲԱՑԱՌԱՊԵՍ տրամադրված կոնտեքստի վրա։\n"
    )

    if request.primary_herb:
        system_prompt += (
            f"ԽՍՏԱԳՈՒՅՆ ԿԱՆՈՆ: Պատասխանիր բացառապես «{request.primary_herb}» բույսի մասին:\n"
            f"Արգելվում է որևէ այլ բույս առաջարկել, նշել կամ ավելացնել ավելորդ տեքստեր:\n"
        )
    else:
        system_prompt += "Եթե տվյալներում պատասխանը չկա, գրիր. «Ձեր հարցի պատասխանը միգուցե գտնեք ներքոնշյալ դեղաբույսերի մեջ»։\n"

    system_prompt += (
        "Պատասխանիր հայերեն, եղիր պրոֆեսիոնալ և հակիրճ։\n"
        "Պատասխանից հետո ԵՐԲԵՔ մի տուր հետագա հարցեր։\n\n"

        "ՄԱՍ 3 — ՖՈՐՄԱՏԱՎՈՐՄԱՆ ԽԻՍՏ ԿԱՆՈՆ (Links):\n"
        "Պատասխանի մեջ նշվող ԲՈԼՈՐ դեղաբույսերի անունները ՊԱՐՏԱԴԻՐ սարքիր Markdown հղումներ:\n"
        "Օգտագործիր հետևյալ ձևաչափը. - [Բույսի Անուն](բույսի-id) — նկարագրություն:\n"
        "ԵՐԲԵՔ մի գրիր ID-ն սովորական փակագծերում, միշտ օգտագործիր [Անուն](id) կառուցվածքը:\n"
        "Յուրաքանչյուր բույս կամ կետ սկսիր ՆՈՐ ՏՈՂԻՑ՝ օգտագործելով Markdown ցուցակ (-):"
    )

    if request.primary_herb:
        user_prompt = (
            f"Հարց: {request.query}\n\n"
            f"Կոնտեքստ:\n{context_text}"
        )
    else:
        user_prompt = (
            f"Հարց: {request.query}\n\n"
            f"Կոնտեքստ:\n{context_text}"
        )

    try:
        raw_response = await ai_service.get_rag_answer(system_prompt, user_prompt)

        ranked_ids = []
        answer     = raw_response

        if "RANKED_IDS:" in raw_response:
            parts  = raw_response.split("RANKED_IDS:", 1)
            id_line = parts[1].split("\n")[0].strip()
            id_line = id_line.replace("[", "").replace("]", "").replace('"', "").replace("'", "")
            ranked_ids = [i.strip() for i in id_line.split(",") if i.strip()]
            answer = parts[1].split("\n", 1)[1].strip() if "\n" in parts[1] else ""

        if request.primary_herb and filtered_context:
            ranked_ids = [filtered_context[0]['id']]

        return {
            "answer":     answer,
            "ranked_ids": ranked_ids,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
#_____________________________________________________________________________
@router.post("/resolve-context")
async def resolve_context(request: ResolveContextRequest):
    if not request.history:
        return {"resolved_query": request.query, "is_follow_up": False}

    history_text = ""
    for i, turn in enumerate(request.history):
        history_text += f"{i+1}. Հարցում: \"{turn.query}\""
        if turn.herb_name:
            history_text += f" → Քննարկված բույս: {turn.herb_name}"
        history_text += "\n"

    system_prompt = (
        "Դու օգնում ես բուսաբուժության որոնողական համակարգին։\n"
        "Քեզ կտրվի խոսակցության ամբողջ պատմությունը (հին→նոր հերթականությամբ) "
        "և վերջին, նոր հարցումը։\n"
        "Որոշիր՝ արդյոք նոր հարցումը կախված է նախորդ համատեքստից "
        "(օր. պարունակում է դերանուն, հղում կամ թերի միտք, "
        "որը հասկանալի է միայն պատմության հետ համատեղ)։\n"
        "Եթե այո՝ վերաշարադրիր հարցումն ինքնուրույն, ամբողջական տեսքով, "
        "օգտագործելով ամենավերջին համապատասխան համատեքստը պատմությունից։\n"
        "Եթե ոչ (հարցումն արդեն ինքնուրույն է, կամ նոր թեմա է)՝ վերադարձրու անփոփոխ։\n"
        "Պատասխանիր ՄԻԱՅՆ JSON՝ {\"resolved_query\": \"...\", \"is_follow_up\": true/false}"
    )
    user_prompt = (
        f"Պատմություն:\n{history_text}\n"
        f"Նոր հարցում: {request.query}"
    )

    try:
        raw = await ai_service.resolve_context(system_prompt, user_prompt)
        data = json.loads(raw)
        return {
            "resolved_query": data.get("resolved_query", request.query),
            "is_follow_up": data.get("is_follow_up", False),
        }
    except Exception:
        return {"resolved_query": request.query, "is_follow_up": False}
#_____________________________________________________________________________
def initialize_services():
    """
    Server-ի բացումից առաջ բոլոր ծանր գործիքները բեռնում ենք։
    Կանչվում է main.py-ից lifespan-ի մեջ։
    """
    global SYMPTOM_INDEX, expander, ai_service, nlp_service

    print("⏳ Բեռնվում են services...")

    
    if SYMPTOM_INDEX_FILE.exists():
        with open(SYMPTOM_INDEX_FILE, "r", encoding="utf-8") as f:
            SYMPTOM_INDEX = json.load(f)
    print("✅ Symptom index բեռնված")
    
    expander = QueryExpander(SYMPTOM_INDEX)
    print("✅ QueryExpander բեռնված")

    ai_service = AIService()
    print("✅ AIService բեռնված")

    nlp_service = ArmenianNLP()
    print("✅ ArmenianNLP բեռնված — server պատրաստ է")