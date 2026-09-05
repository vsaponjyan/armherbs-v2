import re
from fastapi import HTTPException
from openai import OpenAI, RateLimitError, APIConnectionError, OpenAIError
from app.config import OPENAI_API_KEY

class AIService:
    def __init__(self):
        
        self.client = OpenAI(api_key=OPENAI_API_KEY)
    
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
        return answer.strip()