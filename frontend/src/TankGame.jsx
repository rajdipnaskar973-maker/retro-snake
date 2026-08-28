import React, { useEffect, useRef, useState, useCallback } from "react";

// Synthesized Tactical Military SFX Engine (Zero Asset Loading, Vercel/Render Safe)
let actx = null;
function getAudio() {
  if (typeof window === "undefined") return null;
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === "suspended") actx.resume();
  return actx;
}

function playAudio(type) {
  try {
    const ctx = getAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "kill") {
      // Punchy metallic crush & explosion
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.35);
    } else if (type === "cannon") {
      // Low boom recoil
      osc.type = "square";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.22);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.22);
    } else if (type === "alert") {
      // High-pitch stealth spotted stinger
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(950, now + 0.08);
      osc.frequency.linearRampToValueAtTime(600, now + 0.16);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.25);
    } else if (type === "bossSpawn") {
      // Deep war horn
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.4);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.6);
    } else if (type === "win") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.4);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.4);
    } else if (type === "defeat") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(15, now + 0.6);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.6);
    }
  } catch (e) {
    // Safe fail
  }
}

const ARENA = 800;
const TANK_RADIUS = 20;

// High-tech compound barricades with cover lanes
const MAP_OBSTACLES = [
  { x: 130, y: 130, w: 100, h: 90, color: "#161d2d" },
  { x: 570, y: 130, w: 100, h: 90, color: "#161d2d" },
  { x: 330, y: 170, w: 140, h: 80, color: "#1b2438" },
  { x: 150, y: 350, w: 90, h: 100, color: "#161d2d" },
  { x: 560, y: 350, w: 90, h: 100, color: "#161d2d" },
  { x: 330, y: 540, w: 140, h: 80, color: "#1b2438" },
  { x: 130, y: 580, w: 110, h: 90, color: "#161d2d" },
  { x: 560, y: 580, w: 110, h: 90, color: "#161d2d" },
];

function circleRectOverlap(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  return Math.hypot(cx - nx, cy - ny) < r;
}

function lineIntersectsRect(x1, y1, x2, y2, rect) {
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    if (px > rect.x && px < rect.x + rect.w && py > rect.y && py < rect.y + rect.h) {
      return true;
    }
  }
  return false;
}

function getSafeSpawn(minDistFromPlayer = 220) {
  let attempts = 0;
  while (attempts < 60) {
    const px = 90 + Math.random() * (ARENA - 180);
    const py = 90 + Math.random() * (ARENA - 180);
    const distToPlayer = Math.hypot(px - 100, py - 700);
    const hitsObstacle = MAP_OBSTACLES.some((ob) => circleRectOverlap(px, py, 35, ob));
    if (!hitsObstacle && distToPlayer > minDistFromPlayer) {
      return { x: px, y: py };
    }
    attempts++;
  }
  return { x: 650, y: 150 };
}

// Raycasting for dynamic realistic light occlusion
function castVisionRay(originX, originY, angle, maxDist, obstacles) {
  const step = 8;
  const count = Math.floor(maxDist / step);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let i = 1; i <= count; i++) {
    const rx = originX + cos * (i * step);
    const ry = originY + sin * (i * step);
    if (rx < 0 || rx > ARENA || ry < 0 || ry > ARENA) {
      return { x: rx, y: ry };
    }
    for (let o = 0; o < obstacles.length; o++) {
      const ob = obstacles[o];
      if (rx > ob.x && rx < ob.x + ob.w && ry > ob.y && ry < ob.y + ob.h) {
        return { x: rx, y: ry };
      }
    }
  }
  return { x: originX + cos * maxDist, y: originY + sin * maxDist };
}

