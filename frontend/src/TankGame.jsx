import React, { useEffect, useRef, useState, useCallback } from "react";

/* ==========================================================================
   1. SPATIAL CONSTANTS & MATH UTILITIES
   ========================================================================== */
const ARENA_WIDTH = 1000;
const ARENA_HEIGHT = 1000;
const PLAYER_RADIUS = 18;
const BASE_FOV = Math.PI / 2.5; // ~72 degrees vision flashlight

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function circleRectCollide(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  return Math.hypot(cx - nx, cy - ny) < r;
}

function lineIntersectsRect(x1, y1, x2, y2, rect) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  if (maxX < rect.x || minX > rect.x + rect.w || maxY < rect.y || minY > rect.y + rect.h) {
    return false;
  }

  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    if (px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h) {
      return true;
    }
  }
  return false;
}

// 2D Decoupled Sliding Vector Physics (Tanks never stick to walls)
function tryMoveWithSlide(x, y, dx, dy, radius, obstacles) {
  let finalX = x;
  let finalY = y;

  const testX = x + dx;
  let hitX = testX < radius || testX > ARENA_WIDTH - radius;
  if (!hitX) {
    for (let i = 0; i < obstacles.length; i++) {
      if (circleRectCollide(testX, y, radius, obstacles[i])) {
        hitX = true;
        break;
      }
    }
  }
  if (!hitX) finalX = testX;

  const testY = y + dy;
  let hitY = testY < radius || testY > ARENA_HEIGHT - radius;
  if (!hitY) {
    for (let i = 0; i < obstacles.length; i++) {
      if (circleRectCollide(finalX, testY, radius, obstacles[i])) {
        hitY = true;
        break;
      }
    }
  }
  if (!hitY) finalY = testY;

  return { x: finalX, y: finalY, moved: finalX !== x || finalY !== y };
}

// Raymarching for realistic flashlight lighting occlusion
function castVisionRay(ox, oy, angle, maxDist, obstacles) {
  const step = 8;
  const count = Math.floor(maxDist / step);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  for (let i = 1; i <= count; i++) {
    const rx = ox + cos * (i * step);
    const ry = oy + sin * (i * step);

    if (rx < 0 || rx > ARENA_WIDTH || ry < 0 || ry > ARENA_HEIGHT) {
      return { x: rx, y: ry, hit: true };
    }

    for (let o = 0; o < obstacles.length; o++) {
      const ob = obstacles[o];
      if (rx >= ob.x && rx <= ob.x + ob.w && ry >= ob.y && ry <= ob.y + ob.h) {
        return { x: rx, y: ry, hit: true };
      }
    }
  }
  return { x: ox + cos * maxDist, y: oy + sin * maxDist, hit: false };
}

function getRandomOpenPoint(obstacles, minDistFromPlayer = 240) {
  let attempts = 0;
  while (attempts < 60) {
    const px = 100 + Math.random() * (ARENA_WIDTH - 200);
    const py = 100 + Math.random() * (ARENA_HEIGHT - 200);
    const hits = obstacles.some((ob) => circleRectCollide(px, py, 34, ob));
    const distToSpawn = Math.hypot(px - 140, py - (ARENA_HEIGHT - 140));
    if (!hits && distToSpawn > minDistFromPlayer) {
      return { x: px, y: py };
    }
    attempts++;
  }
  return { x: 800, y: 200 };
}

/* ==========================================================================
   2. SYNTHESIZED WEB AUDIO FX ENGINE
   ========================================================================== */
let audioCtx = null;
function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "kill") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "shot") {
      osc.type = "square";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === "alert") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.linearRampToValueAtTime(1150, now + 0.08);
      osc.frequency.linearRampToValueAtTime(750, now + 0.16);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } else if (type === "dash") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.14);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === "win") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.4);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === "lose") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } catch (e) {
    // Audio safe fallback
  }
}

/* ==========================================================================
   3. PROCEDURAL STAGE MAPS
   ========================================================================== */
