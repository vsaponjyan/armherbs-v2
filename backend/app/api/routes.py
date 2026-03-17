# beckend/app/api/routes.py
import json
from contextlib import asynccontextmanager
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import SYMPTOM_INDEX_FILE
from app.services.search_service import QueryExpander
from app.services.ai_service import AIService
from app.services.nlp_service import ArmenianNLP

router = APIRouter()

# ── Global objects ──────────────────────────────────────
SYMPTOM_INDEX = {}
expander    = None
ai_service  = None
nlp_service = None

# ── Request մոդելներ ────────────────────────────────────
class EmbedRequest(BaseModel):
    text: str

class RAGRequest(BaseModel):
    query: str
    context: list[dict]
    primary_herb: str | None = None

# ── /embed ──────────────────────────────────────────────
@router.post("/embed")
async def embed(request: EmbedRequest):
    cleaned       = nlp_service.clean_text(request.text)
    expanded_text = expander.expand(cleaned)
    embedding     = await ai_service.get_embedding(expanded_text)
    return {"embedding": embedding}

# ── /rag ────────────────────────────────────────────────
@router.post("/rag")
async def generate_rag_answer(request: RAGRequest):

    context_text = ""
    for idx, herb in enumerate(request.context):
        context_text += f"\n--- Դեղաբույս {idx+1} | ID: {herb['id']} ---\n"
        context_text += f"Անուն: {herb['name']}\n"
        context_text += f"Բուժիչ հատկություններ: {herb.get('healing', '')}\n"
        context_text += f"Նկարագրություն: {herb.get('description', '')}\n"
        context_text += f"Օգտագործում: {herb.get('usage', '')}\n"
        context_text += f"Ախտանշաններ: {', '.join(herb.get('symptoms', []))}\n"

    system_prompt = (
        "Դու դեղաբույսերի և բուսաբուժության փորձառու մասնագետ ես։\n"
        "Քո խնդիրն է երկու բան անել ՄԵԿ պատասխանով։\n\n"

        "ՄԱՍ 1 — RERANKING:\n"
        "Նախ վերլուծիր բոլոր տրամադրված բույսերը և դասավորիր դրանց ID-ները "
        "ըստ հարցի հետ կապի կարևորության։\n"
        "Գրիր հետևյալ ձևով (պարտադիր):\n"
        "RANKED_IDS: [\"id1\", \"id2\", \"id3\"]\n\n"

        "ՄԱՍ 2 — ՊԱՏԱՍԽԱՆ:\n"
        "Հետո տուր պատասխան՝ հիմնվելով ԲԱՑԱՌԱՊԵՍ տրամադրված կոնտեքստի վրա։\n"
        "Եթե տվյալներում հարցի պատասխանը չկա՝ գրիր "
        "«Ձեր հարցի պատասխանը միգուցե գտնեք ներքոնշյալ դեղաբույսերի մեջ»։\n"
        "Պատասխանիր հայերեն, եղիր պրոֆեսիոնալ և հակիրճ։\n"
        "Եթե պատասխանդ պարունակում է մի քանի դեղաբույս կամ կետեր, "
        "ԱՆՊԱՅՄԱՆ օգտագործիր Markdown ցուցակ և յուրաքանչյուր կետը սկսիր ՆՈՐ ՏՈՂԻՑ։\n"
        "Պատասխանից հետո ԵՐԲԵՔ մի տուր հետագա հարցեր։"
    )

    if request.primary_herb:
        user_prompt = (
            f"Հարց: {request.query}\n\n"
            f"ԿԱՐԵՎՈՐ: Հարցը վերաբերում է «{request.primary_herb}» դեղաբույսին։ "
            f"Reranking-ում «{request.primary_herb}»-ը դիր առաջինը։ "
            f"Պատասխանդ պետք է բացառապես «{request.primary_herb}»-ի մասին լինի։\n\n"
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

        return {
            "answer":     answer,
            "ranked_ids": ranked_ids,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# backend/app/api/routes.py-ի վերջում new for footer   

@router.get("/footer-data")
async def get_footer_data():
    # Օգտագործում ենք DATA_DIR-ը config.py-ից
    from app.config import DATA_DIR
    file_path = DATA_DIR / "footer_data.json"
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Footer data file not found")
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 


# ── Startup ─────────────────────────────────────────────
def initialize_services():
    """
    Server-ի բացումից առաջ բոլոր ծանր գործիքները բեռնում ենք։
    Կանչվում է main.py-ից lifespan-ի մեջ։
    """
    global SYMPTOM_INDEX, expander, ai_service, nlp_service

    print("⏳ Բեռնվում են services...")

    # 1. Index
    if SYMPTOM_INDEX_FILE.exists():
        with open(SYMPTOM_INDEX_FILE, "r", encoding="utf-8") as f:
            SYMPTOM_INDEX = json.load(f)
    print("✅ Symptom index բեռնված")

    # 2. Expander
    expander = QueryExpander(SYMPTOM_INDEX)
    print("✅ QueryExpander բեռնված")

    # 3. AI Service
    ai_service = AIService()
    print("✅ AIService բեռնված")

    # 4. NLP — ամենածանրը վերջում
    nlp_service = ArmenianNLP()
    print("✅ ArmenianNLP բեռնված — server պատրաստ է")



