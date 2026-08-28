import { useEffect, useRef, useState, useCallback } from "react";

let actx = null;
function getCtx() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === "suspended") actx.resume();
  return actx;
}
function tone({ freq = 440, duration = 0.1, type = "square", volume = 0.15, glideTo = null }) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}
function boom({ duration = 0.3, volume = 0.22 }) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

const sfx = {
  fire: () => { boom({ duration: 0.18, volume: 0.18 }); tone({ freq: 90, duration: 0.15, type: "square", volume: 0.1, glideTo: 40 }); },
  hit: () => tone({ freq: 200, duration: 0.15, type: "sawtooth", volume: 0.15, glideTo: 60 }),
  explode: () => boom({ duration: 0.5, volume: 0.28 }),
  engine: () => tone({ freq: 60, duration: 0.05, type: "sawtooth", volume: 0.03 }),
  win: () => tone({ freq: 440, duration: 0.5, type: "square", volume: 0.15, glideTo: 880 }),
  lose: () => tone({ freq: 220, duration: 0.6, type: "sawtooth", volume: 0.2, glideTo: 40 }),
};

const ARENA = 800;
const TANK_MAX_HP = 100;
const TANK_TURN_SPEED = 2.4; // rad/sec
const TANK_MOVE_SPEED = 130; // px/sec
const TURRET_TURN_SPEED = 3.2;
const SHELL_SPEED = 420;
const RELOAD_TIME = 1.3;
const TANK_RADIUS = 20;

function makeObstacles() {
  const list = [];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const w = 50 + Math.random() * 70;
    const h = 50 + Math.random() * 70;
    list.push({
      x: 100 + Math.random() * (ARENA - 200 - w),
      y: 100 + Math.random() * (ARENA - 200 - h),
      w, h,
    });
  }
  return list;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function circleRectCollide(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  return Math.hypot(cx - nx, cy - ny) < r;
}
function lineIntersectsRect(x1, y1, x2, y2, rect) {
  // sample along the line — cheap and good enough for this scale of arena
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h) return true;
  }
  return false;
}

