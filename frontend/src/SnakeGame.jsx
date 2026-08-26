import { useEffect, useRef, useState, useCallback } from "react";
import { sfx } from "./sounds";

const GRID = 20; // cells per side
const SPEED_START = 130; // ms per tick
const SPEED_MIN = 70;

function randomCell(exclude) {
  let cell;
  do {
    cell = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
  } while (exclude.some((c) => c.x === cell.x && c.y === cell.y));
  return cell;
}

export default function SnakeGame({ onGameOver, highScore }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState(360);
  const [status, setStatus] = useState("ready"); // ready | playing | over
  const [score, setScore] = useState(0);

  const stateRef = useRef({
    snake: [{ x: 10, y: 10 }],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 14, y: 10 },
    speed: SPEED_START,
  });

  // Keep the canvas square and responsive to its container's width.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setSize(Math.floor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const resetGame = useCallback(() => {
    stateRef.current = {
      snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: randomCell([{ x: 10, y: 10 }]),
      speed: SPEED_START,
    };
    setScore(0);
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    setStatus("playing");
    sfx.start();
  }, [resetGame]);

  // Keyboard controls
  useEffect(() => {
    function handleKey(e) {
      const s = stateRef.current;
      const map = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
      };
      const next = map[e.key];
      if (!next) {
        if (e.key === " " && status !== "playing") startGame();
        return;
      }
      e.preventDefault();
      // Prevent reversing directly into yourself
      if (next.x === -s.dir.x && next.y === -s.dir.y) return;
      if (next.x !== s.dir.x || next.y !== s.dir.y) sfx.turn();
      s.nextDir = next;
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [status, startGame]);

  // Touch / swipe controls for mobile
  const touchStart = useRef(null);
  function onTouchStart(e) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e) {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const s = stateRef.current;
    let next = null;
    if (Math.abs(dx) > Math.abs(dy)) {
      next = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      next = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }
    if (next.x === -s.dir.x && next.y === -s.dir.y) return;
    s.nextDir = next;
    touchStart.current = null;
  }

  // Game loop
  useEffect(() => {
    if (status !== "playing") return undefined;
    let raf;
    let last = 0;

    function tick(ts) {
      const s = stateRef.current;
      if (ts - last >= s.speed) {
        last = ts;
        s.dir = s.nextDir;
        const head = {
          x: s.snake[0].x + s.dir.x,
          y: s.snake[0].y + s.dir.y,
        };

        const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
        const hitSelf = s.snake.some((c) => c.x === head.x && c.y === head.y);

        if (hitWall || hitSelf) {
          sfx.gameOver();
          setStatus("over");
          onGameOver(score);
          return;
        }

        s.snake.unshift(head);

        if (head.x === s.food.x && head.y === s.food.y) {
          sfx.eat();
          setScore((prev) => {
            const next = prev + 10;
            return next;
          });
          s.food = randomCell(s.snake);
          s.speed = Math.max(SPEED_MIN, s.speed - 3);
        } else {
          s.snake.pop();
        }

        draw();
      }
      raf = requestAnimationFrame(tick);
    }

    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const cell = size / GRID;
      const s = stateRef.current;

      ctx.fillStyle = "#140f08";
      ctx.fillRect(0, 0, size, size);

      // faint grid
      ctx.strokeStyle = "rgba(255,176,0,0.06)";
      for (let i = 1; i < GRID; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cell);
        ctx.lineTo(size, i * cell);
        ctx.stroke();
      }

      // food
      ctx.fillStyle = "#ff6a3d";
      ctx.shadowColor = "#ff6a3d";
      ctx.shadowBlur = 12;
      ctx.fillRect(s.food.x * cell + 2, s.food.y * cell + 2, cell - 4, cell - 4);
      ctx.shadowBlur = 0;

      // snake
      s.snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? "#ffd479" : "#ffb000";
        ctx.shadowColor = "#ffb000";
        ctx.shadowBlur = i === 0 ? 10 : 0;
        ctx.fillRect(seg.x * cell + 1, seg.y * cell + 1, cell - 2, cell - 2);
      });
      ctx.shadowBlur = 0;
    }

    draw();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, size]);

  return (
    <div className="game-wrap" ref={wrapRef}>
      <div className="game-hud">
        <span>SCORE {String(score).padStart(4, "0")}</span>
        <span>BEST {String(highScore).padStart(4, "0")}</span>
      </div>
      <div
        className="canvas-shell"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <canvas ref={canvasRef} width={size} height={size} />
        {status !== "playing" && (
          <div className="overlay">
            {status === "ready" && (
              <>
                <p className="overlay-title">SNAKE.EXE</p>
                <p className="overlay-sub">arrows / WASD to move · swipe on mobile</p>
                <button className="btn" onClick={startGame}>
                  ▶ PRESS START
                </button>
              </>
            )}
            {status === "over" && (
              <>
                <p className="overlay-title">GAME OVER</p>
                <p className="overlay-sub">final score: {score}</p>
                <button className="btn" onClick={startGame}>
                  ↻ PLAY AGAIN
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
