import React, { useEffect, useRef, useState, useCallback } from "react";

// Web Audio API engine for realistic low-latency tactical sound effects
let actx = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === "suspended") actx.resume();
  return actx;
}

function playSfx(type) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "stealthTakedown") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.3);
    } else if (type === "heavyShot") {
      osc.type = "square";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.22);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.22);
    } else if (type === "bossAlarm") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(640, now + 0.2);
      osc.frequency.linearRampToValueAtTime(320, now + 0.4);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.4);
    } else if (type === "victory") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.35);
    } else if (type === "defeat") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.5);
    }
  } catch (e) {
    // Graceful fallback for restricted environments
  }
}

const ARENA = 800;
const PLAYER_RADIUS = 18;
const BASE_FOV = Math.PI / 2.8; // ~64 degrees vision

// Balanced arena layout with cover barriers
const MAP_OBSTACLES = [
  { x: 130, y: 130, w: 90, h: 90 },
  { x: 580, y: 130, w: 90, h: 90 },
  { x: 340, y: 180, w: 120, h: 80 },
  { x: 160, y: 350, w: 80, h: 100 },
  { x: 560, y: 350, w: 80, h: 100 },
  { x: 330, y: 530, w: 140, h: 80 },
  { x: 140, y: 570, w: 100, h: 90 },
  { x: 560, y: 570, w: 100, h: 90 },
];

function circleRectOverlap(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  return Math.hypot(cx - nx, cy - ny) < r;
}

function lineHitsObstacle(x1, y1, x2, y2, rect) {
  const stepCount = 15;
  for (let i = 0; i <= stepCount; i++) {
    const t = i / stepCount;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    if (px > rect.x && px < rect.x + rect.w && py > rect.y && py < rect.y + rect.h) {
      return true;
    }
  }
  return false;
}

// Generate valid random positions inside map
function getRandomWalkablePoint() {
  let attempts = 0;
  while (attempts < 50) {
    const px = 80 + Math.random() * (ARENA - 160);
    const py = 80 + Math.random() * (ARENA - 160);
    const hits = MAP_OBSTACLES.some((ob) => circleRectOverlap(px, py, 26, ob));
    if (!hits) return { x: px, y: py };
    attempts++;
  }
  return { x: 400, y: 400 };
}

