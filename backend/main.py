import json
import os
import hashlib
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Retro Snake API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SCORES_FILE = os.path.join(os.path.dirname(__file__), "scores.json")
USERS_FILE  = os.path.join(os.path.dirname(__file__), "users.json")

def hash_pw(pw): return hashlib.sha256(pw.encode()).hexdigest()

def load(path):
    if not os.path.exists(path): return []
    with open(path) as f: return json.load(f)

def save(path, data):
    with open(path, "w") as f: json.dump(data, f, indent=2)

class SignupIn(BaseModel):
    name:     str = Field(min_length=1, max_length=30)
    email:    str
    phone:    str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=6)

class LoginIn(BaseModel):
    email:    str
    password: str

class ScoreIn(BaseModel):
    name:       str = Field(min_length=1, max_length=12)
    score:      int = Field(ge=0)
    game:       str = Field(default="snake")
    difficulty: str = Field(default="medium")

@app.get("/")
def root(): return {"status": "ok"}

@app.post("/api/auth/signup")
def signup(data: SignupIn):
    users = load(USERS_FILE)
    if any(u["email"].lower() == data.email.lower() for u in users):
        raise HTTPException(400, "Email already registered. Please login.")
    user = {
        "name": data.name,
        "email": data.email.lower(),
        "phone": data.phone,
        "password": hash_pw(data.password),
        "joined": datetime.utcnow().strftime("%Y-%m-%d"),
    }
    users.append(user)
    save(USERS_FILE, users)
    return {"name": user["name"], "email": user["email"], "phone": user["phone"]}

@app.post("/api/auth/login")
def login(data: LoginIn):
    users = load(USERS_FILE)
    user = next((u for u in users if u["email"].lower() == data.email.lower()), None)
    if not user:
        raise HTTPException(400, "Email not found. Please sign up first.")
    if user["password"] != hash_pw(data.password):
        raise HTTPException(400, "Wrong password. Try again.")
    return {"name": user["name"], "email": user["email"], "phone": user["phone"]}

@app.get("/api/highscores")
def get_scores(): return load(SCORES_FILE)

@app.post("/api/highscores")
def add_score(entry: ScoreIn):
    scores = load(SCORES_FILE)
    scores.append({
        "name": entry.name.upper()[:12],
        "score": entry.score,
        "game": entry.game,
        "difficulty": entry.difficulty,
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
    })
    scores.sort(key=lambda s: s["score"], reverse=True)
    scores = scores[:20]
    save(SCORES_FILE, scores)
    return scores