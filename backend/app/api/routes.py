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

#4. Our "doors" (Endpoints)

@router.post("/embed")
async def embed(request: EmbedRequest):
    expanded_text = expander.expand(request.text)
    embedding = await ai_service.get_embedding(expanded_text)
    return {"embedding": embedding}

# @router.post("/rag")
# async def generate_rag_answer(request: RAGRequest):
#     context_text = ""
#     for idx, herb in enumerate(request.context):
#         context_text += f"\n--- Դեղաբույս {idx+1}: {herb['name']} ---\n"
#         context_text += f"Բուժիչ հատկություններ: {herb.get('healing', '')}\n"
#         context_text += f"Նկարագրություն: {herb.get('description', '')}\n"
#         context_text += f"Օգտագործում: {herb.get('usage', '')}\n"
#         context_text += f"Ախտանշաններ: {', '.join(herb.get('symptoms', []))}\n"

#     system_prompt = (
#         "You are a medical herbalist. Your goal is to explain the medicinal benefits of herbs for the user's health issue. "
#         "Using the provided context, find the connection between the user's symptom (e.g., menstruation, pain) and the herb's properties. "
#         "Do not just describe the herb; explain HOW it addresses the user's specific concern. "
#         "If the context describes the usage or dosage, include it clearly."
#         "Answer ONLY using the provided context. "
#         "The answer MUST be written in Armenian language. "

#         "STRUCTURE RULES:\n"
#         "- First, list the relevant herbs from the context.\n"
#         "- For EACH herb, briefly explain HOW it helps with the user's problem and the suggested usage based ONLY on the context.\n"
#         "- Use a Markdown list for the herbs. Each list item MUST start on a new line.\n"
#         "- Keep the description of each herb practical and brief.\n"

#         "STRICT RULES:\n"
#         "- Do not ask follow-up questions.\n"
#         "- Do not offer help or add personal suggestions.\n"
#         "- Do not include closing phrases.\n"
#         "- End the answer immediately after the last herb description.\n"

#         "If the answer cannot be found in the provided context, write ONLY this sentence:\n"
#         "«Ձեր հարցի պատասխանը միգուցե գտնեք ներքոնշյալ դեղաբույսերի մեջ»"
#     )

#     if request.primary_herb:
#         user_prompt = (
#             f"Question: {request.query}\n\n"
#             f"IMPORTANT RULE:\n"
#             f"The question refers specifically to the medicinal herb \"{request.primary_herb}\".\n"
#             f"Explain how this specific herb should be used to address the question based on the context.\n\n"
#             f"Context:\n{context_text}"
#         )
#     else:
#         user_prompt = (
#             f"Question: {request.query}\n\n"
#             f"Based on the context, provide a brief summary of how the relevant herbs can help with the problem mentioned in the question.\n\n"
#             f"Context:\n{context_text}"
#     )
  
#     # system_prompt = (
#     #     "Դու դեղաբույսերի և բուսաբուժության փորձառու մասնագետ ես: "
#     #     "Պատասխանիր օգտատիրոջ հարցերին՝ հիմնվելով ԲԱՑԱՌԱՊԵՍ տրամադրված կոնտեքստի վրա: "
#     #     "Եթե տրամադրված տվյալներում հարցի պատասխանը չկա, ապա ասացեք հետևյալը՝ «Ձեր հարցի պատասխանը միգուցե գտնեք ներքոնշյալ դեղաբույսերի մեջ»: "
#     #     "Պատասխանիր հայերեն, եղիր պրոֆեսիոնալ և հակիրճ: "
#     #     "Եթե պատասխանդ պարունակում է մի քանի դեղաբույս կամ կետեր, ԱՆՊԱՅՄԱՆ օգտագործիր Markdown ցուցակ "
#     #     "և յուրաքանչյուր կետը սկսիր ՆՈՐ ՏՈՂԻՑ: "
#     #     "Պատասխանից հետո ԵՐԲԵՔ մի տուր հետագա հարցեր:"
#     # )

#     # system_prompt = (
#     #     "You are a professional expert in medicinal herbs and herbal medicine. "
#     #     "Answer the user's question ONLY using the provided context. "

#     #     "The answer MUST be written in Armenian language. "

#     #     "If your answer contains multiple herbs or multiple points, you MUST use a Markdown list. "
#     #     "Each list item MUST start on a new line. "

#     #     "Follow the FINAL ANSWER format internally, but DO NOT literally write 'FINAL ANSWER:' at the top. "
#     #     "Just provide the content directly, respecting the Markdown rules and structure.\n"

#     #     "STRICT RULES:\n"
#     #     "- Do not ask follow-up questions.\n"
#     #     "- Do not offer help.\n"
#     #     "- Do not add suggestions.\n"
#     #     "- Do not include closing phrases such as 'If you have more questions'.\n"
#     #     "- Do not add any sentences after the information.\n"
#     #     "- End the answer immediately after the relevant information.\n"