function getMapForLevel(level) {
  const mapIdx = ((level - 1) % 5) + 1;
  switch (mapIdx) {
    case 1:
      return {
        theme: "Courtyard Infiltration",
        bg: "#050811",
        wallColor: "#151e2e",
        wallBorder: "#25344f",
        obstacles: [
          { x: 160, y: 160, w: 140, h: 100 },
          { x: 700, y: 160, w: 140, h: 100 },
          { x: 420, y: 220, w: 160, h: 90 },
          { x: 180, y: 440, w: 100, h: 140 },
          { x: 720, y: 440, w: 100, h: 140 },
          { x: 420, y: 680, w: 160, h: 90 },
          { x: 160, y: 740, w: 140, h: 100 },
          { x: 700, y: 740, w: 140, h: 100 },
        ],
        spawnPoints: [
          { x: 840, y: 160 },
          { x: 840, y: 840 },
          { x: 500, y: 140 },
        ],
      };
    case 2:
      return {
        theme: "Matrix Grid Sector",
        bg: "#06090e",
        wallColor: "#1a162b",
        wallBorder: "#342852",
        obstacles: [
          { x: 150, y: 150, w: 110, h: 200 },
          { x: 740, y: 150, w: 110, h: 200 },
          { x: 340, y: 420, w: 130, h: 150 },
          { x: 530, y: 420, w: 130, h: 150 },
          { x: 150, y: 650, w: 110, h: 200 },
          { x: 740, y: 650, w: 110, h: 200 },
        ],
        spawnPoints: [
          { x: 840, y: 150 },
          { x: 500, y: 150 },
          { x: 840, y: 500 },
          { x: 840, y: 850 },
        ],
      };
    case 3:
      return {
        theme: "Labyrinth Warehouse",
        bg: "#080608",
        wallColor: "#261a1a",
        wallBorder: "#4a2c2c",
        obstacles: [
          { x: 120, y: 160, w: 280, h: 70 },
          { x: 600, y: 160, w: 280, h: 70 },
          { x: 240, y: 340, w: 90, h: 300 },
          { x: 670, y: 340, w: 90, h: 300 },
          { x: 420, y: 440, w: 160, h: 120 },
          { x: 120, y: 770, w: 280, h: 70 },
          { x: 600, y: 770, w: 280, h: 70 },
        ],
        spawnPoints: [
          { x: 880, y: 120 },
          { x: 500, y: 120 },
          { x: 880, y: 500 },
          { x: 120, y: 480 },
          { x: 880, y: 880 },
        ],
      };
    case 4:
      return {
        theme: "Fortress Stronghold",
        bg: "#050b0b",
        wallColor: "#142626",
        wallBorder: "#234747",
        obstacles: [
          { x: 180, y: 180, w: 120, h: 120 },
          { x: 440, y: 180, w: 120, h: 120 },
          { x: 700, y: 180, w: 120, h: 120 },
          { x: 310, y: 440, w: 120, h: 120 },
          { x: 570, y: 440, w: 120, h: 120 },
          { x: 180, y: 700, w: 120, h: 120 },
          { x: 440, y: 700, w: 120, h: 120 },
          { x: 700, y: 700, w: 120, h: 120 },
        ],
        spawnPoints: [
          { x: 860, y: 120 },
          { x: 500, y: 100 },
          { x: 860, y: 440 },
          { x: 860, y: 860 },
          { x: 120, y: 120 },
          { x: 500, y: 860 },
        ],
      };
    case 5:
    default:
      return {
        theme: "Command Bunker Arena",
        bg: "#0c0604",
        wallColor: "#2b1812",
        wallBorder: "#542c1e",
        obstacles: [
          { x: 160, y: 160, w: 160, h: 80 },
          { x: 680, y: 160, w: 160, h: 80 },
          { x: 160, y: 760, w: 160, h: 80 },
          { x: 680, y: 760, w: 160, h: 80 },
          { x: 130, y: 390, w: 80, h: 220 },
          { x: 790, y: 390, w: 80, h: 220 },
          { x: 440, y: 440, w: 120, h: 120 },
        ],
        spawnPoints: [
          { x: 500, y: 180 }, // Boss anchor spawn
          { x: 860, y: 140 },
          { x: 860, y: 860 },
          { x: 140, y: 140 },
          { x: 500, y: 860 },
        ],
      };
  }
}

/* ==========================================================================
   4. TACTICAL ENEMY AI CLASS
   ========================================================================== */
