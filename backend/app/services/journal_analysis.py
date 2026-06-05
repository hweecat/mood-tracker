import json
from collections import Counter
from sqlite3 import Connection, Row
from typing import Any


def analyze_mood_entry(db: Connection, job: Row) -> dict[str, Any]:
    row = db.execute(
        """
        SELECT rating, emotions, note, trigger, behavior
        FROM mood_entries
        WHERE id = ? AND user_id = ?
        """,
        (job["entry_id"], job["user_id"]),
    ).fetchone()
    if row is None:
        raise ValueError("source_entry_missing")

    emotions = json.loads(row["emotions"]) if row["emotions"] else []
    return {
        "summary": "Mood entry analyzed for lightweight self-help signals.",
        "mood": {
            "rating": row["rating"],
            "emotion_count": len(emotions),
            "has_note": bool(row["note"]),
            "has_trigger": bool(row["trigger"]),
            "has_behavior": bool(row["behavior"]),
        },
        "candidate_interventions": _mood_interventions(row["rating"], emotions),
        "schema_version": 1,
    }


def analyze_cbt_log(db: Connection, job: Row) -> dict[str, Any]:
    cbt_row = db.execute(
        """
        SELECT mood_before, mood_after, distortions
        FROM cbt_logs
        WHERE id = ? AND user_id = ?
        """,
        (job["entry_id"], job["user_id"]),
    ).fetchone()
    if cbt_row is None:
        raise ValueError("source_entry_missing")

    recent_cbt = db.execute(
        """
        SELECT distortions, mood_before, mood_after
        FROM cbt_logs
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT 20
        """,
        (job["user_id"],),
    ).fetchall()
    distortion_counts: Counter[str] = Counter()
    mood_deltas: list[int] = []
    for row in recent_cbt:
        for distortion in json.loads(row["distortions"] or "[]"):
            distortion_counts[distortion] += 1
        if row["mood_after"] is not None:
            mood_deltas.append(row["mood_after"] - row["mood_before"])

    return {
        "summary": "CBT log analyzed for recent patterns and practice options.",
        "top_distortions": [
            {"distortion": distortion, "count": count}
            for distortion, count in distortion_counts.most_common(5)
        ],
        "average_mood_delta": (
            round(sum(mood_deltas) / len(mood_deltas), 2)
            if mood_deltas
            else None
        ),
        "candidate_interventions": _cbt_interventions(distortion_counts),
        "schema_version": 1,
    }


def _mood_interventions(rating: int, emotions: list[str]) -> list[dict[str, str]]:
    interventions = [
        {
            "title": "Name the emotion",
            "description": "Take one minute to label the main feeling and where it shows up in the body.",
        }
    ]
    if rating <= 3:
        interventions.append(
            {
                "title": "Small grounding step",
                "description": "Try a short breathing or sensory grounding exercise before choosing the next action.",
            }
        )
    if emotions:
        interventions.append(
            {
                "title": "Emotion-matched care",
                "description": "Pick one gentle action that fits the strongest emotion you logged.",
            }
        )
    return interventions


def _cbt_interventions(distortion_counts: Counter[str]) -> list[dict[str, str]]:
    if not distortion_counts:
        return [
            {
                "title": "Evidence check",
                "description": "Write one piece of evidence for and against the automatic thought.",
            }
        ]
    top_distortion = distortion_counts.most_common(1)[0][0]
    return [
        {
            "title": "Pattern practice",
            "description": f"Practice a brief reframe for recurring {top_distortion} thoughts.",
        },
        {
            "title": "One-step experiment",
            "description": "Choose one low-risk action that tests the reframe in daily life.",
        },
    ]
