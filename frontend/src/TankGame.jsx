import React, { useEffect, useRef, useState, useCallback } from "react";

// Web Audio API Sound FX
let actx = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === "suspended") actx.resume();
  return actx;
}

function tone({ freq = 440, duration = 0.1, type = "square", volume = 0.15, glideTo = null }) {
  try {
    const ctx = getCtx();
    if (!ctx) return;
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
  } catch (e) {
    // Audio safe fail
  }
}

function boom({ duration = 0.3, volume = 0.22 }) {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch (e) {
    // Audio safe fail
  }
}

const sfx = {
  fire: () => {
    boom({ duration: 0.18, volume: 0.18 });
    tone({ freq: 90, duration: 0.15, type: "square", volume: 0.1, glideTo: 40 });
  },
  hit: () => tone({ freq: 240, duration: 0.12, type: "sawtooth", volume: 0.16, glideTo: 70 }),
  explode: () => boom({ duration: 0.5, volume: 0.35 }),
  win: () => {
    tone({ freq: 300, duration: 0.2, type: "triangle", volume: 0.15, glideTo: 600 });
    setTimeout(() => tone({ freq: 600, duration: 0.4, type: "square", volume: 0.2, glideTo: 900 }), 180);
  },
  lose: () => tone({ freq: 260, duration: 0.7, type: "sawtooth", volume: 0.25, glideTo: 30 }),
};

const ARENA = 800;
const TANK_MAX_HP = 100;
const PLAYER_TURN_SPEED = 2.8;
const PLAYER_MOVE_SPEED = 160;
const TURRET_TURN_SPEED = 3.6;
const SHELL_SPEED = 480;
const RELOAD_TIME = 0.9;
const TANK_RADIUS = 20;

function makeObstacles() {
  const list = [];
  const count = 6;
  for (let i = 0; i < count; i++) {
    const w = 60 + Math.random() * 70;
    const h = 60 + Math.random() * 70;
    list.push({
      x: 120 + Math.random() * (ARENA - 240 - w),
      y: 120 + Math.random() * (ARENA - 240 - h),
      w,
      h,
    });
  }
  return list;
}

function circleRectCollide(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  return Math.hypot(cx - nx, cy - ny) < r;
}