class TacticalTankAI {
  constructor(id, x, y, isBoss = false, level = 1) {
    this.id = id;
    this.isBoss = isBoss;
    this.x = x;
    this.y = y;
    this.lastX = x;
    this.lastY = y;
    this.stuckTime = 0;

    this.radius = isBoss ? 32 : 18;
    this.angle = Math.random() * Math.PI * 2;
    this.turretAngle = this.angle;

    this.speed = (isBoss ? 210 : 230) + Math.min(level * 10, 85);
    this.turnSpeed = 3.6 + Math.min(level * 0.18, 1.6);
    this.visionRange = 300 + Math.min(level * 20, 150) + (isBoss ? 90 : 0);
    this.visionFov = Math.PI / (isBoss ? 2.3 : 2.6);

    this.maxHp = isBoss ? 3 + Math.floor(level / 5) * 2 : 1;
    this.hp = this.maxHp;
    this.alive = true;

    this.state = "patrol"; // "patrol" | "investigate" | "hunt"
    this.navTarget = { x, y };
    this.retargetTimer = 0;
    this.fireCooldown = 0;
    this.recoil = 0;
  }

  update(dt, player, obstacles, soundAlerts, onFireShell) {
    if (!this.alive) return;

    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 25);
    this.retargetTimer -= dt;

    const toPlayerDist = Math.hypot(player.x - this.x, player.y - this.y);
    const radToPlayer = Math.atan2(player.y - this.y, player.x - this.x);

    let dAngle = normalizeAngle(radToPlayer - this.angle);
    const inCone = Math.abs(dAngle) < this.visionFov / 2 && toPlayerDist < this.visionRange;
    const isBlocked = obstacles.some((ob) =>
      lineIntersectsRect(this.x, this.y, player.x, player.y, ob)
    );

    // Vision-triggered alarm
    if (inCone && !isBlocked) {
      if (this.state !== "hunt") {
        playSound("alert");
      }
      this.state = "hunt";
      this.navTarget = { x: player.x, y: player.y };
      this.retargetTimer = 4.0;
    }

    // Sound alert listener (Hunter Assassin swarm mechanic)
    if (this.state !== "hunt") {
      for (let i = 0; i < soundAlerts.length; i++) {
        const s = soundAlerts[i];
        if (Math.hypot(this.x - s.x, this.y - s.y) <= s.radius) {
          this.state = "investigate";
          this.navTarget = { x: s.x, y: s.y };
          this.retargetTimer = 4.5;
          break;
        }
      }
    }

    // Random wandering patrol
    if (this.retargetTimer <= 0) {
      this.state = "patrol";
      this.navTarget = getRandomOpenPoint(obstacles, 0);
      this.retargetTimer = 2.5 + Math.random() * 2.0;
    }

    // Steering
    const targetAngle = Math.atan2(this.navTarget.y - this.y, this.navTarget.x - this.x);
    const turnDiff = normalizeAngle(targetAngle - this.angle);
    this.angle += Math.max(-this.turnSpeed * dt, Math.min(this.turnSpeed * dt, turnDiff));
    this.turretAngle = this.angle;

    // 5-Ray Sensor Whisker Obstacle Avoidance
    let avoidTurn = 0;
    const lookAhead = this.radius + 38;
    const sensorAngles = [-0.7, -0.35, 0, 0.35, 0.7];

    for (let i = 0; i < sensorAngles.length; i++) {
      const testA = this.angle + sensorAngles[i];
      const testX = this.x + Math.cos(testA) * lookAhead;
      const testY = this.y + Math.sin(testA) * lookAhead;

      const collides =
        testX < this.radius ||
        testX > ARENA_WIDTH - this.radius ||
        testY < this.radius ||
        testY > ARENA_HEIGHT - this.radius ||
        obstacles.some((ob) => circleRectCollide(testX, testY, this.radius, ob));

      if (collides) {
        avoidTurn += sensorAngles[i] < 0 ? 1.2 : -1.2;
      }
    }
    this.angle += avoidTurn * dt * 4.5;

    // Slide Movement
    const moveSpeed = this.speed * (this.state === "hunt" ? 1.25 : 0.95);
    const vx = Math.cos(this.angle) * moveSpeed * dt;
    const vy = Math.sin(this.angle) * moveSpeed * dt;

