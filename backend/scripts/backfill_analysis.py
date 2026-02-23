import sqlite3
import json
import os
from textblob import TextBlob

# Add the parent directory to sys.path to potentially import from main if needed,
# but for a self-contained script we'll just replicate the logic.

DB_PATH = os.path.join(os.getcwd(), 'data/mood-tracker.db')

def analyze_text(text):
    if not text:
        return None
    blob = TextBlob(text)
    return {
        "sentiment_score": blob.sentiment.polarity,
        "subjectivity": blob.sentiment.subjectivity,
        "keywords": list(set(blob.noun_phrases))
    }

def backfill():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Find entries that need analysis
    cursor.execute("SELECT id, note FROM mood_entries WHERE ai_analysis IS NULL AND note IS NOT NULL AND note != ''")
    rows = cursor.fetchall()

    if not rows:
        print("No entries found requiring analysis.")
        conn.close()
        return

    print(f"Found {len(rows)} entries to analyze...")

    updated_count = 0
    for entry_id, note in rows:
        try:
            analysis = analyze_text(note)
            if analysis:
                cursor.execute(
                    "UPDATE mood_entries SET ai_analysis = ? WHERE id = ?",
                    (json.dumps(analysis), entry_id)
                )
                updated_count += 1
        except Exception as e:
            print(f"Error analyzing entry {entry_id}: {e}")

    conn.commit()
    conn.close()
    print(f"Successfully updated {updated_count} entries with AI analysis.")

if __name__ == "__main__":
    # Ensure NLTK data is present (replicating main.py startup logic)
    try:
        import nltk
        corpora = ['punkt', 'brown', 'punkt_tab', 'averaged_perceptron_tagger', 'wordnet']
        for corpus in corpora:
            nltk.download(corpus, quiet=True)
    except Exception as e:
        print(f"Warning: Could not download NLTK corpora: {e}")

    backfill()
