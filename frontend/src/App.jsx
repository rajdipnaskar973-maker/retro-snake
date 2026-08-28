import { useEffect, useState } from "react";
import SnakeGame from "./SnakeGame.jsx";
import TetrisGame from "./TetrisGame.jsx";
import ZombieGame from "./ZombieGame.jsx";
import TankGame from "./TankGame.jsx";
import Login from "./Login.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const INSTAGRAM_URL = "https://www.instagram.com/_rajdip_001/?hl=en";
const FACEBOOK_URL = "https://www.facebook.com/rajdip.naskar.675859";

const DIFFICULTIES = {
  easy: { label: "EASY", speedStart: 150, speedMin: 95, step: 2 },
  medium: { label: "MEDIUM", speedStart: 120, speedMin: 70, step: 3 },
  hard: { label: "HARD", speedStart: 95, speedMin: 45, step: 4 },
};

const GAMES = [
  { id: "snake", title: "SNAKE.EXE", desc: "Classic snake — eat grow survive", icon: "🐍" },
  { id: "tetris", title: "TETRIS.EXE", desc: "Stack blocks clear lines beat gravity", icon: "🟦" },
  { id: "zombie", title: "ZOMBIE.EXE", desc: "Survive zombie waves WASD auto-aim", icon: "🧟" },
  { id: "tank", title: "TANK.EXE", desc: "2 player tank battle same keyboard", icon: "🎖️" },
];

const BOOT_LINES = [
  "INITIALIZING RAJDIP.SYS ...",
  "LOADING TERMINAL FONT ... OK",
  "MOUNTING GAMES ... OK",
  "CONNECTING TO SCORE SERVER ... OK",
  "READY_",
];

function useBootSequence() {
  const [lines, setLines] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      setLines((p) => [...p, BOOT_LINES[i]]);
      i++;
      if (i >= BOOT_LINES.length) {
        clearInterval(iv);
        setTimeout(() => setDone(true), 350);
      }
    }, 220);
    return () => clearInterval(iv);
  }, []);

  return { lines, done };
}

export default function App() {
  const { lines, done } = useBootSequence();
  const [highScores, setHighScores] = useState([]);
  const [scoreName, setScoreName] = useState("");
  const [lastScore, setLastScore] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const [activeGame, setActiveGame] = useState(null);
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem("rajdip_user");
    return s ? JSON.parse(s) : null;
  });

  function handleLogin(u) {
    setUser(u);
  }

  function handleLogout() {
    localStorage.removeItem("rajdip_user");
    setUser(null);
  }

  const bestScore = highScores
    .filter((s) => s.game === activeGame)
    .reduce((mx, s) => Math.max(mx, s.score), 0);

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
    if (!scoreName.trim() || lastScore === null) return;
    fetch(`${API_URL}/api/highscores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: scoreName.trim(),
        score: lastScore,
        difficulty,
        game: activeGame,
      }),
    })
      .then((r) => r.json())
      .then((u) => {
        setHighScores(u);
        setSubmitted(true);
      })
      .catch(() => {});
  }

  function selectGame(id) {
    setActiveGame(id);
    setLastScore(null);
    setSubmitted(false);
    setScoreName("");
  }

  function quitGame() {
    setActiveGame(null);
    setLastScore(null);
    setSubmitted(false);
    setScoreName("");
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
          <header className="site-header">
            <div className="header-left">
              <img
                src="/avatar.jpg"
                alt=""
                className="nav-avatar"
                onError={(e) => (e.target.style.display = "none")}
              />
              <span className="logo">RAJDIP.SYS</span>
            </div>
            <nav>
              <span className="nav-user">▶ {user.name.toUpperCase()}</span>
              <a href="#play">PLAY</a>
              <a href="#scores">SCORES</a>
              <a href="#contact">CONTACT</a>
              <button className="btn small" onClick={handleLogout}>
                LOGOUT
              </button>
            </nav>
          </header>

          <main>
            <section className="hero">
              <p className="eyebrow">// personal terminal — est. 2026</p>
              <h1>
                Hi, I&apos;m Rajdip.<br />
                Welcome to my little corner of the internet.
              </h1>
            </section>

            <section id="play" className="play-section">
              {!activeGame ? (
                <>
                  <h2 className="game-select-title">&gt; SELECT GAME</h2>
                  <div className="game-grid">
                    {GAMES.map((g) => (
                      <button
                        key={g.id}
                        className="game-card"
                        onClick={() => selectGame(g.id)}
                      >
                        <span className="game-card-icon">{g.icon}</span>
                        <span className="game-card-title">{g.title}</span>
                        <span className="game-card-desc">{g.desc}</span>
                        <span className="game-card-play">▶ CLICK TO PLAY</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="game-top-bar">
                    <button className="btn small" onClick={quitGame}>
                      ✕ QUIT
                    </button>
                    <span className="game-playing-title">
                      {GAMES.find((g) => g.id === activeGame)?.title}
                    </span>
                  </div>

                  {activeGame === "snake" && (
                    <>
                      <div className="difficulty-picker">
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
                    </>
                  )}
                  {activeGame === "tetris" && (
                    <TetrisGame
                      onGameOver={handleGameOver}
                      highScore={bestScore}
                    />
                  )}
                  {activeGame === "zombie" && (
                    <ZombieGame
                      onGameOver={handleGameOver}
                      highScore={bestScore}
                    />
                  )}
                  {activeGame === "tank" && (
                    <TankGame
                      onGameOver={handleGameOver}
                      highScore={bestScore}
                    />
                  )}

                  {lastScore !== null && !submitted && (
                    <form className="score-form" onSubmit={submitScore}>
                      <label>save your score —</label>
                      <input
                        maxLength={12}
                        placeholder="YOUR NAME"
                        value={scoreName}
                        onChange={(e) => setScoreName(e.target.value)}
                      />
                      <button className="btn small" type="submit">
                        SUBMIT
                      </button>
                    </form>
                  )}
                  {submitted && <p className="saved-msg">score saved ✓</p>}
                </>
              )}
            </section>

            <section id="scores" className="scores-section">
              <h2>&gt; HIGH SCORES</h2>
              {highScores.length === 0 ? (
                <p className="muted">no scores yet — be the first!</p>
              ) : (
                <ol className="score-list">
                  {highScores.map((s, i) => (
                    <li key={i}>
                      <span className="rank">{String(i + 1).padStart(2, "0")}</span>
                      <span className="pname">{s.name}</span>
                      {s.game && (
                        <span className="pdiff">{s.game.toUpperCase()}</span>
                      )}
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
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @_rajdip_001 ↗
                </a>
              </p>
              <p>
                Or connect with me on Facebook —{" "}
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Rajdip Naskar ↗
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