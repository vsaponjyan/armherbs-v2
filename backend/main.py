# backend/main.py
import json
import os
import re
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# ===============================
# CORS — .env-ից
# ===============================
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ===============================
# Load symptom index
# ===============================
backend_dir  = Path(__file__).parent.resolve()
index_path   = backend_dir / "symptom_index.json"

SYMPTOM_INDEX: dict = {}

if index_path.exists():
    with open(index_path, "r", encoding="utf-8") as f:
        SYMPTOM_INDEX = json.load(f)
    print(f"✅ Symptom index բեռնված — {len(SYMPTOM_INDEX.get('symptom_cooccurrence', {}))} symptoms")
else:
    print("⚠️ symptom_index.json չի գտնվել։")

# ===============================
# Query Expander
# ===============================
class QueryExpander:
    def __init__(self, index: dict):
        self.cooccurrence  = index.get("symptom_cooccurrence", {})
        self.keywords      = index.get("symptom_keywords", {})
        self.herb_names    = index.get("herb_name_index", {})
        self.herb_vocab    = index.get("herb_vocabulary", {})

    def expand(self, query: str) -> str:
        if not self.cooccurrence:
            return query
        q = query.strip().lower()
        q_words = q.split()
        parts = [query]
        added = set(q_words)

        for word in q_words:
            canonical = self.herb_names.get(word)
            if canonical:
                vocab = self.herb_vocab.get(canonical.lower(), [])
                for term in vocab:
                    if term not in added:
                        parts.append(term)
                        added.add(term)
                        if len(parts) >= 15: break
                break

        for word in q_words:
            related = self.cooccurrence.get(word, [])
            for term in related:
                if term not in added:
                    parts.append(term)
                    added.add(term)
                    if len(parts) >= 18: break

        for word in q_words:
            keywords = self.keywords.get(word, [])
            for kw in keywords:
                if kw not in added:
                    parts.append(kw)
                    added.add(kw)
                    if len(parts) >= 22: break

        return " ".join(parts[:22])

expander = QueryExpander(SYMPTOM_INDEX)


def remove_follow_up_sentences(text: str) -> str:
    patterns = [
        r'[Եե]թե ունե[ք]+.*?[։\.]',
        r'[Խխ]նդրում եմ հարցրե[ք]+.*?[։\.]',
        r'[Կկ]ա՞ն այլ հարցե[ր]+.*?[։\.]',
        r'[Հh]ույս ունեմ.*?[։\.]',
        r'[Կկ]արո՞ղ եմ օգնել.*?[։\.]',
        r'[Հհ]արցե[ր]+ ունե[ք]+.*?[։\.]',
        r'[Հհ]արցե[ր]+ կամ.*?[։\.]',
        r'[Դդ]իմե[ք]+.*?[։\.]',
        r'[Ցց]անկության դեպքում.*?[։\.]',
        r'[Թթ]ե՛ կամ.*?[։\.]',
    ]
    cleaned = text
    for pattern in patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.DOTALL | re.UNICODE)
    
    cleaned = re.sub(r'[ \t]{2,}', ' ', cleaned) 
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    
    return cleaned.strip()

# ===============================
# Models
# ===============================
class EmbedRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    embedding: list[float]

class RAGRequest(BaseModel):
    query: str
    context: list[dict]
    primary_herb: str | None = None

# ===============================
# Endpoints
# ===============================

@app.post("/api/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest):
    expanded_text = expander.expand(request.text)
    response = client.embeddings.create(
        input=expanded_text,
        model="text-embedding-3-large"
    )
    return {"embedding": response.data[0].embedding}

@app.post("/api/rag")
async def generate_rag_answer(request: RAGRequest):
    context_text = ""
    for idx, herb in enumerate(request.context):
        context_text += f"\n--- Դեղաբույս {idx+1}: {herb['name']} ---\n"
        context_text += f"Բուժիչ հատկություններ: {herb.get('healing', '')}\n"
        context_text += f"Նկարագրություն: {herb.get('description', '')}\n"
        context_text += f"Օգտագործում: {herb.get('usage', '')}\n"
        context_text += f"Ախտանշաններ: {', '.join(herb.get('symptoms', []))}\n"

    #primary_herb = request.primary_herb if hasattr(request, 'primary_herb') else None
    primary_herb = request.primary_herb
    system_prompt = (
        "Դու դեղաբույսերի և բուսաբուժության փորձառու մասնագետ ես: "
        "Պատասխանիր օգտատիրոջ հարցերին՝ հիմնվելով ԲԱՑԱՌԱՊԵՍ տրամադրված կոնտեքստի վրա: "
        "Եթե տրամադրված տվյալներում հարցի պատասխանը չկա, ապա ասացեք հետևյալը՝ «Ձեր հարցի պատասխանը միգուցե գտնեք ներքոնշյալ դեղաբույսերի մեջ»: "
        "Պատասխանիր հայերեն, եղիր պրոֆեսիոնալ և հակիրճ: "
        "Եթե պատասխանդ պարունակում է մի քանի դեղաբույս կամ կետեր, ԱՆՊԱՅՄԱՆ օգտագործիր Markdown ցուցակ (օրինակ՝ * կամ 1. նշաններով) "
        "և յուրաքանչյուր կետը սկսիր ՆՈՐ ՏՈՂԻՑ, որպեսզի պատասխանը լինի ընթեռնելի: "
        "Մի՛ հորինիր նոր հատկություններ կամ դեղաբույսեր, որոնք չկան տեքստում: "
        "Պատասխանից հետո ԵՐԲԵՔ մի տուր հետագա հարցեր, մի արա առաջարկներ, մի գրիր լրացուցիչ նախադասություններ:"
    )

    # ✅ Եթե կոնկրետ բույս է — AI-ն ուղղորդել
    # Եթե symptom/general — AI-ն ազատ է context-ից ընտրելու
    if primary_herb:
        user_prompt = (
            f"Հարց: {request.query}\n\n"
            f"ԿԱՐԵՎՈՐ: Հարցը վերաբերում է «{primary_herb}» դեղաբույսին։ "
            f"Պատասխանդ պետք է բացառապես «{primary_herb}»-ի մասին լինի։ "
            f"Մյուս դեղաբույսերի տվյալները տրված են միայն որպես լրացուցիչ կոնտեքստ — "
            f"դրանց մասին ՄԻ՛ խոսիր։\n\n"
            f"Կոնտեքստ:\n{context_text}"
        )
    else:
        user_prompt = f"Հարց: {request.query}\n\nԿոնտեքստ:\n{context_text}"

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.2,
        )
        answer = response.choices[0].message.content
        answer = remove_follow_up_sentences(answer)
        return {"answer": answer}
    except Exception as e:
        return {"answer": f"Սխալ AI պատասխան գեներացնելիս: {str(e)}"}
# ```
# **`.env` ֆայլից:**
# ```
# ALLOWED_ORIGINS=http://localhost:3000

# ✅ Ready to run:
# ./venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
