# beckend/generate_embeddings.py
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
from pathlib import Path
import tiktoken

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

enc = tiktoken.get_encoding("cl100k_base")

def truncate_to_tokens(text: str, max_tokens: int = 8000) -> str:
    tokens = enc.encode(text)
    if len(tokens) > max_tokens:
        tokens = tokens[:max_tokens]
    return enc.decode(tokens)

print("🚀 Embeddings-ների ստեղծում սկսված է...\n")

backend_dir = Path(__file__).parent.resolve()
armherbs_dir = backend_dir.parent
herbs_rag_dir = armherbs_dir / 'herbs-rag'
public_dir = herbs_rag_dir / 'public'
output_path = public_dir / 'herbs_embeddings.json'

if not public_dir.exists():
    print(f"❌ ՍԽԱԼ: {public_dir} չի գտնվել!")
    exit(1)

herbs_data_path = backend_dir / 'herbs_raw_data.json'
if not herbs_data_path.exists():
    print(f"❌ ՍԽԱԼ: {herbs_data_path} ֆայլը չի գտնվել!")
    exit(1)

with open(herbs_data_path, 'r', encoding='utf-8') as f:
    herbs_data = json.load(f)

print(f"📚 Գտնված է {len(herbs_data)} դեղաբույս\n")

embeddings_db = []

for i, herb in enumerate(herbs_data, 1):

    combined_text = f"""
    {herb['name']}. {' '.join(herb.get('alternativeNames', []))}.
    Ախտանշաններ: {', '.join(herb['symptoms'])}
    Քիմիական բաղադրություն: {herb['chemistry']}
    Այլ օգուտներ: {herb.get('otherBenefits', '')}
    Բուժական նշանակություն: {herb['healing']}
    Կիրառում: {herb['usage']}
    {herb['description']}
    """

    # Ճշգրիտ կտրում ըստ token-ների
    combined_text = truncate_to_tokens(combined_text, max_tokens=8000)

    response = client.embeddings.create(
        input=combined_text,
        model="text-embedding-3-large"
    )
    embedding = response.data[0].embedding

    
    embeddings_db.append({
         "id": herb['id'],
         "name": herb['name'],
         "alternativeNames": herb.get('alternativeNames', []),
         "healing": herb['healing'],
         "usage": herb['usage'],       # 🆕
         "symptoms": herb['symptoms'],
         "htmlFile": herb['htmlFile'],
         "embedding": embedding
     })

    print(f"✅ [{i}/{len(herbs_data)}] {herb['name']}")

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(embeddings_db, f, ensure_ascii=False, indent=2)

print(f"\n✅ ՀԱՋՈՂՈՒԹՅԱՄԲ ԱՎԱՐՏՎԱԾ! {len(embeddings_db)} դեղաբույս")
print(f"📁 {output_path}")

#  ✅ Ready to run:
#  ./venv/bin/python generate_embeddings.py 