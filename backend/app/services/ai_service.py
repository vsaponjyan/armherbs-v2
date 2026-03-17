# beckend/app/services/ai_service.py
import re
from fastapi import HTTPException
from openai import OpenAI, RateLimitError, APIConnectionError, OpenAIError
from app.config import OPENAI_API_KEY

class AIService:
    def __init__(self):
        # Ստեղծում ենք OpenAI-ի հետ խոսելու գործիքը
        self.client = OpenAI(api_key=OPENAI_API_KEY)

    # def remove_follow_up_sentences(self, text: str) -> str:
    #     """Ջնջում է ավելորդ հարցերը կամ առաջարկները պատասխանի վերջից։"""
    #     patterns = [
    #         r'[Եե]թե ունե[ք]+.*?[։\.]',
    #         r'[Խխ]նդրում եմ հարցրե[ք]+.*?[։\.]',
    #         r'[Կկ]ա՞ն այլ հարցե[ր]+.*?[։\.]',
    #         r'[Հh]ույս ունեմ.*?[։\.]',
    #         r'[Կկ]արո՞ղ եմ օգնել.*?[։\.]',
    #         r'[Հհ]արցե[ր]+ ունե[ք]+.*?[։\.]',
    #         r'[Հհ]արցե[ր]+ կամ.*?[։\.]',
    #         r'[Դդ]իմե[ք]+.*?[։\.]',
    #         r'[Ցց]անկության դեպքում.*?[։\.]',
    #         r'[Թթ]ե՛ կամ.*?[։\.]',
    #     ]
    #     cleaned = text
    #     for pattern in patterns:
    #         cleaned = re.sub(pattern, "", cleaned, flags=re.DOTALL | re.UNICODE)
        
    #     cleaned = re.sub(r'[ \t]{2,}', ' ', cleaned) 
    #     cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    #     return cleaned.strip()

        
    async def get_embedding(self, text: str):
        try:
            response = self.client.embeddings.create(
                input=text,
                model="text-embedding-3-large"
            )
            return response.data[0].embedding
        except RateLimitError:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        except APIConnectionError:
            raise HTTPException(status_code=503, detail="AI service unavailable")
        except OpenAIError as e:
            raise HTTPException(status_code=502, detail=str(e))
            

    async def get_rag_answer(self, system_prompt: str, user_prompt: str):
        """Ստանում է պատասխանը GPT մոդելից։"""
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.2,
        )
        answer = response.choices[0].message.content
        #return self.remove_follow_up_sentences(answer)
        return answer.strip()