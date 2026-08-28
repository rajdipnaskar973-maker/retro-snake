import { useEffect, useRef, useState, useCallback } from "react";

const COLS = 10;
const ROWS = 20;
const BLOCK = 24;

const PIECES = [
  { shape: [[1,1,1,1]],         color: "#00ffff" },
  { shape: [[1,1],[1,1]],       color: "#ffff00" },
  { shape: [[0,1,0],[1,1,1]],   color: "#ff00ff" },
  { shape: [[1,0],[1,0],[1,1]], color: "#ff8800" },
  { shape: [[0,1],[0,1],[1,1]], color: "#0088ff" },
  { shape: [[0,1,1],[1,1,0]],   color: "#00ff00" },
  { shape: [[1,1,0],[0,1,1]],   color: "#ff4444" },
];

function randomPiece() {
  const p = PIECES[Math.floor(Math.random() * PIECES.length)];
  return { shape: p.shape, color: p.color,
    x: Math.floor(COLS/2) - Math.floor(p.shape[0].length/2), y: 0 };
}

function rotate(shape) {
  return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
}

function collides(board, piece, dx=0, dy=0, shape=piece.shape) {
  for (let r=0; r<shape.length; r++)
    for (let c=0; c<shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = piece.x+c+dx, ny = piece.y+r+dy;
      if (nx<0||nx>=COLS||ny>=ROWS) return true;
      if (ny>=0 && board[ny][nx]) return true;
    }
  return false;
}

export default function TetrisGame({ onGameOver, highScore }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("ready");
  const [score, setScore] = useState(0);
  const stateRef = useRef(null);

  const initState = useCallback(() => ({
    board: Array.from({length:ROWS}, () => Array(COLS).fill(null)),
    piece: randomPiece(), next: randomPiece(),
    score: 0, speed: 800, lastDrop: 0,
  }), []);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;
    const ctx = canvas.getContext("2d");
    const s = stateRef.current;
    ctx.fillStyle = "#140f08";
    ctx.fillRect(0, 0, COLS*BLOCK, ROWS*BLOCK);
    ctx.strokeStyle = "rgba(255,68,68,0.06)";
    for (let r=0; r<ROWS; r++) for (let c=0; c<COLS; c++) ctx.strokeRect(c*BLOCK,r*BLOCK,BLOCK,BLOCK);
    for (let r=0; r<ROWS; r++) for (let c=0; c<COLS; c++) {
      if (s.board[r][c]) {
        ctx.fillStyle = s.board[r][c];
        ctx.shadowColor = s.board[r][c]; ctx.shadowBlur = 6;
        ctx.fillRect(c*BLOCK+1, r*BLOCK+1, BLOCK-2, BLOCK-2);
      }
    }
    const { piece } = s;
    piece.shape.forEach((row,r) => row.forEach((cell,c) => {
      if (cell) {
        ctx.fillStyle = piece.color;
        ctx.shadowColor = piece.color; ctx.shadowBlur = 10;
        ctx.fillRect((piece.x+c)*BLOCK+1, (piece.y+r)*BLOCK+1, BLOCK-2, BLOCK-2);
      }
    }));
    ctx.shadowBlur = 0;
  }

  useEffect(() => {
    if (status !== "playing") { draw(); return; }
    let raf;
    function tick(ts) {
      const s = stateRef.current;
      if (ts - s.lastDrop >= s.speed) {
        s.lastDrop = ts;
        if (!collides(s.board, s.piece, 0, 1)) {
          s.piece.y++;
        } else {
          let gameOver = false;
          s.piece.shape.forEach((row,r) => row.forEach((cell,c) => {
            if (cell) {
              if (s.piece.y+r < 0) gameOver = true;
              else s.board[s.piece.y+r][s.piece.x+c] = s.piece.color;
            }
          }));
          if (gameOver) { setStatus("over"); onGameOver(s.score); return; }
          let cleared = 0;
          for (let r=ROWS-1; r>=0; r--) {
            if (s.board[r].every(c=>c)) {
              s.board.splice(r,1); s.board.unshift(Array(COLS).fill(null));
              cleared++; r++;
            }
          }
          s.score += [0,100,300,500,800][cleared]||0;
          s.speed = Math.max(200, s.speed - cleared*20);
          setScore(s.score);
          s.piece = s.next; s.next = randomPiece();
          if (collides(s.board, s.piece)) { setStatus("over"); onGameOver(s.score); return; }
        }
      }
      draw();
      raf = requestAnimationFrame(tick);
    }
    draw(); raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  useEffect(() => {
    function handleKey(e) {
      if (status !== "playing") { if (e.code==="Space") startGame(); return; }
      const s = stateRef.current;
      if (e.key==="ArrowLeft"  && !collides(s.board,s.piece,-1,0)) { s.piece.x--; draw(); }
      if (e.key==="ArrowRight" && !collides(s.board,s.piece,1,0))  { s.piece.x++; draw(); }
      if (e.key==="ArrowDown"  && !collides(s.board,s.piece,0,1))  { s.piece.y++; draw(); }
      if (e.key==="ArrowUp") {
        const rot = rotate(s.piece.shape);
        if (!collides(s.board,s.piece,0,0,rot)) { s.piece.shape=rot; draw(); }
      }
      if (e.key===" ") { while(!collides(s.board,s.piece,0,1)) s.piece.y++; draw(); }
      e.preventDefault();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [status]);

  function startGame() { stateRef.current=initState(); setScore(0); setStatus("playing"); }

  return (
    <div className="game-wrap">
      <div className="game-hud">
        <span>SCORE {String(score).padStart(6,"0")}</span>
        <span>BEST {String(highScore).padStart(6,"0")}</span>
      </div>
      <div className="canvas-shell" style={{aspectRatio:`${COLS*BLOCK}/${ROWS*BLOCK}`}}>
        <canvas ref={canvasRef} width={COLS*BLOCK} height={ROWS*BLOCK} style={{width:"100%",height:"100%",display:"block"}} />
        {status!=="playing" && (
          <div className="overlay">
            {status==="ready" && (<>
              <p className="overlay-title">TETRIS.EXE</p>
              <p className="overlay-sub">← → move · ↑ rotate · ↓ soft drop · Space hard drop</p>
              <button className="btn" onClick={startGame}>▶ PRESS START</button>
            </>)}
            {status==="over" && (<>
              <p className="overlay-title">GAME OVER</p>
              <p className="overlay-sub">final score: {score}</p>
              <button className="btn" onClick={startGame}>↻ PLAY AGAIN</button>
            </>)}
          </div>
        )}
      </div>
    </div>
  );
}