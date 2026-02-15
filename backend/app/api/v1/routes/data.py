import json
import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from app.db.session import get_db
from app.repositories.mood import get_mood_entries
from app.repositories.cbt import get_cbt_logs
from pydantic import BaseModel

router = APIRouter()

class ImportRequest(BaseModel):
    format: str
    content: str

@router.get("/export")
def export_data(format: str = "json", db = Depends(get_db)):
    user_id = "1"
    moods = get_mood_entries(db, user_id)
    cbt_logs = get_cbt_logs(db, user_id)

    if format == "json":
        data = {
            "moodEntries": moods,
            "cbtLogs": cbt_logs
        }
        return Response(
            content=json.dumps(data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=mindfultrack_export.json"}
        )
    
    elif format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["--- MOOD ENTRIES ---"])
        writer.writerow(["ID", "Timestamp", "Rating", "Emotions", "Note", "Trigger", "Behavior"])
        for m in moods:
            writer.writerow([
                m["id"], m["timestamp"], m["rating"], 
                ", ".join(m["emotions"]), m.get("note", ""), 
                m.get("trigger", ""), m.get("behavior", "")
            ])
        
        writer.writerow([])
        writer.writerow(["--- CBT LOGS ---"])
        writer.writerow(["ID", "Timestamp", "Situation", "Automatic Thoughts", "Distortions", "Rational Response", "Mood Before", "Mood After", "Behavioral Link"])
        for l in cbt_logs:
            writer.writerow([
                l["id"], l["timestamp"], l["situation"], 
                l["automatic_thoughts"], ", ".join(l["distortions"]), 
                l["rational_response"], l["mood_before"], 
                l.get("mood_after", ""), l.get("behavioral_link", "")
            ])
            
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=mindfultrack_export.csv"}
        )

    elif format == "md":
        output = io.StringIO()
        output.write("# MindfulTrack Export\n\n")
        
        output.write("## Mood Entries\n\n")
        for m in moods:
            output.write(f"### {m['timestamp']} - Rating: {m['rating']}\n")
            output.write(f"**Emotions:** {', '.join(m['emotions'])}\n\n")
            if m.get("note"): output.write(f"> {m.get('note')}\n\n")
            if m.get("trigger"): output.write(f"*Trigger:* {m.get('trigger')}\n")
            if m.get("behavior"): output.write(f"*Behavior:* {m.get('behavior')}\n")
            output.write("\n---\n\n")
            
        output.write("## CBT Logs\n\n")
        for l in cbt_logs:
            output.write(f"### Situation: {l['situation']}\n")
            output.write(f"**Thoughts:** {l['automatic_thoughts']}\n")
            output.write(f"**Distortions:** {', '.join(l['distortions'])}\n")
            output.write(f"**Reframed:** {l['rational_response']}\n")
            output.write("\n---\n\n")
            
        return Response(
            content=output.getvalue(),
            media_type="text/markdown",
            headers={"Content-Disposition": "attachment; filename=mindfultrack_export.md"}
        )

    else:
        raise HTTPException(status_code=400, detail="Unsupported format")

@router.post("/import")
def import_data(req: ImportRequest, db = Depends(get_db)):
    if req.format != "json":
        raise HTTPException(status_code=400, detail="Only JSON import is supported in this version")
    
    try:
        data = json.loads(req.content)
        user_id = "1"
        cursor = db.cursor()
        
        if "moodEntries" in data:
            for m in data["moodEntries"]:
                ai_analysis = m.get("ai_analysis")
                cursor.execute(
                    "INSERT OR IGNORE INTO mood_entries (id, rating, emotions, note, trigger, behavior, timestamp, user_id, ai_analysis) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (m["id"], m["rating"], json.dumps(m["emotions"]), m.get("note"), m.get("trigger"), m.get("behavior"), m["timestamp"], user_id, json.dumps(ai_analysis) if ai_analysis else None)
                )
        
        if "cbtLogs" in data:
            for l in data["cbtLogs"]:
                cursor.execute(
                    "INSERT OR IGNORE INTO cbt_logs (id, timestamp, situation, automatic_thoughts, distortions, rational_response, mood_before, mood_after, behavioral_link, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (l["id"], l["timestamp"], l["situation"], l["automatic_thoughts"], json.dumps(l["distortions"]), l["rational_response"], l["mood_before"], l.get("mood_after"), l.get("behavioral_link"), user_id)
                )
        
        db.commit()
        return {"message": "Data imported successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
