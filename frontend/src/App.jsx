import { useEffect, useState } from "react";
import SnakeGame from "./SnakeGame.jsx";
import Login from "./Login.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const INSTAGRAM_URL = "https://www.instagram.com/_rajdip_001/?hl=en";
const FACEBOOK_URL = "https://www.facebook.com/rajdip.naskar.675859";
const WHATSAPP_URL = "https://wa.me/919733087126";
const DIFFICULTIES = {
  easy:   { label: "EASY",   speedStart: 150, speedMin: 95, step: 2 },
  medium: { label: "MEDIUM", speedStart: 120, speedMin: 70, step: 3 },
  hard:   { label: "HARD",   speedStart: 95,  speedMin: 45, step: 4 },
};

const BOOT_LINES = [
  "RAJDIP.SYS ...",
  "We AREE BACKKK....",
  "LET'S MAKE FUN AGAIN ... OK",
  " 3-----2-----1----!!!!... GO",
  "READY_",
];

function useBootSequence() {
  const [lines, setLines] = useState([]);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setLines((prev) => [...prev, BOOT_LINES[i]]);
      i += 1;
      if (i >= BOOT_LINES.length) {
        clearInterval(interval);
        setTimeout(() => setDone(true), 350);
      }
    }, 220);
    return () => clearInterval(interval);
  }, []);
  return { lines, done };
}

export default function App() {
  const { lines, done } = useBootSequence();
  const [highScores, setHighScores] = useState([]);
  const [name, setName] = useState("");
  const [lastScore, setLastScore] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("rajdip_user");
    return saved ? JSON.parse(saved) : null;
  });

  function handleLogin(u) { setUser(u); }
  function handleLogout() {
  localStorage.removeItem("rajdip_user");
  setUser(null);
}

  const bestScore = highScores[0]?.score ?? 0;

  useEffect(() => {
    fetch(`${API_URL}/api/highscores`)
      .then((r) => r.json())
      .then(setHighScores)
      .catch(() => setHighScores([]));
  }, []);

  function handleGameOver(score) {
    setLastScore(score);
    setSubmitted(false);
  }

  function submitScore(e) {
    e.preventDefault();
    if (!name.trim() || lastScore === null) return;
    fetch(`${API_URL}/api/highscores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), score: lastScore, difficulty }),
    })
      .then((r) => r.json())
      .then((updated) => {
        setHighScores(updated);
        setSubmitted(true);
      })
      .catch(() => {});
  }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="crt">
      <div className="scanlines" aria-hidden="true" />
      {!done ? (
        <div className="boot-screen">
          <pre className="boot-log">
            {lines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
            <span className="cursor">▮</span>
          </pre>
        </div>
      ) : (
        <>
          <header className="Site-header">
            <a href="frontend/src/54a1ccaa-b08c-4ebd-8d7a-3593d5fab27a.png" className="logo">
              
            </a>
            <nav>
              <a href="#play">PLAY</a>
              <a href="#scores">SCORES</a>
              <a href="#contact">CONTACT</a>
            </nav>
          </header>

          <main>
            <section className="hero">
              <p className="eyebrow">// personal terminal — est. 2026</p>
              <h1>Hi, I'm Rajdip. <br /> Welcome to my little corner of the internet.</h1>
            </section>

            <section id="play" className="play-section">
              <div className="difficulty-picker" role="group" aria-label="Select difficulty">
                {Object.entries(DIFFICULTIES).map(([key, d]) => (
                  <button
                    key={key}
                    type="button"
                    className={`diff-btn ${difficulty === key ? "active" : ""}`}
                    onClick={() => setDifficulty(key)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <SnakeGame
                onGameOver={handleGameOver}
                highScore={bestScore}
                settings={DIFFICULTIES[difficulty]}
              />
              {lastScore !== null && !submitted && (
                <form className="score-form" onSubmit={submitScore}>
                  <label htmlFor="name">save your score —</label>
                  <input
                    id="name"
                    maxLength={12}
                    placeholder="YOUR NAME"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <button className="btn small" type="submit">SUBMIT</button>
                </form>
              )}
              {submitted && <p className="saved-msg">score saved to the leaderboard ✓</p>}
            </section>

            <section id="scores" className="scores-section">
              <h2>&gt; HIGH SCORES</h2>
              {highScores.length === 0 ? (
                <p className="muted"></p>
              ) : (
                <ol className="score-list">
                  {highScores.map((s, i) => (
                    <li key={i}>
                      <span className="rank">{String(i + 1).padStart(2, "0")}</span>
                      <span className="pname">{s.name}</span>
                      {s.difficulty && (
                        <span className="pdiff">{s.difficulty.slice(0, 4).toUpperCase()}</span>
                      )}
                      <span className="pscore">{s.score}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section id="contact" className="contact-section">
              <h2>&gt; CONTACT</h2>
              <p>Find / message me on Instagram —{" "}
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">@_rajdip_001 ↗</a>
              </p>
              <p>Or connect with me on Facebook —{" "}
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">Rajdip Naskar ↗</a>
              </p>
              <p>Or send me a message on WhatsApp —{" "}
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Rajdip Naskar ↗</a>
              </p>
            </section>
          </main>

          <footer className="site-footer">
            <span>© 2026 RAJDIP.SYS — built with React + FastAPI</span>
          </footer>
        </>
      )}
    </div>
  );
}