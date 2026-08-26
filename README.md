# Retro Snake — Rajdip's site

A small personal site: retro amber-terminal look, boot-up animation, and a
playable Snake game with beep sound effects (generated in the browser —
no audio files, so it loads fast). Scores are saved to a tiny FastAPI
backend.

```
retro-snake/
├── backend/     FastAPI app (high-score API)
└── frontend/    React + Vite app (the site itself)
```

## 1. Run the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

This serves the API at `http://localhost:8000`. Scores are stored in
`backend/scores.json` (created automatically — no database setup needed).

## 2. Run the frontend

In a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). The game works
even with the backend off — it just won't save your score to the
leaderboard.

## 3. Controls

- **Desktop:** arrow keys or WASD, space to start/restart
- **Mobile:** swipe on the game screen

## 4. Deploying

- **Frontend:** `npm run build` in `frontend/` produces a `dist/` folder —
  deploy that to Vercel/Netlify (same as your other site).
- **Backend:** deploy `backend/` to something like Render, Railway, or
  Fly.io. Once it's live, set the frontend's environment variable
  `VITE_API_URL` (see `frontend/.env.example`) to that backend's URL
  before running `npm run build`.

## Notes

- Contact link on the site points to your Instagram:
  https://www.instagram.com/_rajdip_001/?hl=en
- No external assets (fonts are loaded from Google Fonts, sound effects
  are generated with the Web Audio API) — keeps first load fast.