    const res = tryMoveWithSlide(this.x, this.y, vx, vy, this.radius, obstacles);
    this.x = res.x;
    this.y = res.y;

    // Dynamic Anti-Stuck Resolver
    const stepDist = Math.hypot(this.x - this.lastX, this.y - this.lastY);
    this.lastX = this.x;
    this.lastY = this.y;

    if (stepDist < 1.0) {
      this.stuckTime += dt;
      if (this.stuckTime > 0.35) {
        this.angle += (Math.random() > 0.5 ? 1 : -1) * 2.8 * dt;
        this.navTarget = getRandomOpenPoint(obstacles, 0);
        this.retargetTimer = 2.0;
        this.stuckTime = 0;
      }
    } else {
      this.stuckTime = 0;
    }

    // Weapon Fire
    if (this.state === "hunt" && Math.abs(dAngle) < 0.28 && this.fireCooldown <= 0 && !isBlocked) {
      this.fireCooldown = this.isBoss ? 0.75 : 1.15;
      this.recoil = 10;
      const barrelDist = this.radius + 14;
      onFireShell({
        x: this.x + Math.cos(this.angle) * barrelDist,
        y: this.y + Math.sin(this.angle) * barrelDist,
        vx: Math.cos(this.angle) * 520,
        vy: Math.sin(this.angle) * 520,
        isBoss: this.isBoss,
      });
      playSound("shot");
    }
  }
}

/* ==========================================================================
   5. MASTER REACT ARCADE GAME COMPONENT
   ========================================================================== */
