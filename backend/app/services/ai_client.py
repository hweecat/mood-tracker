from textblob import TextBlob
from app.core.logging import get_logger

logger = get_logger(__name__)

async def analyze_mood_note(text: str) -> dict:
    if not text:
        return None
    
    logger.info("Analyzing mood note", extra={"text_length": len(text)})
    
    try:
        blob = TextBlob(text)
        
        sentiment_score = blob.sentiment.polarity
        subjectivity = blob.sentiment.subjectivity
        keywords = list(set(blob.noun_phrases))
        
        analysis = {
            "sentiment_score": sentiment_score,
            "subjectivity": subjectivity,
            "keywords": keywords
        }
        
        logger.info("Mood analysis complete", extra={"sentiment_score": sentiment_score})
        return analysis
    except Exception as e:
        logger.error("Mood analysis failed", extra={"error": str(e)})
        return None
