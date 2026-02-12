import os
from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from textblob import TextBlob
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="MindfulTrack AI Service", version="0.1.0")

@app.on_event("startup")
async def startup_event():
    """
    Ensure required NLTK corpora are downloaded on startup.
    """
    try:
        import nltk
        from textblob import TextBlob
        # Common corpora needed for TextBlob sentiment and noun phrases
        corpora = ['punkt', 'brown', 'punkt_tab', 'averaged_perceptron_tagger', 'wordnet']
        for corpus in corpora:
            nltk.download(corpus, quiet=True)
        print("NLTK corpora downloaded successfully.")
    except Exception as e:
        print(f"Error downloading NLTK corpora: {e}")

# Security Configuration
API_KEY = os.getenv("AI_SERVICE_KEY", "development_key")
api_key_header = APIKeyHeader(name="X-AI-Key", auto_error=True)

async def get_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Could not validate credentials")
    return api_key

# CORS Configuration
# Adjust origins in production to match your Next.js deployment URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MoodAnalysisRequest(BaseModel):
    text: str

class MoodAnalysisResponse(BaseModel):
    sentiment_score: float
    subjectivity: float
    keywords: list[str]

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "mindful-track-ai"}

@app.post("/v1/analyze/mood", response_model=MoodAnalysisResponse)
async def analyze_mood(request: MoodAnalysisRequest, api_key: str = Depends(get_api_key)):
    """
    Analyzes the sentiment and extracts keywords from a mood note.
    This is a Phase 1 implementation using TextBlob.
    """
    blob = TextBlob(request.text)
    
    # TextBlob polarity is -1.0 to 1.0
    sentiment_score = blob.sentiment.polarity
    subjectivity = blob.sentiment.subjectivity
    
    # Basic keyword extraction using noun phrases
    keywords = list(set(blob.noun_phrases))
    
    return {
        "sentiment_score": sentiment_score,
        "subjectivity": subjectivity,
        "keywords": keywords
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
