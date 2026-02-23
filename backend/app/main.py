from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import nltk

from app.api.v1.routes import moods, cbt_logs, data, users
from app.core.logging import setup_logging
from app.api.middleware import CorrelationIdMiddleware
from app.db.session import init_db

load_dotenv()
setup_logging()
init_db()

app = FastAPI(title="MindfulTrack API", version="0.1.0")

app.add_middleware(CorrelationIdMiddleware)

@app.on_event("startup")
async def startup_event():
    """
    Ensure required NLTK corpora are downloaded on startup.
    """
    try:
        # Common corpora needed for TextBlob sentiment and noun phrases
        corpora = ['punkt', 'brown', 'punkt_tab', 'averaged_perceptron_tagger', 'wordnet']
        for corpus in corpora:
            nltk.download(corpus, quiet=True)
        print("NLTK corpora downloaded successfully.")
    except Exception as e:
        print(f"Error downloading NLTK corpora: {e}")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(moods.router, prefix="/api/v1/moods", tags=["moods"])
app.include_router(cbt_logs.router, prefix="/api/v1/cbt-logs", tags=["cbt-logs"])
app.include_router(data.router, prefix="/api/v1/data", tags=["data"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "mindful-track-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
