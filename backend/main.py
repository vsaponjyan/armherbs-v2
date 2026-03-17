# backend/main.py
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import ALLOWED_ORIGINS
from app.api.routes import router, initialize_services

# ── Lifespan ────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Server բացվելուց ԱՌԱՋ
    initialize_services()
    yield
    # Server փակվելուց ՀԵՏՈ (cleanup)
    print("👋 Server փակվում է...")

# ── App ─────────────────────────────────────────────────
app = FastAPI(title="ArmHerbs API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "ArmHerbs Backend is running!"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# ✅ Ready to run:
# ./venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