export default function TankHunterPro() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState(520);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState("ready"); // "ready" | "playing" | "victory" | "defeated"
  const [hud, setHud] = useState({ left: 3, total: 3, isBoss: false, playerHp: 100, combo: 0 });

  const gameRef = useRef(null);
  const keyMap = useRef({});
  const touchAim = useRef(null);
  const shakeRef = useRef(0);

  // Responsive Canvas scaling
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const resize = () => {
      const w = el.getBoundingClientRect().width;
      const target = Math.min(Math.floor(w), 720);
      setSize(target > 280 ? target : 280);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Level Generator
  const generateLevel = useCallback((lvl) => {
    const isBoss = lvl % 5 === 0;
    const squadCount = Math.min(2 + lvl, 8); // Stage 1 starts with 3 tanks
    const enemies = [];

    // Scaling vision range & aggression
    const baseVision = Math.min(250 + lvl * 15, 420);

    for (let i = 0; i < squadCount; i++) {
      const pt = getSafeSpawn(240);
      enemies.push({
        id: `grunt-${i}`,
        type: "standard",
        x: pt.x,
        y: pt.y,
        radius: 19,
        hullAngle: Math.random() * Math.PI * 2,
        turretAngle: Math.random() * Math.PI * 2,
        speed: 72 + Math.min(lvl * 8, 85),
        turnSpeed: 1.8 + Math.min(lvl * 0.15, 1.3),
        visionRange: baseVision,
        visionFov: Math.PI / 2.8,
        hp: 1,
        maxHp: 1,
        state: "patrol", // "patrol" | "search" | "hunt"
        navTarget: getSafeSpawn(0),
        retargetT: 1.5 + Math.random() * 2.5,
        fireCooldown: 0,
        alive: true,
        recoil: 0,
      });
    }

    // Heavy Boss Tanks at every 5th stage
    if (isBoss) {
      playAudio("bossSpawn");
      enemies.push({
        id: `boss-tank-${lvl}`,
        type: "boss",
        x: ARENA / 2,
        y: 150,
        radius: 34,
        hullAngle: Math.PI / 2,
        turretAngle: Math.PI / 2,
        speed: 95 + lvl * 4,
        turnSpeed: 1.5,
        visionRange: baseVision + 90,
        visionFov: Math.PI / 2.5,
        hp: 4 + Math.floor(lvl / 5) * 3,
        maxHp: 4 + Math.floor(lvl / 5) * 3,
        state: "patrol",
        navTarget: getSafeSpawn(0),
        retargetT: 2.0,
        fireCooldown: 0,
        alive: true,
        recoil: 0,
      });
    }

    return enemies;
  }, []);

  const loadStage = useCallback((lvl) => {
    const enemies = generateLevel(lvl);
    gameRef.current = {
      level: lvl,
      player: {
        x: 100,
        y: 700,
        targetX: 100,
        targetY: 700,
        hullAngle: -Math.PI / 4,
        turretAngle: -Math.PI / 4,
        speed: 210,
        dashCooldown: 0,
        alive: true,
        cooldown: 0,
        recoil: 0,
      },
      enemies,
      shells: [],
      particles: [],
      treads: [],
      comboCount: 0,
    };
    setHud({
      left: enemies.length,
      total: enemies.length,
      isBoss: lvl % 5 === 0,
      playerHp: 100,
      combo: 0,
    });
    setStatus("playing");
  }, [generateLevel]);

  const startGame = () => {
    setLevel(1);
    loadStage(1);
  };

  const nextStage = () => {
    const nxt = level + 1;
    setLevel(nxt);
    loadStage(nxt);
  };

  // Keyboard controls
  useEffect(() => {
    function onDown(e) {
      keyMap.current[e.key.toLowerCase()] = true;
      if (e.key === " ") {
        if (status === "ready" || status === "defeated") startGame();
        if (status === "victory") nextStage();
      }
    }
    function onUp(e) {
      keyMap.current[e.key.toLowerCase()] = false;
    }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [status, level, loadStage]);

  // Touch & Pointer Navigation
  function handlePointer(e) {
    const canvas = canvasRef.current;
    if (!canvas || !gameRef.current || status !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * size;
    const py = ((e.clientY - rect.top) / rect.height) * size;
    const scale = size / ARENA;
    const wx = px / scale;
    const wy = py / scale;

    gameRef.current.player.targetX = wx;
    gameRef.current.player.targetY = wy;
    touchAim.current = { x: wx, y: wy };
  }

  // Main Loop
  useEffect(() => {
    if (status !== "playing") return;
    let anim;
    let last = performance.now();

    function canMoveTo(tx, ty, r) {
      for (let i = 0; i < MAP_OBSTACLES.length; i++) {
        if (circleRectOverlap(tx, ty, r, MAP_OBSTACLES[i])) return false;
      }
      return tx > r && tx < ARENA - r && ty > r && ty < ARENA - r;
    }

    function createExplosion(s, x, y, color, count = 16) {
      for (let i = 0; i < count; i++) {
        s.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 320,
          vy: (Math.random() - 0.5) * 320,
          life: 0.5,
          color,
          size: 3 + Math.random() * 4,
        });
      }
    }

    function update(dt) {
      const s = gameRef.current;
      if (!s) return;
      const p = s.player;
      const keys = keyMap.current;

      // 1. Player Realistic Movement & Physics
      let dx = 0;
      let dy = 0;
      if (keys["w"] || keys["arrowup"]) dy -= 1;
      if (keys["s"] || keys["arrowdown"]) dy += 1;
      if (keys["a"] || keys["arrowleft"]) dx -= 1;
      if (keys["d"] || keys["arrowright"]) dx += 1;

      let isMoving = false;
      if (dx !== 0 || dy !== 0) {
        const moveAngle = Math.atan2(dy, dx);
        p.hullAngle = moveAngle;
        p.turretAngle = moveAngle;
        const nx = p.x + Math.cos(moveAngle) * p.speed * dt;
        const ny = p.y + Math.sin(moveAngle) * p.speed * dt;
        if (canMoveTo(nx, ny, TANK_RADIUS)) {
          p.x = nx;
          p.y = ny;
          isMoving = true;
        }
        p.targetX = p.x;
        p.targetY = p.y;
      } else {
        const dist = Math.hypot(p.targetX - p.x, p.targetY - p.y);
        if (dist > 8) {
          const moveAngle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
          p.hullAngle = moveAngle;
          p.turretAngle = moveAngle;
          const advance = Math.min(p.speed * dt, dist);
          const nx = p.x + Math.cos(moveAngle) * advance;
          const ny = p.y + Math.sin(moveAngle) * advance;
          if (canMoveTo(nx, ny, TANK_RADIUS)) {
            p.x = nx;
            p.y = ny;
            isMoving = true;
          } else {
            p.targetX = p.x;
            p.targetY = p.y;
          }
        }
      }

      // Tread Marks
      if (isMoving && Math.random() < 0.3) {
        s.treads.push({ x: p.x, y: p.y, angle: p.hullAngle, life: 3.0 });
      }

      if (p.cooldown > 0) p.cooldown -= dt;
      if (p.recoil > 0) p.recoil = Math.max(0, p.recoil - dt * 25);

      // 2. Assassin Ambush / Instant Takedown
      s.enemies.forEach((en) => {
        if (!en.alive) return;
        const dist = Math.hypot(p.x - en.x, p.y - en.y);
        const ambushRange = en.radius + TANK_RADIUS + 14;

        if (dist < ambushRange && p.cooldown <= 0) {
          en.hp -= 1;
          p.cooldown = 0.35;
          p.recoil = 8;
          shakeRef.current = Math.min(shakeRef.current + 6, 14);

          if (en.hp <= 0) {
            en.alive = false;
            s.comboCount += 1;
            playAudio("kill");
            createExplosion(s, en.x, en.y, en.type === "boss" ? "#f59e0b" : "#ef4444", en.type === "boss" ? 32 : 18);
          } else {
            playAudio("cannon");
            createExplosion(s, en.x, en.y, "#f59e0b", 10);
          }
        }
      });

      // 3. Realistic High-Tech Enemy AI (No Freezing, Coordinated Swarm)
      s.enemies.forEach((en) => {
        if (!en.alive) return;
        if (en.fireCooldown > 0) en.fireCooldown -= dt;
        if (en.recoil > 0) en.recoil = Math.max(0, en.recoil - dt * 25);
        en.retargetT -= dt;

        const toPlayer = Math.hypot(p.x - en.x, p.y - en.y);
        const radToPlayer = Math.atan2(p.y - en.y, p.x - en.x);

        let dAngle = radToPlayer - en.turretAngle;
        while (dAngle > Math.PI) dAngle -= Math.PI * 2;
        while (dAngle < -Math.PI) dAngle += Math.PI * 2;

        const inCone = Math.abs(dAngle) < en.visionFov / 2 && toPlayer < en.visionRange;
        const obstructed = MAP_OBSTACLES.some((ob) => lineIntersectsRect(en.x, en.y, p.x, p.y, ob));

        // Detection Trigger
        if (inCone && !obstructed) {
          if (en.state !== "hunt") playAudio("alert");
          en.state = "hunt";
          en.navTarget = { x: p.x, y: p.y };
          en.retargetT = 3.5; // Relentlessly pursue
        } else if (en.retargetT <= 0) {
          en.state = "patrol";
          en.navTarget = getSafeSpawn(0);
          en.retargetT = 2.5 + Math.random() * 3.0;
        }

        // Steer Hull & Turret
        const targetGoal = Math.atan2(en.navTarget.y - en.y, en.navTarget.x - en.x);
        let turnDiff = targetGoal - en.hullAngle;
        while (turnDiff > Math.PI) turnDiff -= Math.PI * 2;
        while (turnDiff < -Math.PI) turnDiff += Math.PI * 2;

        const turnSpeed = en.turnSpeed * (en.state === "hunt" ? 1.6 : 1.0);
        en.hullAngle += Math.max(-turnSpeed * dt, Math.min(turnSpeed * dt, turnDiff));

        // Turret smoothly locks on target
        if (en.state === "hunt") {
          en.turretAngle += Math.max(-turnSpeed * 2 * dt, Math.min(turnSpeed * 2 * dt, dAngle));
        } else {
          en.turretAngle = en.hullAngle;
        }

        // Active Navigation
        const step = en.speed * (en.state === "hunt" ? 1.25 : 0.85) * dt;
        const nx = en.x + Math.cos(en.hullAngle) * step;
        const ny = en.y + Math.sin(en.hullAngle) * step;

        if (canMoveTo(nx, ny, en.radius)) {
          en.x = nx;
          en.y = ny;
        } else {
          // Re-navigate dynamically upon hitting a barrier
          en.hullAngle += (Math.random() > 0.5 ? 1 : -1) * 1.6 * dt;
          en.navTarget = getSafeSpawn(0);
          en.retargetT = 1.8;
        }

        // Precision Gun Fire
        if (en.state === "hunt" && Math.abs(dAngle) < 0.22 && en.fireCooldown <= 0 && !obstructed) {
          en.fireCooldown = en.type === "boss" ? 0.7 : 1.15;
          en.recoil = 9;
          shakeRef.current = Math.min(shakeRef.current + 4, 10);
          const barrelDist = en.radius + 14;
          s.shells.push({
            x: en.x + Math.cos(en.turretAngle) * barrelDist,
            y: en.y + Math.sin(en.turretAngle) * barrelDist,
            vx: Math.cos(en.turretAngle) * 460,
            vy: Math.sin(en.turretAngle) * 460,
            isBoss: en.type === "boss",
            life: 1.5,
          });
          playAudio("cannon");
        }
      });

      // 4. Heavy Shell Physics & Projectiles
      s.shells = s.shells.filter((sh) => {
        const nx = sh.x + sh.vx * dt;
        const ny = sh.y + sh.vy * dt;

        for (let o = 0; o < MAP_OBSTACLES.length; o++) {
          const ob = MAP_OBSTACLES[o];
          if (nx > ob.x && nx < ob.x + ob.w && ny > ob.y && ny < ob.y + ob.h) {
            createExplosion(s, nx, ny, "#f59e0b", 6);
            return false;
          }
        }

        sh.x = nx;
        sh.y = ny;
        sh.life -= dt;
        if (sh.life <= 0 || nx < 0 || nx > ARENA || ny < 0 || ny > ARENA) return false;

        // One-hit elimination stealth rule
        if (Math.hypot(sh.x - p.x, sh.y - p.y) < TANK_RADIUS) {
          p.alive = false;
          createExplosion(s, p.x, p.y, "#00f0ff", 22);
          shakeRef.current = 16;
          playAudio("defeat");
          setStatus("defeated");
          return false;
        }
        return true;
      });

      // 5. Particles & Shakes
      s.particles = s.particles.filter((pt) => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        return pt.life > 0;
      });

      s.treads = s.treads.filter((tr) => {
        tr.life -= dt;
        return tr.life > 0;
      });

      shakeRef.current = Math.max(0, shakeRef.current - dt * 18);

      const living = s.enemies.filter((e) => e.alive);
      setHud({
        left: living.length,
        total: s.enemies.length,
        isBoss: s.enemies.some((e) => e.type === "boss" && e.alive),
        playerHp: p.alive ? 100 : 0,
        combo: s.comboCount,
      });

      if (living.length === 0) {
        playAudio("win");
        setStatus("victory");
      }
    }

    // High-Resolution Canvas Rendering Engine
    function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const s = gameRef.current;
      if (!s) return;

      const scale = size / ARENA;
      const sx = (Math.random() - 0.5) * shakeRef.current;
      const sy = (Math.random() - 0.5) * shakeRef.current;

      ctx.save();
      ctx.fillStyle = "#050811"; // Tactical night vision ambient
      ctx.fillRect(0, 0, size, size);

      ctx.translate(sx, sy);
      ctx.scale(scale, scale);

      // Military Grid
      ctx.strokeStyle = "rgba(0, 180, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let g = 0; g < ARENA; g += 40) {
        ctx.beginPath();
        ctx.moveTo(g, 0);
        ctx.lineTo(g, ARENA);
        ctx.moveTo(0, g);
        ctx.lineTo(ARENA, g);
        ctx.stroke();
      }

      // Tread Marks on Ground
      s.treads.forEach((tr) => {
        ctx.save();
        ctx.translate(tr.x, tr.y);
        ctx.rotate(tr.angle);
        ctx.fillStyle = `rgba(0, 0, 0, ${tr.life * 0.15})`;
        ctx.fillRect(-12, -14, 24, 4);
        ctx.fillRect(-12, 10, 24, 4);
        ctx.restore();
      });

      // Raytraced Realistic Vision Flashlights
      s.enemies.forEach((en) => {
        if (!en.alive) return;
        const rayCount = 28;
        const startA = en.turretAngle - en.visionFov / 2;
        const stepA = en.visionFov / rayCount;

        ctx.beginPath();
        ctx.moveTo(en.x, en.y);
        for (let r = 0; r <= rayCount; r++) {
          const a = startA + r * stepA;
          const hit = castVisionRay(en.x, en.y, a, en.visionRange, MAP_OBSTACLES);
          ctx.lineTo(hit.x, hit.y);
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(en.x, en.y, 10, en.x, en.y, en.visionRange);
        if (en.type === "boss") {
          grad.addColorStop(0, en.state === "hunt" ? "rgba(255, 140, 0, 0.55)" : "rgba(255, 180, 0, 0.28)");
          grad.addColorStop(1, "rgba(255, 140, 0, 0.01)");
        } else {
          grad.addColorStop(0, en.state === "hunt" ? "rgba(255, 30, 30, 0.5)" : "rgba(255, 60, 60, 0.22)");
          grad.addColorStop(1, "rgba(255, 30, 30, 0.01)");
        }
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // Tactical Barricades & Hard Cover
      MAP_OBSTACLES.forEach((ob) => {
        // Outer Shadow
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(ob.x + 6, ob.y + 6, ob.w, ob.h);

        // Core Block
        ctx.fillStyle = ob.color;
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);

        // Tech Border Trim
        ctx.strokeStyle = "#25344f";
        ctx.lineWidth = 2;
        ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);

        // Inner Hazard Stripes
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ob.x + 8, ob.y + 8);
        ctx.lineTo(ob.x + ob.w - 8, ob.y + ob.h - 8);
        ctx.stroke();
      });

      // Touch Target Indicator
      if (touchAim.current) {
        ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
        ctx.beginPath();
        ctx.arc(s.player.targetX, s.player.targetY, 7, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Shell Projectiles & Tracers
      s.shells.forEach((sh) => {
        ctx.save();
        ctx.fillStyle = sh.isBoss ? "#f59e0b" : "#ff2244";
        ctx.shadowColor = sh.isBoss ? "#f59e0b" : "#ff2244";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, sh.isBoss ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Dynamic Debris Particles
      s.particles.forEach((pt) => {
        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.life / 0.5);
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
        ctx.restore();
      });

      // Realistic Red Enemy Tanks & Boss Tanks
      s.enemies.forEach((en) => {
        if (!en.alive) return;
        const r = en.radius;

        ctx.save();
        ctx.translate(en.x, en.y);

        // Hull
        ctx.save();
        ctx.rotate(en.hullAngle);
        ctx.fillStyle = "#0c0f17";
        ctx.fillRect(-r * 1.1, -r * 0.95, r * 2.2, r * 0.45);
        ctx.fillRect(-r * 1.1, r * 0.5, r * 2.2, r * 0.45);

        ctx.fillStyle = en.type === "boss" ? "#b45309" : "#b91c1c";
        ctx.fillRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.4);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.strokeRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.4);
        ctx.restore();

        // Turret with Dynamic Recoil
        ctx.save();
        ctx.rotate(en.turretAngle);
        ctx.fillStyle = en.type === "boss" ? "#d97706" : "#dc2626";
        const recoilOffset = en.recoil;
        ctx.fillRect(0 - recoilOffset, -r * 0.18, r * 1.5, r * 0.36);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.strokeRect(0 - recoilOffset, -r * 0.18, r * 1.5, r * 0.36);

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore();

        // Boss Armor Health Gauge
        if (en.type === "boss" && en.maxHp > 1) {
          const bw = 54;
          const bh = 6;
          ctx.fillStyle = "rgba(0,0,0,0.8)";
          ctx.fillRect(en.x - bw / 2, en.y - en.radius - 18, bw, bh);
          ctx.fillStyle = "#f59e0b";
          ctx.fillRect(en.x - bw / 2, en.y - en.radius - 18, bw * (en.hp / en.maxHp), bh);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.strokeRect(en.x - bw / 2, en.y - en.radius - 18, bw, bh);
        }
      });

      // Realistic Blue Assassin Player Tank
      if (s.player.alive) {
        const p = s.player;
        const r = TANK_RADIUS;

        ctx.save();
        ctx.translate(p.x, p.y);

        // Hull
        ctx.save();
        ctx.rotate(p.hullAngle);
        ctx.fillStyle = "#070e1a";
        ctx.fillRect(-r * 1.1, -r * 0.95, r * 2.2, r * 0.45);
        ctx.fillRect(-r * 1.1, r * 0.5, r * 2.2, r * 0.45);

        ctx.fillStyle = "#0284c7";
        ctx.fillRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.4);
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.strokeRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.4);
        ctx.restore();

        // Turret
        ctx.save();
        ctx.rotate(p.turretAngle);
        ctx.fillStyle = "#38bdf8";
        const recoilOffset = p.recoil;
        ctx.fillRect(0 - recoilOffset, -r * 0.18, r * 1.5, r * 0.36);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.strokeRect(0 - recoilOffset, -r * 0.18, r * 1.5, r * 0.36);

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore();
      }

      ctx.restore();
    }

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      update(dt);
      render();
      anim = requestAnimationFrame(loop);
    }

    anim = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(anim);
  }, [status, size]);

  return (
    <div className="hunter-pro-root" ref={wrapRef}>
      <style>{`
        .hunter-pro-root {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
          background: #030509;
          padding: 14px;
          border-radius: 14px;
          color: #f8fafc;
          user-select: none;
          touch-action: none;
          width: 100%;
          max-width: 740px;
          margin: 0 auto;
        }
        .pro-hud {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 10px 18px;
          margin-bottom: 8px;
          background: #090d16;
          border: 1px solid #1a2336;
          border-radius: 8px;
          font-weight: 800;
          font-size: 13px;
        }
        .stage-txt { color: #38bdf8; }
        .boss-warning {
          color: #f59e0b;
          font-weight: 900;
          animation: blink 0.8s infinite alternate;
        }
        @keyframes blink { from { opacity: 0.5; } to { opacity: 1; } }
        .target-txt { color: #f43f5e; }
        .viewport {
          position: relative;
          border: 2px solid #1a2336;
          border-radius: 10px;
          overflow: hidden;
          background: #050811;
          cursor: crosshair;
        }
        .modal {
          position: absolute;
          inset: 0;
          background: rgba(3, 5, 9, 0.92);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 24px;
        }
        .title {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 1.5px;
          margin-bottom: 8px;
        }
        .sub {
          font-size: 13px;
          color: #94a3b8;
          max-width: 340px;
          margin-bottom: 22px;
          line-height: 1.5;
        }
        .btn-action {
          background: #0284c7;
          color: #ffffff;
          border: none;
          padding: 12px 30px;
          font-size: 15px;
          font-weight: 800;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-action:hover { background: #0369a1; }
      `}</style>

      <div className="pro-hud">
        <span className="stage-txt">STAGE {level}</span>
        {hud.isBoss && <span className="boss-warning">⚠ HEAVY BOSS BATTLE ⚠</span>}
        <span className="target-txt">
          TARGETS LEFT: {hud.left} / {hud.total}
        </span>
      </div>

      <div
        className="viewport"
        onPointerDown={handlePointer}
        onPointerMove={(e) => {
          if (e.buttons === 1) handlePointer(e);
        }}
      >
        <canvas ref={canvasRef} width={size} height={size} />

        {status !== "playing" && (
          <div className="modal">
            {status === "ready" && (
              <>
                <p className="title" style={{ color: "#38bdf8" }}>
                  HUNTER TANK: PRO
                </p>
                <p className="sub">
                  Sneak behind enemy tanks to perform instant stealth kills.
                  <br />
                  <b>Stage 1 starts with 3 patrolling tanks.</b>
                  <br />
                  Every 5th stage features a <b>Heavy Boss Tank</b>!
                  <br />
                  <b>Controls:</b> Tap/Drag to move or use <b>WASD / Arrow Keys</b>.
                </p>
                <button className="btn-action" onClick={startGame}>
                  DEPLOY MISSION
                </button>
              </>
            )}

            {status === "victory" && (
              <>
                <p className="title" style={{ color: "#4ade80" }}>
                  STAGE {level} CLEARED!
                </p>
                <p className="sub">
                  Sector neutralized. Stage {level + 1} brings {Math.min(2 + (level + 1), 8)} enemy tanks with increased vision range
                  {(level + 1) % 5 === 0 ? " and an ARMORED BOSS TANK!" : "."}
                </p>
                <button className="btn-action" onClick={nextStage}>
                  NEXT STAGE ({level + 1})
                </button>
              </>
            )}

            {status === "defeated" && (
              <>
                <p className="title" style={{ color: "#ef4444" }}>
                  ELIMINATED
                </p>
                <p className="sub">You were spotted and neutralized in Stage {level}. Stay behind cover and strike from blind spots.</p>
                <button className="btn-action" onClick={startGame}>
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