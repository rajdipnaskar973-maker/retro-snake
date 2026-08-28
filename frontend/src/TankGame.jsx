import React, { useEffect, useRef, useState, useCallback } from "react";

// Audio synthesized via Web Audio API (zero asset loading lag)
let actx = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === "suspended") actx.resume();
  return actx;
}

function playSound(type) {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;

    if (type === "stealthKill") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(t + 0.25);
    } else if (type === "fire") {
      osc.type = "square";
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(t + 0.12);
    } else if (type === "alert") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.setValueAtTime(800, t + 0.08);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(t + 0.2);
    } else if (type === "win") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(700, t + 0.3);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(t + 0.3);
    } else if (type === "lose") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(t + 0.4);
    }
  } catch (e) {
    // safe audio fallback
  }
}

const ARENA = 800;
const TANK_RADIUS = 18;
const VISION_DISTANCE = 240;
const VISION_FOV = Math.PI / 3.2; // ~56 degree cone

function makeLevelMap(level) {
  // Balanced maze layout for stealth takedowns
  const baseObstacles = [
    { x: 160, y: 140, w: 100, h: 100 },
    { x: 540, y: 140, w: 100, h: 100 },
    { x: 350, y: 320, w: 100, h: 160 },
    { x: 160, y: 560, w: 120, h: 90 },
    { x: 520, y: 560, w: 120, h: 90 },
    { x: 140, y: 350, w: 90, h: 90 },
    { x: 570, y: 350, w: 90, h: 90 },
  ];
  return baseObstacles;
}

function circleRectCollide(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  return Math.hypot(cx - nx, cy - ny) < r;
}

function lineIntersectsRect(x1, y1, x2, y2, rect) {
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h) return true;
  }
  return false;
}

