import { useEffect, useState } from "react";
import SnakeGame from "./SnakeGame.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const INSTAGRAM_URL = "https://www.instagram.com/_rajdip_001/?hl=en";

const BOOT_LINES = [
  "INITIALIZING RAJDIP.SYS ...",
  "LOADING TERMINAL FONT ... OK",
  "MOUNTING SNAKE.EXE ... OK",
  "CONNECTING TO SCORE SERVER ... OK",
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
      body: JSON.stringify({ name: name.trim(), score: lastScore }),
    })
      .then((r) => r.json())
      .then((updated) => {
        setHighScores(updated);
        setSubmitted(true);
      })
      .catch(() => {});
  }

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
          <header className="site-header">
            <span className="logo">RAJDIP.SYS</span>
            <nav>
              <a href="#play">PLAY</a>
              <a href="#scores">SCORES</a>
              <a href="#contact">CONTACT</a>
            </nav>
          </header>

          <main>
            <section className="hero">
              <p className="eyebrow">// personal terminal — est. 2026</p>
              <h1>
                Hi, I'm Rajdip. <br /> Welcome to my little corner of the internet.
              </h1>
              <p className="hero-sub">
                BCA student, building toward AI/ML engineering. This page doubles as a
                playable vintage Snake game — press start below and see how high you can
                climb the leaderboard.
              </p>
            </section>

            <section id="play" className="play-section">
              <SnakeGame onGameOver={handleGameOver} highScore={bestScore} />

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
                  <button className="btn small" type="submit">
                    SUBMIT
                  </button>
                </form>
              )}
              {submitted && <p className="saved-msg">score saved to the leaderboard ✓</p>}
            </section>

            <section id="scores" className="scores-section">
              <h2>&gt; HIGH SCORES</h2>
              {highScores.length === 0 ? (
                <p className="muted">
                  no scores yet — be the first on the board. (backend offline? scores
                  just won't save, the game still works.)
                </p>
              ) : (
                <ol className="score-list">
                  {highScores.map((s, i) => (
                    <li key={i}>
                      <span className="rank">{String(i + 1).padStart(2, "0")}</span>
                      <span className="pname">{s.name}</span>
                      <span className="pscore">{s.score}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section id="contact" className="contact-section">
              <h2>&gt; CONTACT</h2>
              <p>
                Find / message me on Instagram —{" "}
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                  @_rajdip_001 ↗
                </a>
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
