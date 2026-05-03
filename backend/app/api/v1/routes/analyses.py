import json
from typing import List

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.db.session import get_db
from app.repositories.analysis import list_analysis_jobs
from app.schemas.analysis import AnalysisJobPublic
from app.schemas.user import UserPublic

router = APIRouter()


@router.get("/", response_model=List[AnalysisJobPublic])
def read_analyses(
    entry_type: str | None = None,
    entry_id: str | None = None,
    db=Depends(get_db),
    current_user: UserPublic = Depends(get_current_user),
):
    rows = list_analysis_jobs(
        db,
        user_id=current_user.id,
        entry_type=entry_type,
        entry_id=entry_id,
    )
    return [_row_to_public(row) for row in rows]


def _row_to_public(row) -> dict:
    result_payload = row["result_payload"]
    return {
        **dict(row),
        "result_payload": json.loads(result_payload) if result_payload else None,
    }
