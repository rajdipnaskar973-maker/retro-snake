"""
Retro Snake — backend
A tiny FastAPI server that stores high scores in a local JSON file.
Kept intentionally simple: no database, no auth, just a few routes.

Run with:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

import json
import os
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Retro Snake API")

# Allow the React dev server (and any origin in production, since this
# is a small personal-site API with no sensitive data) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SCORES_FILE = os.path.join(os.path.dirname(__file__), "scores.json")
MAX_SCORES = 10


def load_scores() -> list[dict]:
    if not os.path.exists(SCORES_FILE):
        return []
    with open(SCORES_FILE, "r") as f:
        return json.load(f)


def save_scores(scores: list[dict]) -> None:
    with open(SCORES_FILE, "w") as f:
        json.dump(scores, f, indent=2)


class ScoreIn(BaseModel):
    name: str = Field(min_length=1, max_length=12)
    score: int = Field(ge=0)


@app.get("/")
def root():
    return {"status": "ok", "message": "Retro Snake API is running"}


@app.get("/api/highscores")
def get_highscores():
    return load_scores()


@app.post("/api/highscores")
def add_highscore(entry: ScoreIn):
    if entry.score < 0:
        raise HTTPException(status_code=400, detail="Score cannot be negative")

    scores = load_scores()
    scores.append(
        {
            "name": entry.name.upper()[:12],
            "score": entry.score,
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
        }
    )
    # Keep only the top MAX_SCORES entries
    scores.sort(key=lambda s: s["score"], reverse=True)
    scores = scores[:MAX_SCORES]
    save_scores(scores)
    return scores
