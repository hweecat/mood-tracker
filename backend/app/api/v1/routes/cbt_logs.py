# backend/app/api/v1/routes/cbt_logs.py

from typing import List
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from app.db.session import get_db
from app.schemas.cbt import CBTLogPublic, CBTLogCreate, CBTAnalysisRequest, CBTAnalysisResponse
from app.repositories.cbt import get_cbt_logs, create_cbt_log, update_cbt_log, delete_cbt_log
from app.services.ai_client import get_ai_client
from app.services.gemini_client import SafetyException
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.get("/", response_model=List[CBTLogPublic])
def read_cbt_logs(db = Depends(get_db)):
    return get_cbt_logs(db, user_id="1")


@router.post("/", response_model=CBTLogPublic)
def create_cbt(log_in: CBTLogCreate, db = Depends(get_db)):
    return create_cbt_log(db, user_id="1", log_in=log_in)


@router.put("/{log_id}", response_model=CBTLogPublic)
def update_cbt(log_id: str, log_in: CBTLogPublic, db = Depends(get_db)):
    if not update_cbt_log(db, user_id="1", log_in=log_in):
        raise HTTPException(status_code=404, detail="CBT log not found")
    return log_in


@router.delete("/{log_id}")
def remove_cbt(log_id: str, db = Depends(get_db)):
    if not delete_cbt_log(db, user_id="1", log_id=log_id):
        raise HTTPException(status_code=404, detail="CBT log not found")
    return {"status": "success"}


@router.post("/analyze", response_model=CBTAnalysisResponse)
async def analyze_cbt(request: CBTAnalysisRequest):
    """
    AI-powered cognitive analysis of automatic thoughts.

    Returns distortion suggestions and rational reframes.
    """
    ai_client = get_ai_client()

    try:
        result = await asyncio.wait_for(
            ai_client.analyze_cbt(request),
            timeout=10.0
        )
        return result
    except SafetyException as e:
        # Fixed: avoid using 'message' in extra as it's reserved
        logger.warning("Safety exception triggered", extra={"detail": e.message})
        raise HTTPException(
            status_code=status.HTTP_451_UNAVAILABLE_FOR_LEGAL_REASONS,
            detail={
                "message": e.message,
                "trigger": "safety",
                "crisis_resources": e.crisis_resources
            }
        )
    except asyncio.TimeoutError:
        logger.warning("AI analysis timed out")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Analysis timed out. Please try again."
        )
    except Exception as e:
        logger.error("AI analysis failed", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analysis service unavailable"
        )