export default function TankAssassinPro() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasDim, setCanvasDim] = useState(500);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState("ready"); // "ready" | "playing" | "cleared" | "game_over"
  const [stats, setStats] = useState({ remaining: 3, total: 3, hasBoss: false });

  const gameRef = useRef(null);
  const keyState = useRef({});
  const touchPoint = useRef(null);

  // Resize canvas automatically for mobile and desktop screens
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleResize = () => {
      const parentWidth = el.getBoundingClientRect().width;
      const target = Math.min(Math.floor(parentWidth), 680);
      setCanvasDim(target > 280 ? target : 280);
    };
    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Spawn tank squads: 3 at Level 1, scaling up; Level 5 & 10 have Heavy Boss Tanks
  const buildLevelSquad = useCallback((lvl) => {
    const isBossStage = lvl % 5 === 0;
    const standardCount = Math.min(2 + lvl, 7);
    const list = [];

    // Vision distance scales up as levels progress
    const visionRange = Math.min(230 + lvl * 18, 380);

    for (let i = 0; i < standardCount; i++) {
      const spawn = getRandomWalkablePoint();
      list.push({
        id: `soldier-${i}`,
        isBoss: false,
        x: spawn.x,
        y: spawn.y,
        radius: 17,
        angle: Math.random() * Math.PI * 2,
        speed: 65 + Math.min(lvl * 7, 70),
        turnSpeed: 1.8 + Math.min(lvl * 0.12, 1.2),
        visionRange,
        hp: 1,
        maxHp: 1,
        state: "patrol", // "patrol" | "search" | "hunt"
        navTarget: getRandomWalkablePoint(),
        retargetTimer: 1.0 + Math.random() * 2.0,
        fireDelay: 0,
        alive: true,
      });
    }

    // Heavy Boss Tanks every 5 levels
    if (isBossStage) {
      const bossSpawn = { x: ARENA / 2, y: 160 };
      list.push({
        id: "boss-unit",
        isBoss: true,
        x: bossSpawn.x,
        y: bossSpawn.y,
        radius: 30, // Larger physical size
        angle: Math.PI / 2,
        speed: 85 + lvl * 4,
        turnSpeed: 1.4,
        visionRange: visionRange + 80, // Massive vision range
        hp: 3 + Math.floor(lvl / 5) * 2,
        maxHp: 3 + Math.floor(lvl / 5) * 2,
        state: "patrol",
        navTarget: getRandomWalkablePoint(),
        retargetTimer: 2.0,
        fireDelay: 0,
        alive: true,
      });
    }

    return list;
  }, []);

  const loadStage = useCallback((lvl) => {
    const squad = buildLevelSquad(lvl);
    gameRef.current = {
      level: lvl,
      player: {
        x: 80,
        y: ARENA - 80,
        targetX: 80,
        targetY: ARENA - 80,
        angle: -Math.PI / 4,
        speed: 190,
        alive: true,
        cooldown: 0,
      },
      enemies: squad,
      shells: [],
      debris: [],
    };
    setStats({
      remaining: squad.length,
      total: squad.length,
      hasBoss: lvl % 5 === 0,
    });
    setGameState("playing");
  }, [buildLevelSquad]);

  const launchFirstStage = () => {
    setLevel(1);
    loadStage(1);
  };

  const advanceStage = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    loadStage(nextLvl);
  };

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      keyState.current[e.key.toLowerCase()] = true;
      if (e.key === " ") {
        if (gameState === "ready" || gameState === "game_over") launchFirstStage();
        if (gameState === "cleared") advanceStage();
      }
    }
    function handleKeyUp(e) {
      keyState.current[e.key.toLowerCase()] = false;
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState, level, loadStage]);

  // Touch and pointer direct targeting
  function setPlayerNavigation(e) {
    const canvas = canvasRef.current;
    if (!canvas || !gameRef.current || gameState !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvasDim;
    const py = ((e.clientY - rect.top) / rect.height) * canvasDim;
    const scale = canvasDim / ARENA;
    const worldX = px / scale;
    const worldY = py / scale;

    gameRef.current.player.targetX = worldX;
    gameRef.current.player.targetY = worldY;
    touchPoint.current = { x: worldX, y: worldY };
  }

  // Core Simulation Loop
  useEffect(() => {
    if (gameState !== "playing") return;
    let animId;
    let lastStamp = performance.now();

    function canStepTo(tankX, tankY, radius) {
      for (const ob of MAP_OBSTACLES) {
        if (circleRectOverlap(tankX, tankY, radius, ob)) return false;
      }
      return tankX > radius && tankX < ARENA - radius && tankY > radius && tankY < ARENA - radius;
    }

    function createExplosion(sim, x, y, color, count = 12) {
      for (let i = 0; i < count; i++) {
        sim.debris.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 280,
          vy: (Math.random() - 0.5) * 280,
          life: 0.45,
          color,
        });
      }
    }

    function step(dt) {
      const sim = gameRef.current;
      if (!sim) return;
      const player = sim.player;
      const keys = keyState.current;

      // 1. Player Navigation (WASD or Touch waypoint)
      let inputX = 0;
      let inputY = 0;
      if (keys["w"] || keys["arrowup"]) inputY -= 1;
      if (keys["s"] || keys["arrowdown"]) inputY += 1;
      if (keys["a"] || keys["arrowleft"]) inputX -= 1;
      if (keys["d"] || keys["arrowright"]) inputX += 1;

      if (inputX !== 0 || inputY !== 0) {
        const moveRad = Math.atan2(inputY, inputX);
        player.angle = moveRad;
        const nx = player.x + Math.cos(moveRad) * player.speed * dt;
        const ny = player.y + Math.sin(moveRad) * player.speed * dt;
        if (canStepTo(nx, ny, PLAYER_RADIUS)) {
          player.x = nx;
          player.y = ny;
        }
        player.targetX = player.x;
        player.targetY = player.y;
      } else {
        const dist = Math.hypot(player.targetX - player.x, player.targetY - player.y);
        if (dist > 6) {
          const moveRad = Math.atan2(player.targetY - player.y, player.targetX - player.x);
          player.angle = moveRad;
          const advance = Math.min(player.speed * dt, dist);
          const nx = player.x + Math.cos(moveRad) * advance;
          const ny = player.y + Math.sin(moveRad) * advance;
          if (canStepTo(nx, ny, PLAYER_RADIUS)) {
            player.x = nx;
            player.y = ny;
          } else {
            player.targetX = player.x;
            player.targetY = player.y;
          }
        }
      }

      if (player.cooldown > 0) player.cooldown -= dt;

      // 2. Assassin Ambush / Instant Takedown
      sim.enemies.forEach((en) => {
        if (!en.alive) return;
        const distToPlayer = Math.hypot(player.x - en.x, player.y - en.y);
        const ambushRange = en.radius + PLAYER_RADIUS + 12;

        if (distToPlayer < ambushRange && player.cooldown <= 0) {
          en.hp -= 1;
          player.cooldown = 0.35;
          if (en.hp <= 0) {
            en.alive = false;
            playSfx("stealthTakedown");
            createExplosion(sim, en.x, en.y, en.isBoss ? "#ffaa00" : "#ff3333", en.isBoss ? 24 : 14);
          } else {
            playSfx("heavyShot");
            createExplosion(sim, en.x, en.y, "#ff9900", 8);
          }
        }
      });

      // 3. Autonomous Active Tank AI (No Freezing, Constant Patrolling & Hunting)
      sim.enemies.forEach((en) => {
        if (!en.alive) return;
        if (en.fireDelay > 0) en.fireDelay -= dt;
        en.retargetTimer -= dt;

        const dPlayer = Math.hypot(player.x - en.x, player.y - en.y);
        const radToPlayer = Math.atan2(player.y - en.y, player.x - en.x);

        let dAngle = radToPlayer - en.angle;
        while (dAngle > Math.PI) dAngle -= Math.PI * 2;
        while (dAngle < -Math.PI) dAngle += Math.PI * 2;

        const inFov = Math.abs(dAngle) < BASE_FOV / 2 && dPlayer < en.visionRange;
        const lineBlocked = MAP_OBSTACLES.some((ob) => lineHitsObstacle(en.x, en.y, player.x, player.y, ob));

        // Detection and Alert Propagation
        if (inFov && !lineBlocked) {
          if (en.state !== "hunt") {
            playSfx(en.isBoss ? "bossAlarm" : "bossAlarm");
          }
          en.state = "hunt";
          en.navTarget = { x: player.x, y: player.y };
          en.retargetTimer = 3.0; // Continue hunting last known position
        } else if (en.retargetTimer <= 0) {
          en.state = "patrol";
          en.navTarget = getRandomWalkablePoint();
          en.retargetTimer = 2.5 + Math.random() * 3.0;
        }

        // Steer and move actively towards target
        const goalAngle = Math.atan2(en.navTarget.y - en.y, en.navTarget.x - en.x);
        let turnDiff = goalAngle - en.angle;
        while (turnDiff > Math.PI) turnDiff -= Math.PI * 2;
        while (turnDiff < -Math.PI) turnDiff += Math.PI * 2;

        const effectiveTurn = en.turnSpeed * (en.state === "hunt" ? 1.6 : 1.0);
        en.angle += Math.max(-effectiveTurn * dt, Math.min(effectiveTurn * dt, turnDiff));

        const forwardMult = en.state === "hunt" ? 1.25 : 0.85;
        const stepDist = en.speed * forwardMult * dt;
        const nx = en.x + Math.cos(en.angle) * stepDist;
        const ny = en.y + Math.sin(en.angle) * stepDist;

        if (canStepTo(nx, ny, en.radius)) {
          en.x = nx;
          en.y = ny;
        } else {
          // If colliding with a barrier, pick a new random target immediately to prevent freezing
          en.angle += (Math.random() > 0.5 ? 1 : -1) * 1.4 * dt;
          en.navTarget = getRandomWalkablePoint();
          en.retargetTimer = 2.0;
        }

        // Fire cannon when locked on player
        if (en.state === "hunt" && Math.abs(dAngle) < 0.28 && en.fireDelay <= 0 && !lineBlocked) {
          en.fireDelay = en.isBoss ? 0.75 : 1.2;
          const barrelLen = en.radius + 10;
          sim.shells.push({
            x: en.x + Math.cos(en.angle) * barrelLen,
            y: en.y + Math.sin(en.angle) * barrelLen,
            vx: Math.cos(en.angle) * 440,
            vy: Math.sin(en.angle) * 440,
            isBossShell: en.isBoss,
            life: 1.6,
          });
          playSfx("heavyShot");
        }
      });

      // 4. Shell Collision
      sim.shells = sim.shells.filter((sh) => {
        const nx = sh.x + sh.vx * dt;
        const ny = sh.y + sh.vy * dt;

        for (const ob of MAP_OBSTACLES) {
          if (nx > ob.x && nx < ob.x + ob.w && ny > ob.y && ny < ob.y + ob.h) return false;
        }

        sh.x = nx;
        sh.y = ny;
        sh.life -= dt;
        if (sh.life <= 0 || nx < 0 || nx > ARENA || ny < 0 || ny > ARENA) return false;

        // Shell hits player -> defeat
        if (Math.hypot(sh.x - player.x, sh.y - player.y) < PLAYER_RADIUS) {
          player.alive = false;
          createExplosion(sim, player.x, player.y, "#00aaff", 16);
          playSfx("defeat");
          setGameState("game_over");
          return false;
        }
        return true;
      });

      // 5. Debris particles
      sim.debris = sim.debris.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        return p.life > 0;
      });

      // Update counters
      const aliveTanks = sim.enemies.filter((e) => e.alive);
      setStats({
        remaining: aliveTanks.length,
        total: sim.enemies.length,
        hasBoss: sim.enemies.some((e) => e.isBoss && e.alive),
      });

      if (aliveTanks.length === 0) {
        playSfx("victory");
        setGameState("cleared");
      }
    }

    function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const sim = gameRef.current;
      if (!sim) return;

      const scale = canvasDim / ARENA;
      ctx.save();
      ctx.fillStyle = "#080c14"; // Stealth dark battlefield
      ctx.fillRect(0, 0, canvasDim, canvasDim);
      ctx.scale(scale, scale);

      // Map Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
      ctx.lineWidth = 1;
      for (let g = 0; g < ARENA; g += 40) {
        ctx.beginPath();
        ctx.moveTo(g, 0);
        ctx.lineTo(g, ARENA);
        ctx.moveTo(0, g);
        ctx.lineTo(ARENA, g);
        ctx.stroke();
      }

      // Vision Flashlight Cones
      sim.enemies.forEach((en) => {
        if (!en.alive) return;
        ctx.save();
        ctx.translate(en.x, en.y);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, en.visionRange, en.angle - BASE_FOV / 2, en.angle + BASE_FOV / 2);
        ctx.closePath();

        if (en.isBoss) {
          ctx.fillStyle = en.state === "hunt" ? "rgba(255, 140, 0, 0.42)" : "rgba(255, 170, 0, 0.18)";
        } else {
          ctx.fillStyle = en.state === "hunt" ? "rgba(255, 20, 20, 0.38)" : "rgba(255, 60, 60, 0.14)";
        }
        ctx.fill();
        ctx.restore();
      });

      // Cover Obstacles
      MAP_OBSTACLES.forEach((ob) => {
        ctx.fillStyle = "#151e2e";
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        ctx.strokeStyle = "#25344d";
        ctx.lineWidth = 2;
        ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
      });

      // Touch / Click Waypoint
      if (touchPoint.current) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
        ctx.beginPath();
        ctx.arc(sim.player.targetX, sim.player.targetY, 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Projectiles
      sim.shells.forEach((sh) => {
        ctx.fillStyle = sh.isBossShell ? "#ffaa00" : "#ff3344";
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, sh.isBossShell ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Particles
      sim.debris.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / 0.45);
        ctx.fillRect(p.x, p.y, 4, 4);
      });
      ctx.globalAlpha = 1;

      // Draw Enemy Tanks (Red Regulars & Gold Bosses)
      sim.enemies.forEach((en) => {
        if (!en.alive) return;
        ctx.save();
        ctx.translate(en.x, en.y);
        ctx.rotate(en.angle);

        const r = en.radius;
        // Tread Tracks
        ctx.fillStyle = "#11141a";
        ctx.fillRect(-r, -r * 0.85, r * 2, r * 0.35);
        ctx.fillRect(-r, r * 0.5, r * 2, r * 0.35);

        // Hull
        ctx.fillStyle = en.isBoss ? "#b45309" : "#dc2626";
        ctx.fillRect(-r * 0.8, -r * 0.6, r * 1.6, r * 1.2);

        // Cannon Turret
        ctx.fillStyle = en.isBoss ? "#f59e0b" : "#ef4444";
        ctx.fillRect(0, -r * 0.2, r * 1.4, r * 0.4);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Boss Health Bar Indicator
        if (en.isBoss && en.maxHp > 1) {
          const barW = 44;
          const barH = 5;
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(en.x - barW / 2, en.y - en.radius - 16, barW, barH);
          ctx.fillStyle = "#f59e0b";
          ctx.fillRect(en.x - barW / 2, en.y - en.radius - 16, barW * (en.hp / en.maxHp), barH);
        }
      });

      // Draw Blue Assassin Player Tank
      if (sim.player.alive) {
        ctx.save();
        ctx.translate(sim.player.x, sim.player.y);
        ctx.rotate(sim.player.angle);

        const r = PLAYER_RADIUS;
        // Treads
        ctx.fillStyle = "#091422";
        ctx.fillRect(-r, -r * 0.85, r * 2, r * 0.35);
        ctx.fillRect(-r, r * 0.5, r * 2, r * 0.35);

        // Body
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(-r * 0.8, -r * 0.6, r * 1.6, r * 1.2);

        // Cannon
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(0, -r * 0.2, r * 1.4, r * 0.4);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }

    function gameLoop(stamp) {
      const dt = Math.min((stamp - lastStamp) / 1000, 0.05);
      lastStamp = stamp;
      step(dt);
      render();
      animId = requestAnimationFrame(gameLoop);
    }

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, canvasDim]);

  return (
    <div className="tank-assassin-root" ref={containerRef}>
      <style>{`
        .tank-assassin-root {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
          background: #04070c;
          padding: 12px;
          border-radius: 12px;
          color: #f1f5f9;
          user-select: none;
          touch-action: none;
          width: 100%;
          max-width: 700px;
          margin: 0 auto;
        }
        .hud-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 10px 16px;
          margin-bottom: 8px;
          background: #0e1626;
          border: 1px solid #1e2c47;
          border-radius: 8px;
          font-weight: 800;
          font-size: 13px;
        }
        .hud-lvl { color: #38bdf8; }
        .hud-boss { color: #f59e0b; animation: pulse 1s infinite alternate; }
        .hud-count { color: #f43f5e; }
        @keyframes pulse { from { opacity: 0.7; } to { opacity: 1; } }
        .screen-shell {
          position: relative;
          border: 2px solid #1e293b;
          border-radius: 8px;
          overflow: hidden;
          background: #080c14;
          cursor: crosshair;
        }
        .modal-shade {
          position: absolute;
          inset: 0;
          background: rgba(4, 7, 12, 0.9);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 24px;
        }
        .headline {
          font-size: 26px;
          font-weight: 900;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }
        .subline {
          font-size: 13px;
          color: #94a3b8;
          max-width: 320px;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .action-btn {
          background: #0284c7;
          color: #fff;
          border: none;
          padding: 12px 28px;
          font-size: 15px;
          font-weight: 800;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .action-btn:hover { background: #0369a1; }
      `}</style>

      <div className="hud-bar">
        <span className="hud-lvl">STAGE {level}</span>
        {stats.hasBoss && <span className="hud-boss">⚠ BOSS DETECTED ⚠</span>}
        <span className="hud-count">
          TARGETS LEFT: {stats.remaining} / {stats.total}
        </span>
      </div>

      <div
        className="screen-shell"
        onPointerDown={setPlayerNavigation}
        onPointerMove={(e) => {
          if (e.buttons === 1) setPlayerNavigation(e);
        }}
      >
        <canvas ref={canvasRef} width={canvasDim} height={canvasDim} />

        {gameState !== "playing" && (
          <div className="modal-shade">
            {gameState === "ready" && (
              <>
                <p className="headline" style={{ color: "#38bdf8" }}>
                  TANK ASSASSIN PRO
                </p>
                <p className="subline">
                  Sneak behind enemy tanks to ambush them without entering their flashlights.
                  <br />
                  <b>Stage 1 starts with 3 patrolling tanks.</b>
                  <br />
                  <b>Controls:</b> Tap/Drag to move, or use <b>WASD</b>.
                </p>
                <button className="action-btn" onClick={launchFirstStage}>
                  START MISSION
                </button>
              </>
            )}

            {gameState === "cleared" && (
              <>
                <p className="headline" style={{ color: "#4ade80" }}>
                  STAGE {level} CLEARED!
                </p>
                <p className="subline">
                  Sector secure. Next stage brings more tanks, wider search paths
                  {level + 1 === 5 || (level + 1) % 5 === 0 ? ", and a HEAVY BOSS TANK!" : "."}
                </p>
                <button className="action-btn" onClick={advanceStage}>
                  NEXT STAGE ({level + 1})
                </button>
              </>
            )}

            {gameState === "game_over" && (
              <>
                <p className="headline" style={{ color: "#ef4444" }}>
                  ELIMINATED
                </p>
                <p className="subline">You were spotted and taken down in Stage {level}.</p>
                <button className="action-btn" onClick={launchFirstStage}>
                  RETRY
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}