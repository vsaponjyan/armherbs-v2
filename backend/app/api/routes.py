import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import SYMPTOM_INDEX_FILE
from app.services.search_service import QueryExpander
from app.services.ai_service import AIService
from app.services.nlp_service import ArmenianNLP
from app.prompts import build_rag_system_prompt, RESOLVE_CONTEXT_SYSTEM_PROMPT

router = APIRouter()
logger = logging.getLogger(__name__)

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

class ConversationTurnDTO(BaseModel):
    query: str
    herb_name: str | None = None

class ResolveContextRequest(BaseModel):
    query: str
    history: list[ConversationTurnDTO] = []

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

    system_prompt = build_rag_system_prompt(request.primary_herb)

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

    system_prompt = RESOLVE_CONTEXT_SYSTEM_PROMPT
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
    except Exception as e:
        logger.warning(
             f"resolve_context failed for query={request.query!r}: {e}",
             exc_info=True,
         )
        return {"resolved_query": request.query, "is_follow_up": False}

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