function lineIntersectsRect(x1, y1, x2, y2, rect) {
  const steps = 16;
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
  const [wave, setWave] = useState(1);
  const [hud, setHud] = useState({
    playerHp: TANK_MAX_HP,
    enemiesRemaining: 1,
    reloading: false,
    wave: 1,
  });

  const stateRef = useRef(null);
  const keysRef = useRef({});
  const aimRef = useRef({ x: 1, y: 0 });
  const shakeRef = useRef(0);
  const touchControls = useRef({ leftStick: { x: 0, y: 0 }, rightStick: { x: 0, y: 0 }, firing: false });

  // Responsive canvas size adjustment
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const updateSize = () => {
      const containerWidth = el.getBoundingClientRect().width;
      const targetSize = Math.min(Math.floor(containerWidth), 700);
      setSize(targetSize > 280 ? targetSize : 280);
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Initialize Wave / Enemies
  const spawnEnemies = (waveNum) => {
    const enemyCount = Math.min(1 + Math.floor(waveNum / 2), 3);
    const enemies = [];
    for (let i = 0; i < enemyCount; i++) {
      enemies.push({
        id: i,
        x: ARENA - 100 - i * 60,
        y: 100 + i * 140,
        hullAngle: Math.PI * 0.75,
        turretAngle: Math.PI * 0.75,
        hp: TANK_MAX_HP + (waveNum - 1) * 15,
        maxHp: TANK_MAX_HP + (waveNum - 1) * 15,
        reloading: false,
        reloadT: Math.random() * 0.8,
        speed: Math.min(110 + waveNum * 12, 175),
        turnSpeed: Math.min(1.8 + waveNum * 0.25, 3.2),
        reloadSpeed: Math.max(1.5 - waveNum * 0.12, 0.75),
      });
    }
    return enemies;
  };

  const setupLevel = useCallback((waveNum) => {
    stateRef.current = {
      wave: waveNum,
      obstacles: makeObstacles(),
      player: {
        x: 100,
        y: ARENA - 100,
        hullAngle: -Math.PI / 4,
        turretAngle: -Math.PI / 4,
        hp: TANK_MAX_HP,
        maxHp: TANK_MAX_HP,
        reloading: false,
        reloadT: 0,
      },
      enemies: spawnEnemies(waveNum),
      shells: [],
      particles: [],
    };
    setHud({
      playerHp: TANK_MAX_HP,
      enemiesRemaining: stateRef.current.enemies.length,
      reloading: false,
      wave: waveNum,
    });
  }, []);

  const startGame = useCallback(() => {
    setWave(1);
    setupLevel(1);
    setStatus("playing");
  }, [setupLevel]);

  const nextLevel = useCallback(() => {
    const nextW = wave + 1;
    setWave(nextW);
    setupLevel(nextW);
    setStatus("playing");
  }, [wave, setupLevel]);

  // Keyboard controls
  useEffect(() => {
    function down(e) {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === " " && status !== "playing") {
        if (status === "over_win") nextLevel();
        else startGame();
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
  }, [status, startGame, nextLevel]);

  // Aiming (Mouse)
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
    aimRef.current = { x: worldX - s.player.x, y: worldY - s.player.y };
  }

  function firePlayerShell() {
    const s = stateRef.current;
    if (!s || status !== "playing") return;
    const p = s.player;
    if (p.reloading || p.hp <= 0) return;

    p.reloading = true;
    p.reloadT = RELOAD_TIME;
    s.shells.push({
      x: p.x + Math.cos(p.turretAngle) * 26,
      y: p.y + Math.sin(p.turretAngle) * 26,
      vx: Math.cos(p.turretAngle) * SHELL_SPEED,
      vy: Math.sin(p.turretAngle) * SHELL_SPEED,
      owner: "player",
      life: 1.8,
    });
    sfx.fire();
    shakeRef.current = Math.min(shakeRef.current + 4, 8);
  }

  // Main Loop
  useEffect(() => {
    if (status !== "playing") return undefined;
    let raf;
    let last = performance.now();

    function tryMove(tank, nx, ny, obstacles) {
      for (const ob of obstacles) {
        if (circleRectCollide(nx, ny, TANK_RADIUS, ob)) return false;
      }
      return nx > TANK_RADIUS && nx < ARENA - TANK_RADIUS && ny > TANK_RADIUS && ny < ARENA - TANK_RADIUS;
    }

    function spawnBurst(s, x, y, color) {
      for (let i = 0; i < 10; i++) {
        s.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 220,
          vy: (Math.random() - 0.5) * 220,
          life: 0.45,
          color,
        });
      }
    }

    function update(dt) {
      const s = stateRef.current;
      if (!s) return;
      const p = s.player;
      const keys = keysRef.current;
      const tc = touchControls.current;

      // Player Movement
      let turn = 0;
      let forward = 0;
      if (keys["a"] || keys["arrowleft"]) turn -= 1;
      if (keys["d"] || keys["arrowright"]) turn += 1;
      if (keys["w"] || keys["arrowup"]) forward += 1;
      if (keys["s"] || keys["arrowdown"]) forward -= 1;

      // Mobile touch stick override
      if (Math.abs(tc.leftStick.x) > 0.2) turn += tc.leftStick.x;
      if (Math.abs(tc.leftStick.y) > 0.2) forward -= tc.leftStick.y;

      p.hullAngle += turn * PLAYER_TURN_SPEED * dt;
      if (forward !== 0) {
        const nx = p.x + Math.cos(p.hullAngle) * forward * PLAYER_MOVE_SPEED * dt;
        const ny = p.y + Math.sin(p.hullAngle) * forward * PLAYER_MOVE_SPEED * dt;
        if (tryMove(p, nx, ny, s.obstacles)) {
          p.x = nx;
          p.y = ny;
        }
      }

      // Turret Aiming
      if (Math.hypot(tc.rightStick.x, tc.rightStick.y) > 0.2) {
        aimRef.current = { x: tc.rightStick.x, y: tc.rightStick.y };
        if (tc.firing) firePlayerShell();
      }

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

      // Enemy AI (Hunting & Firing)
      s.enemies.forEach((e) => {
        if (e.hp <= 0) return;
        const toPlayer = Math.hypot(p.x - e.x, p.y - e.y);
        const hasLos = !s.obstacles.some((ob) => lineIntersectsRect(e.x, e.y, p.x, p.y, ob));

        // Predict player position
        const leadX = p.x;
        const leadY = p.y;
        const desiredAngle = Math.atan2(leadY - e.y, leadX - e.x);

        let d = desiredAngle - e.hullAngle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const mt = e.turnSpeed * dt;
        e.hullAngle += Math.max(-mt, Math.min(mt, d));

        // Pursuit logic: relentlessly track and close distance
        let moveDir = 1;
        if (toPlayer < 140) moveDir = -0.5; // Back away if too close
        else if (toPlayer < 240 && hasLos) moveDir = 0.2; // Circle & shoot

        const nx = e.x + Math.cos(e.hullAngle) * e.speed * moveDir * dt;
        const ny = e.y + Math.sin(e.hullAngle) * e.speed * moveDir * dt;
        if (tryMove(e, nx, ny, s.obstacles)) {
          e.x = nx;
          e.y = ny;
        } else {
          // Slide if hitting walls
          e.hullAngle += 0.8 * dt;
        }

        // Turret track
        let td = desiredAngle - e.turretAngle;
        while (td > Math.PI) td -= Math.PI * 2;
        while (td < -Math.PI) td += Math.PI * 2;
        e.turretAngle += Math.max(-mt * 1.5, Math.min(mt * 1.5, td));

        // Firing logic
        if (!e.reloading && Math.abs(td) < 0.25 && (hasLos || toPlayer < 350)) {
          e.reloading = true;
          e.reloadT = e.reloadSpeed + Math.random() * 0.4;
          s.shells.push({
            x: e.x + Math.cos(e.turretAngle) * 24,
            y: e.y + Math.sin(e.turretAngle) * 24,
            vx: Math.cos(e.turretAngle) * SHELL_SPEED,
            vy: Math.sin(e.turretAngle) * SHELL_SPEED,
            owner: "enemy",
            life: 1.8,
          });
          sfx.fire();
        }

        if (e.reloading) {
          e.reloadT -= dt;
          if (e.reloadT <= 0) e.reloading = false;
        }
      });

      // Shell mechanics & collisions
      s.shells = s.shells.filter((sh) => {
        const nx = sh.x + sh.vx * dt;
        const ny = sh.y + sh.vy * dt;

        // Obstacle hits
        for (const ob of s.obstacles) {
          if (nx > ob.x && nx < ob.x + ob.w && ny > ob.y && ny < ob.y + ob.h) {
            spawnBurst(s, nx, ny, "#ffaa44");
            return false;
          }
        }
        sh.x = nx;
        sh.y = ny;
        sh.life -= dt;
        if (sh.life <= 0 || nx < 0 || nx > ARENA || ny < 0 || ny > ARENA) return false;

        // Hit player
        if (sh.owner === "enemy") {
          if (Math.hypot(sh.x - p.x, sh.y - p.y) < TANK_RADIUS) {
            p.hp -= 20;
            sfx.hit();
            shakeRef.current = Math.min(shakeRef.current + 5, 12);
            spawnBurst(s, sh.x, sh.y, "#00aaff");
            return false;
          }
        }

        // Hit enemy
        if (sh.owner === "player") {
          for (const e of s.enemies) {
            if (e.hp > 0 && Math.hypot(sh.x - e.x, sh.y - e.y) < TANK_RADIUS) {
              e.hp -= 34;
              sfx.hit();
              shakeRef.current = Math.min(shakeRef.current + 4, 10);
              spawnBurst(s, sh.x, sh.y, "#ff3333");
              return false;
            }
          }
        }
        return true;
      });

      // Particles
      s.particles = s.particles.filter((pt) => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        return pt.life > 0;
      });

      shakeRef.current = Math.max(0, shakeRef.current - dt * 15);

      const livingEnemies = s.enemies.filter((e) => e.hp > 0);

      // Win / Loss triggers
      if (p.hp <= 0) {
        sfx.explode();
        setTimeout(() => sfx.lose(), 150);
        setStatus("over_lose");
        if (onGameOver) onGameOver({ won: false, wave: s.wave });
        return;
      }

      if (livingEnemies.length === 0) {
        sfx.explode();
        setTimeout(() => sfx.win(), 150);
        setStatus("over_win");
        if (onGameOver) onGameOver({ won: true, wave: s.wave });
        return;
      }

      setHud({
        playerHp: Math.max(0, Math.round(p.hp)),
        enemiesRemaining: livingEnemies.length,
        reloading: p.reloading,
        wave: s.wave,
      });
    }

    function drawTank(ctx, tank, baseColor, turretColor) {
      if (tank.hp <= 0) return;
      ctx.save();
      ctx.translate(tank.x, tank.y);
      ctx.rotate(tank.hullAngle);

      // Tank Treads
      ctx.fillStyle = "#11141a";
      ctx.fillRect(-20, -16, 40, 6);
      ctx.fillRect(-20, 10, 40, 6);

      // Tank Body Hull
      ctx.fillStyle = baseColor;
      ctx.fillRect(-17, -11, 34, 22);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-17, -11, 34, 22);
      ctx.restore();

      // Turret
      ctx.save();
      ctx.translate(tank.x, tank.y);
      ctx.rotate(tank.turretAngle);

      // Barrel
      ctx.fillStyle = turretColor;
      ctx.fillRect(0, -3, 26, 6);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, -3, 26, 6);

      // Turret Cap
      ctx.fillStyle = turretColor;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Health bar
      const barW = 36;
      const barH = 4;
      const maxHp = tank.maxHp || TANK_MAX_HP;
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(tank.x - barW / 2, tank.y - 28, barW, barH);
      ctx.fillStyle = tank.hp > maxHp * 0.4 ? "#00ff88" : "#ff3344";
      ctx.fillRect(tank.x - barW / 2, tank.y - 28, barW * Math.max(0, tank.hp / maxHp), barH);
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
      ctx.fillStyle = "#0c1017";
      ctx.fillRect(0, 0, size, size);
      ctx.translate(shakeX, shakeY);
      ctx.scale(scale, scale);

      // Tech Grid
      ctx.strokeStyle = "rgba(0, 170, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < ARENA; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, ARENA);
        ctx.stroke();
      }
      for (let gy = 0; gy < ARENA; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(ARENA, gy);
        ctx.stroke();
      }

      // Obstacles
      s.obstacles.forEach((ob) => {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        ctx.strokeStyle = "rgba(100, 140, 200, 0.4)";
        ctx.lineWidth = 2;
        ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
      });

      // Particles
      s.particles.forEach((pt) => {
        ctx.globalAlpha = Math.max(0, pt.life / 0.45);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Projectiles
      s.shells.forEach((sh) => {
        ctx.strokeStyle = sh.owner === "player" ? "#00f0ff" : "#ff3355";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x - sh.vx * 0.02, sh.y - sh.vy * 0.02);
        ctx.stroke();
      });

      // Red Enemy Tanks
      s.enemies.forEach((e) => {
        drawTank(ctx, e, "#cc1133", "#ff3355");
      });

      // Blue Player Tank
      drawTank(ctx, s.player, "#0066cc", "#00b4d8");

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
  }, [status, size, onGameOver]);

  // Touch controls support for Mobile
  const handleTouchStick = (e, stick) => {
    const touch = e.targetTouches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = (touch.clientX - centerX) / (rect.width / 2);
    const dy = (touch.clientY - centerY) / (rect.height / 2);
    touchControls.current[stick] = { x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) };
    if (stick === "rightStick") touchControls.current.firing = true;
  };

  const handleTouchEnd = (stick) => {
    touchControls.current[stick] = { x: 0, y: 0 };
    if (stick === "rightStick") touchControls.current.firing = false;
  };

  return (
    <div className="tank-wrapper" ref={wrapRef}>
      <style>{`
        .tank-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          background: #06090e;
          padding: 12px;
          border-radius: 12px;
          color: #f1f5f9;
          user-select: none;
          touch-action: none;
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
        }
        .tank-hud {
          display: flex;
          justify-content: space-between;
          width: 100%;
          padding: 8px 12px;
          margin-bottom: 8px;
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
        }
        .hud-player { color: #38bdf8; }
        .hud-enemy { color: #f87171; }
        .hud-wave { color: #fbbf24; }
        .canvas-shell {
          position: relative;
          border: 2px solid #1e293b;
          border-radius: 8px;
          overflow: hidden;
          background: #000;
          cursor: crosshair;
        }
        .tank-overlay {
          position: absolute;
          inset: 0;
          background: rgba(8, 12, 20, 0.88);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 20px;
        }
        .tank-title {
          font-size: 26px;
          font-weight: 800;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }
        .tank-sub {
          font-size: 13px;
          color: #94a3b8;
          max-width: 320px;
          margin-bottom: 20px;
          line-height: 1.4;
        }
        .tank-btn {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 10px 24px;
          font-size: 15px;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .tank-btn:hover {
          background: #1d4ed8;
        }
        .mobile-controls {
          display: flex;
          justify-content: space-between;
          width: 100%;
          margin-top: 12px;
        }
        .touch-pad {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: 2px dashed rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: #94a3b8;
        }
      `}</style>

      <div className="tank-hud">
        <span className="hud-player">YOU: {hud.playerHp} HP</span>
        <span className="hud-wave">STAGE {hud.wave}</span>
        <span className="hud-enemy">ENEMIES: {hud.enemiesRemaining}</span>
      </div>

      <div
        className="canvas-shell"
        onMouseMove={handlePointerMove}
        onMouseDown={firePlayerShell}
      >
        <canvas ref={canvasRef} width={size} height={size} />

        {status !== "playing" && (
          <div className="tank-overlay">
            {status === "ready" && (
              <>
                <p className="tank-title" style={{ color: "#38bdf8" }}>ARMORED COMBAT</p>
                <p className="tank-sub">
                  Desktop: <b>W/A/S/D</b> to drive, <b>Mouse</b> to aim, <b>Left Click</b> to fire.<br />
                  Mobile: Use on-screen pads below. Hunt the red tanks before they surround you!
                </p>
                <button className="tank-btn" onClick={startGame}>START MISSION</button>
              </>
            )}
            {status === "over_win" && (
              <>
                <p className="tank-title" style={{ color: "#4ade80" }}>SECTOR CLEARED!</p>
                <p className="tank-sub">Wave {wave} neutralized. The next squad has reinforced defense and heavy firepower.</p>
                <button className="tank-btn" onClick={nextLevel}>NEXT WAVE ({wave + 1})</button>
              </>
            )}
            {status === "over_lose" && (
              <>
                <p className="tank-title" style={{ color: "#ef4444" }}>MISSION FAILED</p>
                <p className="tank-sub">Your tank was taken down in Stage {wave}.</p>
                <button className="tank-btn" onClick={startGame}>TRY AGAIN</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Touch Joysticks for Mobile */}
      <div className="mobile-controls">
        <div
          className="touch-pad"
          onTouchMove={(e) => handleTouchStick(e, "leftStick")}
          onTouchEnd={() => handleTouchEnd("leftStick")}
        >
          DRIVE
        </div>
        <div
          className="touch-pad"
          style={{ borderColor: "rgba(239, 68, 68, 0.4)" }}
          onTouchMove={(e) => handleTouchStick(e, "rightStick")}
          onTouchEnd={() => handleTouchEnd("rightStick")}
        >
          AIM & FIRE
        </div>
      </div>
    </div>
  );
}