export default function TankGame({ onGameOver }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState(480);
  const [status, setStatus] = useState("ready");
  const [hud, setHud] = useState({ playerHp: TANK_MAX_HP, enemyHp: TANK_MAX_HP, reloading: false });

  const stateRef = useRef(null);
  const keysRef = useRef({});
  const aimRef = useRef({ x: 1, y: 0 });
  const shakeRef = useRef(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setSize(Math.floor(entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const resetGame = useCallback(() => {
    stateRef.current = {
      obstacles: makeObstacles(),
      player: { x: 120, y: ARENA - 120, hullAngle: -Math.PI / 4, turretAngle: -Math.PI / 4, hp: TANK_MAX_HP, reloading: false, reloadT: 0 },
      enemy: {
        x: ARENA - 120, y: 120, hullAngle: Math.PI * 0.75, turretAngle: Math.PI * 0.75,
        hp: TANK_MAX_HP, reloading: false, reloadT: 0,
        mode: "patrol", patrolTarget: null, patrolWait: 0,
      },
      shells: [],
      particles: [],
    };
    setHud({ playerHp: TANK_MAX_HP, enemyHp: TANK_MAX_HP, reloading: false });
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    setStatus("playing");
  }, [resetGame]);

  useEffect(() => {
    function down(e) {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === " " && status !== "playing") startGame();
    }
    function up(e) { keysRef.current[e.key.toLowerCase()] = false; }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function handlePointerMove(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * size;
    const py = ((e.clientY - rect.top) / rect.height) * size;
    const s = stateRef.current;
    if (!s) return;
    const scale = size / ARENA;
    const worldX = px / scale;
    const worldY = py / scale;
    const dx = worldX - s.player.x;
    const dy = worldY - s.player.y;
    aimRef.current = { x: dx, y: dy };
  }

  function playerFire() {
    const s = stateRef.current;
    if (!s || status !== "playing") return;
    const p = s.player;
    if (p.reloading) return;
    p.reloading = true;
    p.reloadT = RELOAD_TIME;
    s.shells.push({
      x: p.x + Math.cos(p.turretAngle) * 24,
      y: p.y + Math.sin(p.turretAngle) * 24,
      vx: Math.cos(p.turretAngle) * SHELL_SPEED,
      vy: Math.sin(p.turretAngle) * SHELL_SPEED,
      owner: "player",
      life: 1.6,
    });
    sfx.fire();
    shakeRef.current = Math.min(shakeRef.current + 3, 7);
  }

  useEffect(() => {
    if (status !== "playing") return undefined;
    let raf;
    let last = performance.now();

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }

    function tryMove(tank, nx, ny, obstacles) {
      for (const ob of obstacles) {
        if (circleRectCollide(nx, ny, TANK_RADIUS, ob)) return false;
      }
      return nx > TANK_RADIUS && nx < ARENA - TANK_RADIUS && ny > TANK_RADIUS && ny < ARENA - TANK_RADIUS;
    }

    function update(dt) {
      const s = stateRef.current;
      if (!s) return;
      const p = s.player;
      const e = s.enemy;
      const keys = keysRef.current;

      // ---- player hull steering (tank-style: forward/back + turn) ----
      let turn = 0, forward = 0;
      if (keys["a"] || keys["arrowleft"]) turn -= 1;
      if (keys["d"] || keys["arrowright"]) turn += 1;
      if (keys["w"] || keys["arrowup"]) forward += 1;
      if (keys["s"] || keys["arrowdown"]) forward -= 1;
      p.hullAngle += turn * TANK_TURN_SPEED * dt;
      if (forward !== 0) {
        const nx = p.x + Math.cos(p.hullAngle) * forward * TANK_MOVE_SPEED * dt;
        const ny = p.y + Math.sin(p.hullAngle) * forward * TANK_MOVE_SPEED * dt;
        if (tryMove(p, nx, ny, s.obstacles)) { p.x = nx; p.y = ny; }
      }

      // turret follows mouse
      const targetAngle = Math.atan2(aimRef.current.y, aimRef.current.x);
      let diff = targetAngle - p.turretAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const maxTurn = TURRET_TURN_SPEED * dt;
      p.turretAngle += Math.max(-maxTurn, Math.min(maxTurn, diff));

      if (p.reloading) {
        p.reloadT -= dt;
        if (p.reloadT <= 0) p.reloading = false;
      }

      // ---- enemy AI ----
      const toPlayer = Math.hypot(p.x - e.x, p.y - e.y);
      const hasLos = !s.obstacles.some((ob) => lineIntersectsRect(e.x, e.y, p.x, p.y, ob));
      const canSeePlayer = hasLos && toPlayer < 480;

      if (canSeePlayer) {
        e.mode = "chase";
      } else if (e.mode === "chase") {
        e.mode = "patrol";
        e.patrolTarget = null;
      }

      if (e.mode === "chase") {
        const desiredAngle = Math.atan2(p.y - e.y, p.x - e.x);
        let d = desiredAngle - e.hullAngle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const mt = TANK_TURN_SPEED * dt;
        e.hullAngle += Math.max(-mt, Math.min(mt, d));

        // keep some distance — don't ram, hang back and shoot
        if (toPlayer > 220) {
          const nx = e.x + Math.cos(e.hullAngle) * TANK_MOVE_SPEED * 0.7 * dt;
          const ny = e.y + Math.sin(e.hullAngle) * TANK_MOVE_SPEED * 0.7 * dt;
          if (tryMove(e, nx, ny, s.obstacles)) { e.x = nx; e.y = ny; }
        } else if (toPlayer < 150) {
          const nx = e.x - Math.cos(e.hullAngle) * TANK_MOVE_SPEED * 0.5 * dt;
          const ny = e.y - Math.sin(e.hullAngle) * TANK_MOVE_SPEED * 0.5 * dt;
          if (tryMove(e, nx, ny, s.obstacles)) { e.x = nx; e.y = ny; }
        }

        // turret tracks player
        let td = desiredAngle - e.turretAngle;
        while (td > Math.PI) td -= Math.PI * 2;
        while (td < -Math.PI) td += Math.PI * 2;
        const mtt = TURRET_TURN_SPEED * dt;
        e.turretAngle += Math.max(-mtt, Math.min(mtt, td));

        // fire only when roughly aimed and reloaded and has line of sight
        if (!e.reloading && Math.abs(td) < 0.12 && hasLos) {
          e.reloading = true;
          e.reloadT = RELOAD_TIME + Math.random() * 0.6;
          s.shells.push({
            x: e.x + Math.cos(e.turretAngle) * 24,
            y: e.y + Math.sin(e.turretAngle) * 24,
            vx: Math.cos(e.turretAngle) * SHELL_SPEED,
            vy: Math.sin(e.turretAngle) * SHELL_SPEED,
            owner: "enemy",
            life: 1.6,
          });
          sfx.fire();
        }
      } else {
        // patrol: wander to random points
        if (!e.patrolTarget || Math.hypot(e.patrolTarget.x - e.x, e.patrolTarget.y - e.y) < 20) {
          if (e.patrolWait > 0) {
            e.patrolWait -= dt;
          } else {
            e.patrolTarget = { x: 100 + Math.random() * (ARENA - 200), y: 100 + Math.random() * (ARENA - 200) };
            e.patrolWait = 0.5;
          }
        } else {
          const desiredAngle = Math.atan2(e.patrolTarget.y - e.y, e.patrolTarget.x - e.x);
          let d = desiredAngle - e.hullAngle;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          const mt = TANK_TURN_SPEED * 0.6 * dt;
          e.hullAngle += Math.max(-mt, Math.min(mt, d));
          e.turretAngle = e.hullAngle;
          const nx = e.x + Math.cos(e.hullAngle) * TANK_MOVE_SPEED * 0.4 * dt;
          const ny = e.y + Math.sin(e.hullAngle) * TANK_MOVE_SPEED * 0.4 * dt;
          if (tryMove(e, nx, ny, s.obstacles)) { e.x = nx; e.y = ny; }
        }
      }

      if (e.reloading) {
        e.reloadT -= dt;
        if (e.reloadT <= 0) e.reloading = false;
      }

      // ---- shells ----
      s.shells = s.shells.filter((sh) => {
        const nx = sh.x + sh.vx * dt;
        const ny = sh.y + sh.vy * dt;
        for (const ob of s.obstacles) {
          if (nx > ob.x && nx < ob.x + ob.w && ny > ob.y && ny < ob.y + ob.h) {
            spawnBurst(s, nx, ny, "#ff8844");
            return false;
          }
        }
        sh.x = nx; sh.y = ny; sh.life -= dt;
        if (sh.life <= 0 || nx < 0 || nx > ARENA || ny < 0 || ny > ARENA) return false;

        const target = sh.owner === "player" ? e : p;
        if (Math.hypot(sh.x - target.x, sh.y - target.y) < TANK_RADIUS) {
          target.hp -= 18;
          sfx.hit();
          shakeRef.current = Math.min(shakeRef.current + 4, 10);
          spawnBurst(s, sh.x, sh.y, "#ffd479");
          return false;
        }
        return true;
      });

      s.particles = s.particles.filter((pt) => {
        pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
        return pt.life > 0;
      });
      shakeRef.current = Math.max(0, shakeRef.current - dt * 16);

      if (p.hp <= 0 || e.hp <= 0) {
        const won = e.hp <= 0;
        sfx.explode();
        setTimeout(() => (won ? sfx.win() : sfx.lose()), 200);
        setStatus("over");
        setHud({ playerHp: Math.max(0, Math.round(p.hp)), enemyHp: Math.max(0, Math.round(e.hp)), reloading: false, won });
        onGameOver && onGameOver({ won });
        return;
      }

      setHud({
        playerHp: Math.max(0, Math.round(p.hp)),
        enemyHp: Math.max(0, Math.round(e.hp)),
        reloading: p.reloading,
      });
    }

    function spawnBurst(s, x, y, color) {
      for (let i = 0; i < 8; i++) {
        s.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 200,
          vy: (Math.random() - 0.5) * 200,
          life: 0.4, color,
        });
      }
    }

    function drawTank(ctx, tank, bodyColor) {
      ctx.save();
      ctx.translate(tank.x, tank.y);
      ctx.rotate(tank.hullAngle);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(-18, -13, 36, 26);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(-18, -15, 36, 3);
      ctx.fillRect(-18, 12, 36, 3);
      ctx.restore();

      ctx.save();
      ctx.translate(tank.x, tank.y);
      ctx.rotate(tank.turretAngle);
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(0, -3, 26, 6);
      ctx.restore();
    }

    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const s = stateRef.current;
      if (!s) return;
      const scale = size / ARENA;
      const shakeX = (Math.random() - 0.5) * shakeRef.current;
      const shakeY = (Math.random() - 0.5) * shakeRef.current;

      ctx.save();
      ctx.fillStyle = "#0a0000";
      ctx.fillRect(0, 0, size, size);
      ctx.translate(shakeX, shakeY);
      ctx.scale(scale, scale);

      ctx.strokeStyle = "rgba(255,68,68,0.06)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < ARENA; gx += 50) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, ARENA); ctx.stroke(); }
      for (let gy = 0; gy < ARENA; gy += 50) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(ARENA, gy); ctx.stroke(); }

      s.obstacles.forEach((ob) => {
        ctx.fillStyle = "#3a1010";
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        ctx.strokeStyle = "rgba(255,68,68,0.3)";
        ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
      });

      s.particles.forEach((pt) => {
        ctx.globalAlpha = Math.max(0, pt.life / 0.4);
        ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      ctx.strokeStyle = "#ffd479";
      ctx.lineWidth = 2;
      s.shells.forEach((sh) => {
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x - sh.vx * 0.02, sh.y - sh.vy * 0.02);
        ctx.stroke();
      });

      drawTank(ctx, s.enemy, "#8a2020");
      drawTank(ctx, s.player, "#ffb000");

      // hp bars above tanks
      function bar(tank, hp, max) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(tank.x - 20, tank.y - 32, 40, 5);
        ctx.fillStyle = hp > max * 0.3 ? "#5cff5c" : "#ff4444";
        ctx.fillRect(tank.x - 20, tank.y - 32, 40 * Math.max(0, hp / max), 5);
      }
      bar(s.player, s.player.hp, TANK_MAX_HP);
      bar(s.enemy, s.enemy.hp, TANK_MAX_HP);

      ctx.restore();
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, size]);

  return (
    <div className="game-wrap" ref={wrapRef}>
      <div className="game-hud tank-hud">
        <span>YOU {hud.playerHp}</span>
        <span>{hud.reloading ? "RELOADING…" : "READY"}</span>
        <span>ENEMY {hud.enemyHp}</span>
      </div>
      <div
        className="canvas-shell"
        onMouseMove={handlePointerMove}
        onMouseDown={playerFire}
      >
        <canvas ref={canvasRef} width={size} height={size} />
        {status !== "playing" && (
          <div className="overlay">
            {status === "ready" && (
              <>
                <p className="overlay-title">TANK DUEL</p>
                <p className="overlay-sub">
                  W/S drive · A/D turn · mouse aims turret · click to fire
                  <br />
                  it won't shoot unless it can actually see you
                </p>
                <button className="btn" onClick={startGame}>▶ press start</button>
              </>
            )}
            {status === "over" && (
              <>
                <p className="overlay-title">{hud.won ? "VICTORY" : "DESTROYED"}</p>
                <button className="btn" onClick={startGame}>↻ rematch</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
