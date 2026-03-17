# backend/scripts/generate_embeddings.py
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
from pathlib import Path
import tiktoken
import sys


# scripts/generate_embeddings.py -> parent (scripts) -> parent (backend)
BACKEND_DIR = Path(__file__).parent.parent.resolve()

# Adding the backend to the Python path
sys.path.append(str(BACKEND_DIR))

# .env is located one level above the backend (in the root)
load_dotenv(BACKEND_DIR.parent / ".env")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
enc = tiktoken.get_encoding("cl100k_base")

DATA_DIR = BACKEND_DIR / "data"
herbs_data_path = DATA_DIR / "herbs_raw_data.json"

# We save the result in the frontend/public folder.
public_dir = BACKEND_DIR.parent / 'frontend' / 'public'
output_path = public_dir / 'herbs_embeddings.json'

def truncate_to_tokens(text: str, max_tokens: int = 8000) -> str:
    """Truncates text if it exceeds the number of tokens allowed.:"""
    tokens = enc.encode(text)
    if len(tokens) > max_tokens:
        tokens = tokens[:max_tokens]
    return enc.decode(tokens)

def run_embeddings_generation():
    print("🚀 Embeddings-ների ստեղծում սկսված է...\n")

    # Checking for the existence of folders
    if not public_dir.exists():
        print(f"⚠️ ԶԳՈՒՇԱՑՈՒՄ: {public_dir} թղթապանակը չկա, ստեղծվում է...")
        public_dir.mkdir(parents=True, exist_ok=True)

    if not herbs_data_path.exists():
        print(f"❌ ՍԽԱԼ: {herbs_data_path} ֆայլը չի գտնվել!")
        print("Համոզվեք, որ herbs_raw_data.json-ը backend/data/ թղթապանակի մեջ է:")
        sys.exit(1)

    # data loading
    try:
        with open(herbs_data_path, 'r', encoding='utf-8') as f:
            herbs_data = json.load(f)
    except Exception as e:
        print(f"❌ ՍԽԱԼ ֆայլը կարդալիս: {e}")
        sys.exit(1)

    print(f"📚 Գտնված է {len(herbs_data)} դեղաբույս")
    print(f"📍 Աղբյուր: {herbs_data_path}")
    print(f"📍 Նպատակակետ: {output_path}\n")

    embeddings_db = []

    for i, herb in enumerate(herbs_data, 1):
        
        combined_text = f"""
        Անուն: {herb.get('name', '')}. 
        Այլ անուններ: {', '.join(herb.get('alternativeNames', []))}.
        Ախտանշաններ: {', '.join(herb.get('symptoms', []))}
        Քիմիական բաղադրություն: {herb.get('chemistry', '')}
        Բուժական նշանակություն: {herb.get('healing', '')}
        Կիրառում: {herb.get('usage', '')}
        Օգուտներ: {herb.get('otherBenefits', '')}
        Նկարագրություն: {herb.get('description', '')}
        """

        # Precise token-based slicing (for OpenAI's limit)
        combined_text = truncate_to_tokens(combined_text, max_tokens=8000)

        try:
            
            response = client.embeddings.create(
                input=combined_text,
                model="text-embedding-3-large"
            )
            embedding = response.data[0].embedding
            
            embeddings_db.append({
                 "id": herb.get('id'),
                 "name": herb.get('name'),
                 "alternativeNames": herb.get('alternativeNames', []),
                 "healing": herb.get('healing'),
                 "usage": herb.get('usage'),
                 "symptoms": herb.get('symptoms'),
                 "htmlFile": herb.get('htmlFile'),
                 "embedding": embedding
             })
            print(f"✅ [{i}/{len(herbs_data)}] {herb.get('name')}")
        except Exception as e:
            print(f"❌ Սխալ {herb.get('name', i)}-ի մշակման ժամանակ: {e}")

    # save
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(embeddings_db, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ ՀԱՋՈՂՈՒԹՅԱՄԲ ԱՎԱՐՏՎԱԾ! Ստեղծվել է {len(embeddings_db)} embedding:")
        print(f"📁 Ֆայլը պահպանված է: {output_path}")
    except Exception as e:
        print(f"❌ ՍԽԱԼ պահպանելիս: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_embeddings_generation()


#  ✅ Ready to run:
#  ./venv/bin/python scripts/generate_embeddings.py


    