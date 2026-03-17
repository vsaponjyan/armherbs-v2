# beckend/app/config.py
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent.parent.resolve()

load_dotenv(BASE_DIR.parent / ".env")

DATA_DIR = BASE_DIR / "data"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]


HERBS_DATA_FILE = DATA_DIR / "herbs_raw_data.json"
SYMPTOM_INDEX_FILE = DATA_DIR / "symptom_index.json"


ARMENIAN_STOPWORDS = {
    "է", "են", "ի", "ու", "եւ", "և", "որ", "դա", "մի", "այն",
    "կա", "կան", "ում", "ից", "ով", "ին", "նաև", "այս", "դեպի",
    "համար", "կամ", "մինչ", "բայց", "ապա", "հետո", "նաեւ",
    "մեջ", "վրա", "տակ", "առ", "ըստ", "ամեն", "ոչ", "ոտ"
}