export default function TankGame() {
  const canvasRef = useRef(null);
  const rootRef = useRef(null);
  const [viewportDim, setViewportDim] = useState(600);
  const [stage, setStage] = useState(1);
  const [gameState, setGameState] = useState("ready"); // "ready" | "playing" | "victory" | "defeated"
  const [credits, setCredits] = useState(0);

  const [hudState, setHudState] = useState({
    remaining: 3,
    total: 3,
    isBoss: false,
    theme: "",
  });

  const simRef = useRef(null);
  const keyMap = useRef({});
  const touchCoords = useRef(null);
  const cameraShake = useRef(0);

  // Resize Viewport to match parent container width
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || !entries[0]) return;
      const w = entries[0].contentRect.width;
      const finalDim = Math.min(Math.floor(w), 760);
      setViewportDim(finalDim > 280 ? finalDim : 280);
    });
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  // Assemble Level Entities
  const assembleLevel = useCallback((lvl) => {
    const mapConfig = getMapForLevel(lvl);
    const enemyCount = Math.min(2 + lvl, 7); // Level 1 starts with 3 enemy tanks
    const isBossStage = lvl % 5 === 0;

    const squad = [];
    for (let i = 0; i < enemyCount; i++) {
      const spawnPt =
        mapConfig.spawnPoints[i % mapConfig.spawnPoints.length] || { x: 800, y: 200 };
      squad.push(new TacticalTankAI(`soldier_${i}`, spawnPt.x, spawnPt.y, false, lvl));
    }

    if (isBossStage) {
      squad.push(new TacticalTankAI(`boss_${lvl}`, 500, 200, true, lvl));
    }

    simRef.current = {
      level: lvl,
      map: mapConfig,
      player: {
        x: 140,
        y: ARENA_HEIGHT - 140,
        targetX: 140,
        targetY: ARENA_HEIGHT - 140,
        angle: -Math.PI / 4,
        speed: 380,
        dashSpeed: 580,
        dashTimer: 0,
        dashCooldown: 0,
        alive: true,
        recoil: 0,
      },
      enemies: squad,
      shells: [],
      particles: [],
      soundWaves: [],
      treadTracks: [],
    };

    setHudState({
      remaining: squad.length,
      total: squad.length,
      isBoss: isBossStage,
      theme: mapConfig.theme,
    });

    setGameState("playing");
  }, []);

  const launchFirstMission = () => {
    setStage(1);
    assembleLevel(1);
  };

  const restartCurrentMission = () => {
    assembleLevel(stage);
  };

  const proceedNextMission = () => {
    const nextLvl = stage + 1;
    setStage(nextLvl);
    assembleLevel(nextLvl);
  };

  // Keyboard navigation & dash
  useEffect(() => {
    function handleKeyDown(e) {
      const k = e.key.toLowerCase();
      keyMap.current[k] = true;

      if (k === " " && gameState === "playing") {
        const p = simRef.current?.player;
        if (p && p.dashCooldown <= 0) {
          p.dashTimer = 0.22;
          p.dashCooldown = 1.1;
          playSound("dash");
        }
      }

      if (e.key === " ") {
        if (gameState === "ready") launchFirstMission();
        if (gameState === "defeated") restartCurrentMission();
        if (gameState === "victory") proceedNextMission();
      }
    }

    function handleKeyUp(e) {
      keyMap.current[e.key.toLowerCase()] = false;
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState, stage, assembleLevel]);

  // Touch & Pointer Direct Targeting
  function handlePointer(e) {
    const canvas = canvasRef.current;
    if (!canvas || !simRef.current || gameState !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * viewportDim;
    const py = ((e.clientY - rect.top) / rect.height) * viewportDim;
    const scale = viewportDim / ARENA_WIDTH;
    const worldX = px / scale;
    const worldY = py / scale;

    const p = simRef.current.player;
    p.targetX = worldX;
    p.targetY = worldY;
    touchCoords.current = { x: worldX, y: worldY };
  }

  function handleDoubleTapDash() {
    const p = simRef.current?.player;
    if (p && p.dashCooldown <= 0) {
      p.dashTimer = 0.22;
      p.dashCooldown = 1.1;
      playSound("dash");
    }
  }

  // Master Engine Simulation Loop
  useEffect(() => {
    if (gameState !== "playing") return;
    let animId;
    let lastStamp = performance.now();

    function triggerExplosion(s, x, y, color, count = 16) {
      for (let i = 0; i < count; i++) {
        s.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 380,
          vy: (Math.random() - 0.5) * 380,
          life: 0.45,
          color,
          size: 3 + Math.random() * 4,
        });
      }
    }

    function emitSoundWave(s, x, y, radius = 480) {
      s.soundWaves.push({ x, y, radius: 10, maxRadius: radius, life: 0.5 });
    }

    function step(dt) {
      const s = simRef.current;
      if (!s) return;
      const p = s.player;
      const map = s.map;
      const keys = keyMap.current;

      // 1. High Velocity Smooth Player Movement
      let moveX = 0;
      let moveY = 0;
      if (keys["w"] || keys["arrowup"]) moveY -= 1;
      if (keys["s"] || keys["arrowdown"]) moveY += 1;
      if (keys["a"] || keys["arrowleft"]) moveX -= 1;
      if (keys["d"] || keys["arrowright"]) moveX += 1;

      if (p.dashTimer > 0) p.dashTimer -= dt;
      if (p.dashCooldown > 0) p.dashCooldown -= dt;
      if (p.recoil > 0) p.recoil = Math.max(0, p.recoil - dt * 25);

      const activeSpeed = p.dashTimer > 0 ? p.dashSpeed : p.speed;
      let isMoving = false;

      if (moveX !== 0 || moveY !== 0) {
        const moveRad = Math.atan2(moveY, moveX);
        p.angle = moveRad;
        const res = tryMoveWithSlide(
          p.x,
          p.y,
          Math.cos(moveRad) * activeSpeed * dt,
          Math.sin(moveRad) * activeSpeed * dt,
          PLAYER_RADIUS,
          map.obstacles
        );
        p.x = res.x;
        p.y = res.y;
        p.targetX = p.x;
        p.targetY = p.y;
        isMoving = res.moved;
      } else {
        const dist = Math.hypot(p.targetX - p.x, p.targetY - p.y);
        if (dist > 8) {
          const moveRad = Math.atan2(p.targetY - p.y, p.targetX - p.x);
          p.angle = moveRad;
          const stepDist = Math.min(activeSpeed * dt, dist);
          const res = tryMoveWithSlide(
            p.x,
            p.y,
            Math.cos(moveRad) * stepDist,
            Math.sin(moveRad) * stepDist,
            PLAYER_RADIUS,
            map.obstacles
          );
          p.x = res.x;
          p.y = res.y;
          isMoving = res.moved;
        }
      }

      if (isMoving && Math.random() < 0.35) {
        s.treadTracks.push({ x: p.x, y: p.y, angle: p.angle, life: 2.5 });
      }

      // 2. Ambush Check (Stealth Takedown + Sound Propagation)
      s.enemies.forEach((en) => {
        if (!en.alive) return;
        const dist = Math.hypot(p.x - en.x, p.y - en.y);
        const ambushDist = en.radius + PLAYER_RADIUS + 14;

        if (dist < ambushDist) {
          en.hp -= 1;
          p.recoil = 8;
          cameraShake.current = Math.min(cameraShake.current + 8, 14);

          // Emit Sound Alert
          emitSoundWave(s, en.x, en.y, 500);

          if (en.hp <= 0) {
            en.alive = false;
            setCredits((c) => c + (en.isBoss ? 500 : 100));
            playSound("kill");
            triggerExplosion(
              s,
              en.x,
              en.y,
              en.isBoss ? "#f59e0b" : "#ef4444",
              en.isBoss ? 32 : 18
            );
          } else {
            playSound("shot");
            triggerExplosion(s, en.x, en.y, "#f59e0b", 10);
          }
        }
      });

      // 3. Update Enemy AI Squad
      s.enemies.forEach((en) => {
        en.update(dt, p, map.obstacles, s.soundWaves, (shell) => {
          s.shells.push({ ...shell, life: 1.5 });
          emitSoundWave(s, shell.x, shell.y, 440);
        });
      });

      // 4. Update Shells
      s.shells = s.shells.filter((sh) => {
        const nx = sh.x + sh.vx * dt;
        const ny = sh.y + sh.vy * dt;

        for (let o = 0; o < map.obstacles.length; o++) {
          const ob = map.obstacles[o];
          if (nx >= ob.x && nx <= ob.x + ob.w && ny >= ob.y && ny <= ob.y + ob.h) {
            triggerExplosion(s, nx, ny, "#f59e0b", 6);
            return false;
          }
        }

        sh.x = nx;
        sh.y = ny;
        sh.life -= dt;
        if (sh.life <= 0 || nx < 0 || nx > ARENA_WIDTH || ny < 0 || ny > ARENA_HEIGHT) {
          return false;
        }

        // Direct hit on player
        if (Math.hypot(sh.x - p.x, sh.y - p.y) < PLAYER_RADIUS) {
          p.alive = false;
          triggerExplosion(s, p.x, p.y, "#00f0ff", 24);
          cameraShake.current = 18;
          playSound("lose");
          setGameState("defeated");
          return false;
        }
        return true;
      });

      // 5. Sound Wave Expansions & Particles
      s.soundWaves = s.soundWaves.filter((ring) => {
        ring.radius += (ring.maxRadius - ring.radius) * 12 * dt;
        ring.life -= dt;
        return ring.life > 0;
      });

      s.particles = s.particles.filter((pt) => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        return pt.life > 0;
      });

      s.treadTracks = s.treadTracks.filter((tr) => {
        tr.life -= dt;
        return tr.life > 0;
      });

      cameraShake.current = Math.max(0, cameraShake.current - dt * 20);

      const livingSquad = s.enemies.filter((e) => e.alive);
      setHudState({
        remaining: livingSquad.length,
        total: s.enemies.length,
        isBoss: s.enemies.some((e) => e.isBoss && e.alive),
        theme: map.theme,
      });

      if (livingSquad.length === 0) {
        playSound("win");
        setGameState("victory");
      }
    }

    // High-Definition Canvas Render Pass
    function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const s = simRef.current;
      if (!s) return;

      const scale = viewportDim / ARENA_WIDTH;
      const sx = (Math.random() - 0.5) * cameraShake.current;
      const sy = (Math.random() - 0.5) * cameraShake.current;

      ctx.save();
      ctx.fillStyle = s.map.bg;
      ctx.fillRect(0, 0, viewportDim, viewportDim);

      ctx.translate(sx, sy);
      ctx.scale(scale, scale);

      // Floor Grid
      ctx.strokeStyle = "rgba(0, 180, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let g = 0; g < ARENA_WIDTH; g += 40) {
        ctx.beginPath();
        ctx.moveTo(g, 0);
        ctx.lineTo(g, ARENA_HEIGHT);
        ctx.moveTo(0, g);
        ctx.lineTo(ARENA_WIDTH, g);
        ctx.stroke();
      }

      // Ground Tread Impressions
      s.treadTracks.forEach((tr) => {
        ctx.save();
        ctx.translate(tr.x, tr.y);
        ctx.rotate(tr.angle);
        ctx.fillStyle = `rgba(0, 0, 0, ${tr.life * 0.15})`;
        ctx.fillRect(-12, -14, 24, 4);
        ctx.fillRect(-12, 10, 24, 4);
        ctx.restore();
      });

      // Sound Shockwaves
      s.soundWaves.forEach((ring) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 170, 0, ${ring.life * 1.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });

      // Vision Cones (Raycast Lighting)
      s.enemies.forEach((en) => {
        if (!en.alive) return;
        const rayCount = 26;
        const startA = en.turretAngle - en.visionFov / 2;
        const stepA = en.visionFov / rayCount;

        ctx.beginPath();
        ctx.moveTo(en.x, en.y);
        for (let r = 0; r <= rayCount; r++) {
          const a = startA + r * stepA;
          const hit = castVisionRay(en.x, en.y, a, en.visionRange, s.map.obstacles);
          ctx.lineTo(hit.x, hit.y);
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(en.x, en.y, 10, en.x, en.y, en.visionRange);
        if (en.isBoss) {
          grad.addColorStop(
            0,
            en.state === "hunt" ? "rgba(255, 140, 0, 0.55)" : "rgba(255, 180, 0, 0.25)"
          );
          grad.addColorStop(1, "rgba(255, 140, 0, 0.01)");
        } else {
          grad.addColorStop(
            0,
            en.state === "hunt" ? "rgba(255, 30, 30, 0.5)" : "rgba(255, 60, 60, 0.2)"
          );
          grad.addColorStop(1, "rgba(255, 30, 30, 0.01)");
        }
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // Hard Cover Barricades
      s.map.obstacles.forEach((ob) => {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(ob.x + 6, ob.y + 6, ob.w, ob.h);

        ctx.fillStyle = s.map.wallColor;
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);

        ctx.strokeStyle = s.map.wallBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
      });

      // Projectiles
      s.shells.forEach((sh) => {
        ctx.save();
        ctx.fillStyle = sh.isBoss ? "#f59e0b" : "#ff2244";
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, sh.isBoss ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Particles
      s.particles.forEach((pt) => {
        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.life / 0.45);
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
        ctx.restore();
      });

      // Enemy Tanks
      s.enemies.forEach((en) => {
        if (!en.alive) return;
        const r = en.radius;
        ctx.save();
        ctx.translate(en.x, en.y);
        ctx.rotate(en.angle);

        // Treads
        ctx.fillStyle = "#0c0f17";
        ctx.fillRect(-r * 1.1, -r * 0.95, r * 2.2, r * 0.45);
        ctx.fillRect(-r * 1.1, r * 0.5, r * 2.2, r * 0.45);

        // Hull
        ctx.fillStyle = en.isBoss ? "#b45309" : "#b91c1c";
        ctx.fillRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.4);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.strokeRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.4);

        // Barrel
        ctx.fillStyle = en.isBoss ? "#d97706" : "#dc2626";
        ctx.fillRect(0 - en.recoil, -r * 0.18, r * 1.5, r * 0.36);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Boss Gauge
        if (en.isBoss && en.maxHp > 1) {
          const bw = 54;
          const bh = 6;
          ctx.fillStyle = "rgba(0,0,0,0.8)";
          ctx.fillRect(en.x - bw / 2, en.y - en.radius - 18, bw, bh);
          ctx.fillStyle = "#f59e0b";
          ctx.fillRect(en.x - bw / 2, en.y - en.radius - 18, bw * (en.hp / en.maxHp), bh);
        }
      });

      // Player Blue Assassin Tank
      if (s.player.alive) {
        const p = s.player;
        const r = PLAYER_RADIUS;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Treads
        ctx.fillStyle = "#070e1a";
        ctx.fillRect(-r * 1.1, -r * 0.95, r * 2.2, r * 0.45);
        ctx.fillRect(-r * 1.1, r * 0.5, r * 2.2, r * 0.45);

        // Hull
        ctx.fillStyle = p.dashTimer > 0 ? "#38bdf8" : "#0284c7";
        ctx.fillRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.4);
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.strokeRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.4);

        // Barrel
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(0 - p.recoil, -r * 0.18, r * 1.5, r * 0.36);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();
    }

    function gameLoop(now) {
      const dt = Math.min((now - lastStamp) / 1000, 0.05);
      lastStamp = now;
      step(dt);
      render();
      animId = requestAnimationFrame(gameLoop);
    }

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, viewportDim]);

  return (
    <div className="hunter-strike-container" ref={rootRef}>
      <style>{`
        .hunter-strike-container {
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
          max-width: 780px;
          margin: 0 auto;
        }
        .header-bar {
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
        .stage-title { color: #38bdf8; }
        .theme-name { color: #94a3b8; font-size: 11px; text-transform: uppercase; }
        .boss-tag {
          color: #f59e0b;
          font-weight: 900;
          animation: pulse 0.8s infinite alternate;
        }
        @keyframes pulse { from { opacity: 0.5; } to { opacity: 1; } }
        .targets-count { color: #f43f5e; }
        .credits-tag { color: #10b981; }
        .canvas-wrapper {
          position: relative;
          border: 2px solid #1a2336;
          border-radius: 10px;
          overflow: hidden;
          background: #050811;
          cursor: crosshair;
        }
        .screen-modal {
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
        .main-heading {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 1.5px;
          margin-bottom: 8px;
        }
        .sub-description {
          font-size: 13px;
          color: #94a3b8;
          max-width: 340px;
          margin-bottom: 22px;
          line-height: 1.5;
        }
        .start-btn {
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
        .start-btn:hover { background: #0369a1; }
      `}</style>

      <div className="header-bar">
        <span className="stage-title">STAGE {stage}</span>
        <span className="theme-name">{hudState.theme}</span>
        {hudState.isBoss && <span className="boss-tag">⚠ HEAVY BOSS ENGAGED ⚠</span>}
        <span className="credits-tag">${credits}</span>
        <span className="targets-count">
          ENEMIES: {hudState.remaining} / {hudState.total}
        </span>
      </div>

      <div
        className="canvas-wrapper"
        onPointerDown={handlePointer}
        onPointerMove={(e) => {
          if (e.buttons === 1) handlePointer(e);
        }}
        onDoubleClick={handleDoubleTapDash}
      >
        <canvas ref={canvasRef} width={viewportDim} height={viewportDim} />

        {gameState !== "playing" && (
          <div className="screen-modal">
            {gameState === "ready" && (
              <>
                <p className="main-heading" style={{ color: "#38bdf8" }}>
                  HUNTER STRIKE: TACTICAL
                </p>
                <p className="sub-description">
                  Commercial-grade stealth combat.
                  <br />
                  <b>Stage 1 starts with 3 patrolling tanks.</b>
                  <br />
                  Sound waves draw all nearby units to the kill point!
                  <br />
                  <b>Controls:</b> Tap/Drag or <b>WASD</b>. Press <b>Spacebar / Double Tap</b> to Dash!
                </p>
                <button className="start-btn" onClick={launchFirstMission}>
                  COMMENCE OPERATION
                </button>
              </>
            )}

            {gameState === "victory" && (
              <>
                <p className="main-heading" style={{ color: "#4ade80" }}>
                  SECTOR NEUTRALIZED!
                </p>
                <p className="sub-description">
                  All targets eliminated. Advancing to <b>{getMapForLevel(stage + 1).theme}</b> with {Math.min(2 + (stage + 1), 7)} active tanks
                  {(stage + 1) % 5 === 0 ? " and an ARMORED BOSS TANK!" : "."}
                </p>
                <button className="start-btn" onClick={proceedNextMission}>
                  NEXT SECTOR ({stage + 1})
                </button>
              </>
            )}

            {gameState === "defeated" && (
              <>
                <p className="main-heading" style={{ color: "#ef4444" }}>
                  MISSION FAILED
                </p>
                <p className="sub-description">
                  You were neutralized in Stage {stage}. Restarting from current stage.
                </p>
                <button className="start-btn" onClick={restartCurrentMission}>
                  RETRY STAGE {stage}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}