export default function TankAssassin({ onGameOver }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState(500);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState("ready"); // "ready", "playing", "level_clear", "game_over"
  const [kills, setKills] = useState({ remaining: 1, total: 1 });

  const stateRef = useRef(null);
  const keysRef = useRef({});
  const touchTarget = useRef(null);

  // Responsive Canvas scaling
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const updateSize = () => {
      const w = el.getBoundingClientRect().width;
      const finalSize = Math.min(Math.floor(w), 680);
      setSize(finalSize > 280 ? finalSize : 280);
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const spawnEnemies = (lvl) => {
    const count = lvl; // Level 1 = 1 tank, Level 2 = 2 tanks, Level 3 = 3 tanks...
    const list = [];
    const spawnPoints = [
      { x: 680, y: 120, a: Math.PI },
      { x: 680, y: 680, a: -Math.PI / 2 },
      { x: 120, y: 140, a: 0 },
      { x: 400, y: 120, a: Math.PI / 2 },
      { x: 400, y: 680, a: -Math.PI / 2 },
      { x: 680, y: 400, a: Math.PI },
    ];

    for (let i = 0; i < count; i++) {
      const pt = spawnPoints[i % spawnPoints.length];
      list.push({
        id: i,
        x: pt.x,
        y: pt.y,
        angle: pt.a,
        speed: 70 + Math.min(lvl * 10, 80),
        turnSpeed: 1.6 + Math.min(lvl * 0.15, 1.2),
        state: "patrol", // "patrol", "alert", "attack"
        patrolWaypoints: [
          { x: pt.x, y: pt.y },
          { x: 400 + (Math.random() - 0.5) * 300, y: 400 + (Math.random() - 0.5) * 300 },
          { x: 200 + Math.random() * 400, y: 200 + Math.random() * 400 },
        ],
        wpIndex: 0,
        waitTimer: 0,
        alertTimer: 0,
        shootCooldown: 0,
        alive: true,
      });
    }
    return list;
  };

  const startLevel = useCallback(
    (lvl) => {
      stateRef.current = {
        level: lvl,
        obstacles: makeLevelMap(lvl),
        player: {
          x: 100,
          y: 700,
          targetX: 100,
          targetY: 700,
          angle: -Math.PI / 4,
          speed: 180,
          alive: true,
          reloading: 0,
        },
        enemies: spawnEnemies(lvl),
        particles: [],
        shells: [],
      };
      setKills({ remaining: lvl, total: lvl });
      setStatus("playing");
    },
    []
  );

  const startGame = () => {
    setLevel(1);
    startLevel(1);
  };

  const nextLevel = () => {
    const nextL = level + 1;
    setLevel(nextL);
    startLevel(nextL);
  };

  // Keyboard controls
  useEffect(() => {
    function down(e) {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === " ") {
        if (status === "ready" || status === "game_over") startGame();
        if (status === "level_clear") nextLevel();
      }
    }
    function up(e) {
      keysRef.current[e.key.toLowerCase()] = false;
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [status, level, startLevel]);

  // Handle pointer / touch tap-to-move like Hunter Assassin
  function handlePointerDown(e) {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current || status !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * size;
    const py = ((e.clientY - rect.top) / rect.height) * size;
    const scale = size / ARENA;
    const worldX = px / scale;
    const worldY = py / scale;

    stateRef.current.player.targetX = worldX;
    stateRef.current.player.targetY = worldY;
    touchTarget.current = { x: worldX, y: worldY };
  }

  function handlePointerMove(e) {
    if (e.buttons !== 1 || !stateRef.current || status !== "playing") return;
    handlePointerDown(e);
  }

  // Main Game Loop
  useEffect(() => {
    if (status !== "playing") return;
    let raf;
    let last = performance.now();

    function tryMove(tank, nx, ny, obstacles) {
      for (const ob of obstacles) {
        if (circleRectCollide(nx, ny, TANK_RADIUS, ob)) return false;
      }
      return nx > TANK_RADIUS && nx < ARENA - TANK_RADIUS && ny > TANK_RADIUS && ny < ARENA - TANK_RADIUS;
    }

    function addExplosion(s, x, y, color) {
      for (let i = 0; i < 14; i++) {
        s.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 260,
          vy: (Math.random() - 0.5) * 260,
          life: 0.4,
          color,
        });
      }
    }

    function update(dt) {
      const s = stateRef.current;
      if (!s) return;
      const p = s.player;
      const keys = keysRef.current;

      // ---- 1. Player Movement (WASD or Hunter Assassin Tap-to-move) ----
      let moveX = 0;
      let moveY = 0;

      if (keys["w"] || keys["arrowup"]) moveY -= 1;
      if (keys["s"] || keys["arrowdown"]) moveY += 1;
      if (keys["a"] || keys["arrowleft"]) moveX -= 1;
      if (keys["d"] || keys["arrowright"]) moveX += 1;

      if (moveX !== 0 || moveY !== 0) {
        const moveAngle = Math.atan2(moveY, moveX);
        p.angle = moveAngle;
        const nx = p.x + Math.cos(moveAngle) * p.speed * dt;
        const ny = p.y + Math.sin(moveAngle) * p.speed * dt;
        if (tryMove(p, nx, ny, s.obstacles)) {
          p.x = nx;
          p.y = ny;
        }
        p.targetX = p.x;
        p.targetY = p.y;
      } else {
        // Hunter Assassin Click-Path movement
        const distToTarget = Math.hypot(p.targetX - p.x, p.targetY - p.y);
        if (distToTarget > 6) {
          const moveAngle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
          p.angle = moveAngle;
          const step = Math.min(p.speed * dt, distToTarget);
          const nx = p.x + Math.cos(moveAngle) * step;
          const ny = p.y + Math.sin(moveAngle) * step;
          if (tryMove(p, nx, ny, s.obstacles)) {
            p.x = nx;
            p.y = ny;
          } else {
            p.targetX = p.x;
            p.targetY = p.y;
          }
        }
      }

      if (p.reloading > 0) p.reloading -= dt;

      // ---- 2. Assassin Ambush / Instant Takedown Check ----
      s.enemies.forEach((e) => {
        if (!e.alive) return;
        const distToPlayer = Math.hypot(p.x - e.x, p.y - e.y);

        // If player sneaks right behind enemy (within 40px radius) -> Instant Assassin Kill!
        if (distToPlayer < 42 && p.reloading <= 0) {
          e.alive = false;
          p.reloading = 0.4;
          playSound("stealthKill");
          addExplosion(s, e.x, e.y, "#ff3333");
        }
      });

      // ---- 3. Enemy Vision & AI ----
      s.enemies.forEach((e) => {
        if (!e.alive) return;
        if (e.shootCooldown > 0) e.shootCooldown -= dt;

        const toPlayer = Math.hypot(p.x - e.x, p.y - e.y);
        const angleToPlayer = Math.atan2(p.y - e.y, p.x - e.x);

        let angleDiff = angleToPlayer - e.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const inVisionCone = Math.abs(angleDiff) < VISION_FOV / 2 && toPlayer < VISION_DISTANCE;
        const hasLineOfSight = !s.obstacles.some((ob) => lineIntersectsRect(e.x, e.y, p.x, p.y, ob));

        // Detection check
        if (inVisionCone && hasLineOfSight) {
          if (e.state !== "attack") playSound("alert");
          e.state = "attack";
          e.alertTimer = 3.5; // Stays alerted for 3.5s
        } else if (e.alertTimer > 0) {
          e.alertTimer -= dt;
          e.state = "alert";
        } else {
          e.state = "patrol";
        }

        // Enemy Action
        if (e.state === "attack") {
          // Turn to player & fire
          e.angle += Math.max(-e.turnSpeed * 2 * dt, Math.min(e.turnSpeed * 2 * dt, angleDiff));
          if (Math.abs(angleDiff) < 0.25 && e.shootCooldown <= 0 && hasLineOfSight) {
            e.shootCooldown = 0.9;
            s.shells.push({
              x: e.x + Math.cos(e.angle) * 22,
              y: e.y + Math.sin(e.angle) * 22,
              vx: Math.cos(e.angle) * 450,
              vy: Math.sin(e.angle) * 450,
              life: 1.5,
            });
            playSound("fire");
          }
          // Move towards player
          if (toPlayer > 90) {
            const nx = e.x + Math.cos(e.angle) * (e.speed * 1.2) * dt;
            const ny = e.y + Math.sin(e.angle) * (e.speed * 1.2) * dt;
            if (tryMove(e, nx, ny, s.obstacles)) {
              e.x = nx;
              e.y = ny;
            }
          }
        } else {
          // Patrol route
          const targetWp = e.patrolWaypoints[e.wpIndex];
          const distToWp = Math.hypot(targetWp.x - e.x, targetWp.y - e.y);
          if (distToWp < 25) {
            if (e.waitTimer > 0) {
              e.waitTimer -= dt;
            } else {
              e.wpIndex = (e.wpIndex + 1) % e.patrolWaypoints.length;
              e.waitTimer = 1.0;
            }
          } else {
            const wpAngle = Math.atan2(targetWp.y - e.y, targetWp.x - e.x);
            let d = wpAngle - e.angle;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            e.angle += Math.max(-e.turnSpeed * dt, Math.min(e.turnSpeed * dt, d));
            const nx = e.x + Math.cos(e.angle) * e.speed * dt;
            const ny = e.y + Math.sin(e.angle) * e.speed * dt;
            if (tryMove(e, nx, ny, s.obstacles)) {
              e.x = nx;
              e.y = ny;
            }
          }
        }
      });

      // ---- 4. Shells & Kill logic ----
      s.shells = s.shells.filter((sh) => {
        const nx = sh.x + sh.vx * dt;
        const ny = sh.y + sh.vy * dt;

        for (const ob of s.obstacles) {
          if (nx > ob.x && nx < ob.x + ob.w && ny > ob.y && ny < ob.y + ob.h) return false;
        }

        sh.x = nx;
        sh.y = ny;
        sh.life -= dt;
        if (sh.life <= 0 || nx < 0 || nx > ARENA || ny < 0 || ny > ARENA) return false;

        // Shell hits player -> Game Over (One shot stealth penalty)
        if (Math.hypot(sh.x - p.x, sh.y - p.y) < TANK_RADIUS) {
          p.alive = false;
          addExplosion(s, p.x, p.y, "#00aaff");
          playSound("lose");
          setStatus("game_over");
          return false;
        }
        return true;
      });

      // ---- 5. Particles Update ----
      s.particles = s.particles.filter((pt) => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        return pt.life > 0;
      });

      // Update Kill Status
      const living = s.enemies.filter((e) => e.alive).length;
      setKills({ remaining: living, total: s.enemies.length });

      if (living === 0) {
        playSound("win");
        setStatus("level_clear");
      }
    }

    // ---- Canvas Renderer ----
    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const s = stateRef.current;
      if (!s) return;

      const scale = size / ARENA;
      ctx.save();
      ctx.fillStyle = "#090d14"; // Stealth dark ambient
      ctx.fillRect(0, 0, size, size);
      ctx.scale(scale, scale);

      // Floor Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let g = 0; g < ARENA; g += 50) {
        ctx.beginPath();
        ctx.moveTo(g, 0);
        ctx.lineTo(g, ARENA);
        ctx.moveTo(0, g);
        ctx.lineTo(ARENA, g);
        ctx.stroke();
      }

      // Vision Flashlight Cones (Hunter Assassin Look)
      s.enemies.forEach((e) => {
        if (!e.alive) return;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, VISION_DISTANCE, e.angle - VISION_FOV / 2, e.angle + VISION_FOV / 2);
        ctx.closePath();
        ctx.fillStyle =
          e.state === "attack"
            ? "rgba(255, 30, 30, 0.35)"
            : e.state === "alert"
            ? "rgba(255, 200, 0, 0.25)"
            : "rgba(255, 60, 60, 0.12)";
        ctx.fill();
        ctx.restore();
      });

      // Obstacles / Walls
      s.obstacles.forEach((ob) => {
        ctx.fillStyle = "#1b2434";
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        ctx.strokeStyle = "#2d3d56";
        ctx.lineWidth = 2;
        ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
      });

      // Tap Target indicator
      if (touchTarget.current) {
        ctx.strokeStyle = "rgba(0, 180, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(s.player.targetX, s.player.targetY, 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Shells
      ctx.fillStyle = "#ff3344";
      s.shells.forEach((sh) => {
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Particles
      s.particles.forEach((pt) => {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.life / 0.4);
        ctx.fillRect(pt.x, pt.y, 4, 4);
      });
      ctx.globalAlpha = 1;

      // Draw Red Enemy Tanks
      s.enemies.forEach((e) => {
        if (!e.alive) return;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);

        // Treads
        ctx.fillStyle = "#181a20";
        ctx.fillRect(-18, -14, 36, 5);
        ctx.fillRect(-18, 9, 36, 5);

        // Red Body
        ctx.fillStyle = "#d32f2f";
        ctx.fillRect(-14, -10, 28, 20);

        // Cannon
        ctx.fillStyle = "#ef5350";
        ctx.fillRect(0, -3, 24, 6);
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        // Alert Indicator over Tank
        if (e.state === "attack") {
          ctx.restore();
          ctx.save();
          ctx.translate(e.x, e.y - 25);
          ctx.fillStyle = "#ff1744";
          ctx.font = "bold 16px sans-serif";
          ctx.fillText("!", -3, 0);
        } else if (e.state === "alert") {
          ctx.restore();
          ctx.save();
          ctx.translate(e.x, e.y - 25);
          ctx.fillStyle = "#ffeb3b";
          ctx.font = "bold 16px sans-serif";
          ctx.fillText("?", -4, 0);
        }
        ctx.restore();
      });

      // Draw Blue Assassin Player Tank
      if (s.player.alive) {
        ctx.save();
        ctx.translate(s.player.x, s.player.y);
        ctx.rotate(s.player.angle);

        // Treads
        ctx.fillStyle = "#0b121e";
        ctx.fillRect(-18, -14, 36, 5);
        ctx.fillRect(-18, 9, 36, 5);

        // Blue Body
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(-14, -10, 28, 20);

        // Cannon
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(0, -3, 24, 6);
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [status, size]);

  return (
    <div className="assassin-wrap" ref={wrapRef}>
      <style>{`
        .assassin-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
          background: #05070a;
          padding: 12px;
          border-radius: 12px;
          color: #f8fafc;
          user-select: none;
          touch-action: none;
          width: 100%;
          max-width: 700px;
          margin: 0 auto;
        }
        .assassin-hud {
          display: flex;
          justify-content: space-between;
          width: 100%;
          padding: 10px 14px;
          margin-bottom: 8px;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          font-weight: 800;
          font-size: 14px;
        }
        .hud-lvl { color: #38bdf8; }
        .hud-kills { color: #f43f5e; }
        .canvas-container {
          position: relative;
          border: 2px solid #1e293b;
          border-radius: 8px;
          overflow: hidden;
          background: #090d14;
          cursor: crosshair;
        }
        .overlay {
          position: absolute;
          inset: 0;
          background: rgba(5, 7, 10, 0.88);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 20px;
        }
        .overlay-title {
          font-size: 26px;
          font-weight: 900;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }
        .overlay-sub {
          font-size: 13px;
          color: #94a3b8;
          max-width: 320px;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .btn-play {
          background: #0284c7;
          color: #fff;
          border: none;
          padding: 10px 24px;
          font-size: 15px;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
        }
        .btn-play:hover { background: #0369a1; }
      `}</style>

      <div className="assassin-hud">
        <span className="hud-lvl">LEVEL {level}</span>
        <span className="hud-kills">
          TARGETS LEFT: {kills.remaining} / {kills.total}
        </span>
      </div>

      <div
        className="canvas-container"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <canvas ref={canvasRef} width={size} height={size} />

        {status !== "playing" && (
          <div className="overlay">
            {status === "ready" && (
              <>
                <p className="overlay-title" style={{ color: "#38bdf8" }}>
                  TANK ASSASSIN
                </p>
                <p className="overlay-sub">
                  <b>Sneak behind Red Tanks</b> to destroy them instantly!
                  <br />
                  Stay out of the red vision flashlights.
                  <br />
                  <b>Controls:</b> Tap/Drag to move (Mobile & PC) or use <b>WASD</b>.
                </p>
                <button className="btn-play" onClick={startGame}>
                  START LEVEL 1
                </button>
              </>
            )}
            {status === "level_clear" && (
              <>
                <p className="overlay-title" style={{ color: "#4ade80" }}>
                  LEVEL {level} CLEARED!
                </p>
                <p className="overlay-sub">
                  All targets eliminated. Level {level + 1} adds <b>{level + 1} Enemy Tanks</b> and faster patrols!
                </p>
                <button className="btn-play" onClick={nextLevel}>
                  CONTINUE TO LEVEL {level + 1}
                </button>
              </>
            )}
            {status === "game_over" && (
              <>
                <p className="overlay-title" style={{ color: "#ef4444" }}>
                  SPOTTED & DESTROYED
                </p>
                <p className="overlay-sub">You were eliminated at Level {level}. Stay in the shadows and ambush from behind.</p>
                <button className="btn-play" onClick={startGame}>
                  RETRY FROM LEVEL 1
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}