#     #     "If the answer cannot be found in the provided context, write ONLY this sentence:\n"
#     #     "«Ձեր հարցի պատասխանը միգուցե գտնեք ներքոնշյալ դեղաբույսերի մեջ»"
#     # )

#     # if request.primary_herb:
#     #     # user_prompt = (
#     #     #     f"Հարց: {request.query}\n\n"
#     #     #     f"ԿԱՐԵՎՈՐ: Հարցը վերաբերում է «{request.primary_herb}» դեղաբույսին։ "
#     #     #     f"Պատասխանդ պետք է բացառապես «{request.primary_herb}»-ի մասին լինի։\n\n"
#     #     #     f"Կոնտեքստ:\n{context_text}"
#     #     # )
#     #     user_prompt = (
#     #         f"Question: {request.query}\n\n"
#     #         f"IMPORTANT RULE:\n"
#     #         f"The question refers specifically to the medicinal herb \"{request.primary_herb}\".\n"
#     #         f"You MUST answer ONLY about this herb and ignore all other herbs.\n\n"
#     #         f"Context:\n{context_text}"
#     #     )
#     # else:
#     #     user_prompt = f"Հարց: {request.query}\n\nԿոնտեքստ:\n{context_text}"

#     try:
#         answer = await ai_service.get_rag_answer(system_prompt, user_prompt)
#         return {"answer": answer}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))


@router.post("/rag")
async def generate_rag_answer(request: RAGRequest):
    # --- Ավելացնում ենք կրկնությունների զտիչը ---
    seen_herbs = set()
    unique_contexts = []
    
    # Մենք անցնում ենք Front-end-ից եկած բոլոր բույսերի վրայով
    for herb in request.context:
        herb_name = herb.get('name')
        
        # Եթե այս բույսին դեռ չենք տեսել, ավելացնում ենք
        if herb_name and herb_name not in seen_herbs:
            # Սարքում ենք տեքստային կտորը
            h_text = f"\n--- Դեղաբույս: {herb_name} ---\n"
            h_text += f"Բուժիչ հատկություններ: {herb.get('healing', '')}\n"
            h_text += f"Նկարագրություն: {herb.get('description', '')}\n"
            h_text += f"Օգտագործում: {herb.get('usage', '')}\n"
            # Ստուգում ենք, որ ախտանշանները ցուցակ լինեն
            symptoms = herb.get('symptoms', [])
            h_text += f"ԱԽՏԱՆՇԱՆՆԵՐ: {', '.join(symptoms) if isinstance(symptoms, list) else symptoms}\n"
            
            unique_contexts.append(h_text)
            seen_herbs.add(herb_name) # Հիշում ենք անունը

    # Միացնում ենք բոլոր եզակի բույսերի տեքստերը իրար
    context_text = "\n".join(unique_contexts)
    # ---------------------------------------------

    system_prompt = (
        "You are a medical herbalist. Your goal is to explain the medicinal benefits of herbs for the user's health issue. "
        "Using the provided context, find the connection between the user's symptom (e.g., menstruation, pain) and the herb's properties. "
        "Do not just describe the herb; explain HOW it addresses the user's specific concern. "
        "If the context describes the usage or dosage, include it clearly. "
        "Answer ONLY using the provided context. "
        "The answer MUST be written in Armenian language. "

        "STRUCTURE RULES:\n"
        "- Use a Markdown list (starting with '-') for each herb.\n"
        "- Each list item must start with the herb name in bold, followed by a colon or a dash, and then the explanation.\n"
        "- DO NOT repeat the herb name inside the explanation sentence.\n"
        "- Example: '- **Դաղձ**: Օգնում է փորացավի դեպքում...' (NOT '- **Դաղձ** Դաղձը օգնում է...')\n"
        "- Each herb description must be on a new line and formatted as a single list item.\n"
        
        "STRICT RULES:\n"
        "- Do not ask follow-up questions.\n"
        "- Do not offer help or add personal suggestions.\n"
        "- Do not include closing phrases.\n"
        "- End the answer immediately after the last herb description.\n"

        "If the answer cannot be found in the provided context, write ONLY this sentence:\n"
        "«Ձեր հարցի պատասխանը միգուցե գտնեք ներքոնշյալ դեղաբույսերի մեջ»"
    )

    if request.primary_herb:
        user_prompt = (
            f"Question: {request.query}\n\n"
            f"IMPORTANT RULE:\n"
            f"The question refers specifically to the medicinal herb \"{request.primary_herb}\".\n"
            f"Explain how this specific herb should be used to address the question based on the context.\n\n"
            f"Context:\n{context_text}"
        )
    else:
        user_prompt = (
            f"Question: {request.query}\n\n"
            f"Based on the context, provide a brief summary of how the relevant herbs can help with the problem mentioned in the question.\n\n"
            f"Context:\n{context_text}"
        )

    try:
        answer = await ai_service.get_rag_answer(system_prompt, user_prompt)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))