"""
Retro Snake — backend
A tiny FastAPI server that stores high scores in a local JSON file.
Kept intentionally simple: no database, no auth, just a few routes.

Run with:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
import os
from datetime import datetime
GMAIL_ADDRESS = os.environ.get("GMAIL_ADDRESS", "rajdipnaskar973@gmail.com")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "your16letterpassword")
otp_store: dict = {}
users_file = os.path.join(os.path.dirname(__file__), "users.json")

def load_users():
    if not os.path.exists(users_file):
        return []
    with open(users_file, "r") as f:
        return json.load(f)

def save_users(users):
    with open(users_file, "w") as f:
        json.dump(users, f, indent=2)


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
class OTPRequest(BaseModel):
    email: str
    name: str
    phone: str

class OTPVerify(BaseModel):
    email: str
    otp: str
    name: str
    phone: str

@app.post("/api/send-otp")
def send_otp(data: OTPRequest):
    otp = str(random.randint(100000, 999999))
    otp_store[data.email] = otp
    try:
        msg = MIMEMultipart()
        msg["From"] = GMAIL_ADDRESS
        msg["To"] = data.email
        msg["Subject"] = "RAJDIP.SYS — Access Code"
        body = f"""
RAJDIP.SYS TERMINAL ACCESS
===========================
Your OTP Code: {otp}

Enter this code to access the terminal.
Code expires in 10 minutes.

— RAJDIP.SYS
        """
        msg.attach(MIMEText(body, "plain"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_ADDRESS, data.email, msg.as_string())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email failed: {str(e)}")
    return {"message": "OTP sent successfully"}

@app.post("/api/verify-otp")
def verify_otp(data: OTPVerify):
    if data.email not in otp_store:
        raise HTTPException(status_code=400, detail="No OTP found. Request a new one.")
    if otp_store[data.email] != data.otp:
        raise HTTPException(status_code=400, detail="Wrong OTP. Try again.")
    del otp_store[data.email]
    users = load_users()
    users.append({
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "joined": datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    })
    save_users(users)
    return {"message": "Login successful", "success": True}

@app.get("/api/users")
def get_users():
    return load_users()