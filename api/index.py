import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from main import app  # noqa: E402
from app.api.routes import initialize_services  # noqa: E402

# Vercel's runtime may not run the FastAPI lifespan hook
initialize_services()
