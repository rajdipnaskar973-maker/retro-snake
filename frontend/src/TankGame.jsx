import React, { useEffect, useRef, useState, useCallback } from "react";

// Web Audio API engine for real-time sound effects
let actx = null;
function getAudio() {
  if (typeof window === "undefined") return null;
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === "suspended") actx.resume();
  return actx;
}

function playSound(type) {
  try {
    const ctx = getAudio();
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
      osc.start();
      osc.stop(now + 0.35);
    } else if (type === "shot") {
      osc.type = "square";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
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
      osc.start();
      osc.stop(now + 0.24);
    } else if (type === "dash") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.14);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.14);
    } else if (type === "win") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.4);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.4);
    } else if (type === "lose") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.6);
    }
  } catch (e) {
    // Audio fallback
  }
}

const ARENA = 800;
const PLAYER_RADIUS = 18;
const BASE_FOV = Math.PI / 2.5; // ~72 degree aggressive vision cone

// Unique tactical layouts for every stage
function getMapForLevel(level) {
  const mapIdx = ((level - 1) % 5) + 1;
  switch (mapIdx) {
    case 1:
      return {
        theme: "Courtyard Infiltration",
        obstacles: [
          { x: 140, y: 140, w: 110, h: 90 },
          { x: 550, y: 140, w: 110, h: 90 },
          { x: 330, y: 180, w: 140, h: 80 },
          { x: 150, y: 360, w: 80, h: 100 },
          { x: 570, y: 360, w: 80, h: 100 },
          { x: 330, y: 530, w: 140, h: 80 },
          { x: 140, y: 570, w: 110, h: 90 },
          { x: 550, y: 570, w: 110, h: 90 },
        ],
        spawnPoints: [
          { x: 680, y: 120 },
          { x: 680, y: 680 },
          { x: 400, y: 100 },
        ],
      };
    case 2:
      return {
        theme: "Matrix Grid Sector",
        obstacles: [
          { x: 120, y: 120, w: 90, h: 160 },
          { x: 590, y: 120, w: 90, h: 160 },
          { x: 260, y: 340, w: 110, h: 120 },
          { x: 430, y: 340, w: 110, h: 120 },
          { x: 120, y: 520, w: 90, h: 160 },
          { x: 590, y: 520, w: 90, h: 160 },
        ],
        spawnPoints: [
          { x: 680, y: 120 },
          { x: 400, y: 120 },
          { x: 680, y: 400 },
          { x: 680, y: 680 },
        ],
      };
    case 3:
      return {
        theme: "Labyrinth Warehouse",
        obstacles: [
          { x: 100, y: 130, w: 220, h: 60 },
          { x: 480, y: 130, w: 220, h: 60 },
          { x: 200, y: 280, w: 70, h: 240 },
          { x: 530, y: 280, w: 70, h: 240 },
          { x: 340, y: 350, w: 120, h: 100 },
          { x: 100, y: 610, w: 220, h: 60 },
          { x: 480, y: 610, w: 220, h: 60 },
        ],
        spawnPoints: [
          { x: 700, y: 100 },
          { x: 400, y: 100 },
          { x: 700, y: 400 },
          { x: 100, y: 380 },
          { x: 700, y: 700 },
        ],
      };
    case 4:
      return {
        theme: "Fortress Stronghold",
        obstacles: [
          { x: 150, y: 150, w: 100, h: 100 },
          { x: 350, y: 150, w: 100, h: 100 },
          { x: 550, y: 150, w: 100, h: 100 },
          { x: 250, y: 350, w: 100, h: 100 },
          { x: 450, y: 350, w: 100, h: 100 },
          { x: 150, y: 550, w: 100, h: 100 },
          { x: 350, y: 550, w: 100, h: 100 },
          { x: 550, y: 550, w: 100, h: 100 },
        ],
        spawnPoints: [
          { x: 680, y: 100 },
          { x: 400, y: 80 },
          { x: 680, y: 350 },
          { x: 680, y: 680 },
          { x: 100, y: 100 },
          { x: 400, y: 680 },
        ],
      };
    case 5:
    default:
      return {
        theme: "Command Bunker Arena",
        obstacles: [
          { x: 140, y: 140, w: 130, h: 70 },
          { x: 530, y: 140, w: 130, h: 70 },
          { x: 140, y: 590, w: 130, h: 70 },
          { x: 530, y: 590, w: 130, h: 70 },
          { x: 110, y: 320, w: 70, h: 160 },
          { x: 620, y: 320, w: 70, h: 160 },
          { x: 350, y: 350, w: 100, h: 100 },
        ],
        spawnPoints: [
          { x: 400, y: 160 },
          { x: 680, y: 120 },
          { x: 680, y: 680 },
          { x: 120, y: 120 },
          { x: 400, y: 680 },
        ],
      };
  }
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
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    if (px > rect.x && px < rect.x + rect.w && py > rect.y && py < rect.y + rect.h) return true;
  }
  return false;
}

// 2D Decoupled Sliding Vector Physics
function tryMoveWithSlide(x, y, dx, dy, radius, obstacles) {
  let finalX = x;
  let finalY = y;

  const testX = x + dx;
  let blockedX = testX < radius || testX > ARENA - radius;
  if (!blockedX) {
    for (let i = 0; i < obstacles.length; i++) {
      if (circleRectCollide(testX, y, radius, obstacles[i])) {
        blockedX = true;
        break;
      }
    }
  }
  if (!blockedX) finalX = testX;

  const testY = y + dy;
  let blockedY = testY < radius || testY > ARENA - radius;
  if (!blockedY) {
    for (let i = 0; i < obstacles.length; i++) {
      if (circleRectCollide(finalX, testY, radius, obstacles[i])) {
        blockedY = true;
        break;
      }
    }
  }
  if (!blockedY) finalY = testY;

  return { x: finalX, y: finalY, moved: finalX !== x || finalY !== y };
}

function getRandomOpenPoint(obstacles, minDistFromPlayer = 220) {
  let attempts = 0;
  while (attempts < 60) {
    const px = 80 + Math.random() * (ARENA - 160);
    const py = 80 + Math.random() * (ARENA - 160);
    const hits = obstacles.some((ob) => circleRectCollide(px, py, 34, ob));
    const distToSpawn = Math.hypot(px - 100, py - 700);
    if (!hits && distToSpawn > minDistFromPlayer) {
      return { x: px, y: py };
    }
    attempts++;
  }
  return { x: 650, y: 150 };
}

// Raycasting for flashlight lighting occlusion
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

export default function HunterTankMaster() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState(520);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState("ready"); // "ready" | "playing" | "victory" | "defeated"
  const [hud, setHud] = useState({ left: 3, total: 3, isBoss: false, theme: "Courtyard Infiltration" });

  const gameRef = useRef(null);
  const keysRef = useRef({});
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

  const spawnSquad = useCallback((lvl, mapConfig) => {
    const isBossStage = lvl % 5 === 0;
    const count = Math.min(2 + lvl, 7); // Level 1 starts with 3 enemy tanks
    const enemies = [];
    const baseVision = Math.min(280 + lvl * 18, 440);

    for (let i = 0; i < count; i++) {
      const spawnPt = mapConfig.spawnPoints[i % mapConfig.spawnPoints.length] || getRandomOpenPoint(mapConfig.obstacles, 240);
      enemies.push({
        id: `soldier-${i}`,
        isBoss: false,
        x: spawnPt.x,
        y: spawnPt.y,
        radius: 18,
        angle: Math.random() * Math.PI * 2,
        speed: 215 + Math.min(lvl * 12, 105),
        turnSpeed: 3.6 + Math.min(lvl * 0.2, 1.8),
        visionRange: baseVision,
        hp: 1,
        maxHp: 1,
        state: "patrol", // "patrol" | "investigate" | "hunt"
        target: getRandomOpenPoint(mapConfig.obstacles, 0),
        retargetT: 1.5 + Math.random() * 2.0,
        fireCooldown: 0,
        alive: true,
        recoil: 0,
        stuckCounter: 0,
        lastPos: { x: spawnPt.x, y: spawnPt.y },
      });
    }

    if (isBossStage) {
      enemies.push({
        id: `boss-${lvl}`,
        isBoss: true,
        x: ARENA / 2,
        y: 160,
        radius: 32,
        angle: Math.PI / 2,
        speed: 235 + lvl * 6,
        turnSpeed: 2.8,
        visionRange: baseVision + 90,
        hp: 3 + Math.floor(lvl / 5) * 2,
        maxHp: 3 + Math.floor(lvl / 5) * 2,
        state: "patrol",
        target: getRandomOpenPoint(mapConfig.obstacles, 0),
        retargetT: 2.0,
        fireCooldown: 0,
        alive: true,
        recoil: 0,
        stuckCounter: 0,
        lastPos: { x: ARENA / 2, y: 160 },
      });
    }

    return enemies;
  }, []);

  const loadLevel = useCallback(
    (lvl) => {
      const mapConfig = getMapForLevel(lvl);
      const squad = spawnSquad(lvl, mapConfig);
      gameRef.current = {
        level: lvl,
        map: mapConfig,
        player: {
          x: 100,
          y: 700,
          targetX: 100,
          targetY: 700,
          angle: -Math.PI / 4,
          speed: 360,
          dashSpeed: 540,
          dashTimer: 0,
          dashCooldown: 0,
          alive: true,
          recoil: 0,
        },
        enemies: squad,
        shells: [],
        particles: [],
        soundRings: [],
        treads: [],
      };
      setHud({
        left: squad.length,
        total: squad.length,
        isBoss: lvl % 5 === 0,
        theme: mapConfig.theme,
      });
      setStatus("playing");
    },
    [spawnSquad]
  );

  const startGame = () => {
    setLevel(1);
    loadLevel(1);
  };

  // Restarts from the CURRENT stage level instead of resetting to Level 1
  const retryCurrentLevel = () => {
    loadLevel(level);
  };

  const nextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    loadLevel(nextLvl);
  };

  // Keyboard navigation & Dash
  useEffect(() => {
    function onKeyDown(e) {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;

      // Spacebar Dash
      if (k === " " && status === "playing") {
        const p = gameRef.current?.player;
        if (p && p.dashCooldown <= 0) {
          p.dashTimer = 0.22;
          p.dashCooldown = 1.0;
          playSound("dash");
        }
      }

      if (e.key === " ") {
        if (status === "ready") startGame();
        if (status === "defeated") retryCurrentLevel();
        if (status === "victory") nextLevel();
      }
    }
    function onKeyUp(e) {
      keysRef.current[e.key.toLowerCase()] = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [status, level, loadLevel]);

  // Touch and Pointer controls
  function handlePointer(e) {
    const canvas = canvasRef.current;
    if (!canvas || !gameRef.current || status !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * size;
    const py = ((e.clientY - rect.top) / rect.height) * size;
    const scale = size / ARENA;
    const wx = px / scale;
    const wy = py / scale;

    const p = gameRef.current.player;
    p.targetX = wx;
    p.targetY = wy;
    touchAim.current = { x: wx, y: wy };
  }

  function handleCanvasDoubleTap() {
    const p = gameRef.current?.player;
    if (p && p.dashCooldown <= 0) {
      p.dashTimer = 0.22;
      p.dashCooldown = 1.0;
      playSound("dash");
    }
  }

  // Simulation Loop
  useEffect(() => {
    if (status !== "playing") return;
    let anim;
    let last = performance.now();

    function createExplosion(s, x, y, color, count = 16) {
      for (let i = 0; i < count; i++) {
        s.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 360,
          vy: (Math.random() - 0.5) * 360,
          life: 0.45,
          color,
          size: 3 + Math.random() * 4,
        });
      }
    }

    // Hunter Assassin Sound Wave Mechanic: Alerts all squad tanks to sprint to kill location
    function triggerSoundAlert(s, alertX, alertY, soundRadius = 450) {
      s.soundRings.push({ x: alertX, y: alertY, radius: 10, maxRadius: soundRadius, life: 0.5 });
      s.enemies.forEach((other) => {
        if (!other.alive) return;
        const dist = Math.hypot(other.x - alertX, other.y - alertY);
        if (dist <= soundRadius) {
          other.state = "hunt";
          other.target = { x: alertX, y: alertY };
          other.retargetT = 4.5; // Aggressively swarm the sound point
        }
      });
    }

    function update(dt) {
      const s = gameRef.current;
      if (!s) return;
      const p = s.player;
      const map = s.map;
      const keys = keysRef.current;

      // 1. Player Movement & Physics
      let moveX = 0;
      let moveY = 0;
      if (keys["w"] || keys["arrowup"]) moveY -= 1;
      if (keys["s"] || keys["arrowdown"]) moveY += 1;
      if (keys["a"] || keys["arrowleft"]) moveX -= 1;
      if (keys["d"] || keys["arrowright"]) moveX += 1;

      if (p.dashTimer > 0) p.dashTimer -= dt;
      if (p.dashCooldown > 0) p.dashCooldown -= dt;
      if (p.recoil > 0) p.recoil = Math.max(0, p.recoil - dt * 25);

      const currentSpeed = p.dashTimer > 0 ? p.dashSpeed : p.speed;
      let moving = false;

      if (moveX !== 0 || moveY !== 0) {
        const moveAngle = Math.atan2(moveY, moveX);
        p.angle = moveAngle;
        const res = tryMoveWithSlide(
          p.x,
          p.y,
          Math.cos(moveAngle) * currentSpeed * dt,
          Math.sin(moveAngle) * currentSpeed * dt,
          PLAYER_RADIUS,
          map.obstacles
        );
        p.x = res.x;
        p.y = res.y;
        p.targetX = p.x;
        p.targetY = p.y;
        moving = res.moved;
      } else {
        const dist = Math.hypot(p.targetX - p.x, p.targetY - p.y);
        if (dist > 8) {
          const moveAngle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
          p.angle = moveAngle;
          const stepDist = Math.min(currentSpeed * dt, dist);
          const res = tryMoveWithSlide(
            p.x,
            p.y,
            Math.cos(moveAngle) * stepDist,
            Math.sin(moveAngle) * stepDist,
            PLAYER_RADIUS,
            map.obstacles
          );
          p.x = res.x;
          p.y = res.y;
          moving = res.moved;
        }
      }

      if (moving && Math.random() < 0.35) {
        s.treads.push({ x: p.x, y: p.y, angle: p.angle, life: 2.5 });
      }

      // 2. Ambush & Sound Alert Check
      s.enemies.forEach((en) => {
        if (!en.alive) return;
        const dist = Math.hypot(p.x - en.x, p.y - en.y);
        const ambushRange = en.radius + PLAYER_RADIUS + 12;

        if (dist < ambushRange) {
          en.hp -= 1;
          p.recoil = 8;
          shakeRef.current = Math.min(shakeRef.current + 8, 14);

          // All nearby enemies hear the blast and hunt you
          triggerSoundAlert(s, en.x, en.y, 480);

          if (en.hp <= 0) {
            en.alive = false;
            playSound("kill");
            createExplosion(s, en.x, en.y, en.isBoss ? "#f59e0b" : "#ef4444", en.isBoss ? 32 : 18);
          } else {
            playSound("shot");
            createExplosion(s, en.x, en.y, "#f59e0b", 10);
          }
        }
      });

      // 3. Autonomous Enemy AI & Coordinated Hunting
      s.enemies.forEach((en) => {
        if (!en.alive) return;
        if (en.fireCooldown > 0) en.fireCooldown -= dt;
        en.retargetT -= dt;

        const toPlayer = Math.hypot(p.x - en.x, p.y - en.y);
        const radToPlayer = Math.atan2(p.y - en.y, p.x - en.x);

        let dAngle = radToPlayer - en.angle;
        while (dAngle > Math.PI) dAngle -= Math.PI * 2;
        while (dAngle < -Math.PI) dAngle += Math.PI * 2;

        const inVisionCone = Math.abs(dAngle) < BASE_FOV / 2 && toPlayer < en.visionRange;
        const blocked = map.obstacles.some((ob) => lineIntersectsRect(en.x, en.y, p.x, p.y, ob));

        // State Machine
        if (inVisionCone && !blocked) {
          if (en.state !== "hunt") playSound("alert");
          en.state = "hunt";
          en.target = { x: p.x, y: p.y };
          en.retargetT = 4.0;
          // Radio whole team to converge
          triggerSoundAlert(s, p.x, p.y, 420);
        } else if (en.retargetT <= 0) {
          en.state = "patrol";
          en.target = getRandomOpenPoint(map.obstacles, 0);
          en.retargetT = 2.0 + Math.random() * 2.5;
        }

        // Steer towards target
        const goalAngle = Math.atan2(en.target.y - en.y, en.target.x - en.x);
        let turnDiff = goalAngle - en.angle;
        while (turnDiff > Math.PI) turnDiff -= Math.PI * 2;
        while (turnDiff < -Math.PI) turnDiff += Math.PI * 2;

        en.angle += Math.max(-en.turnSpeed * dt, Math.min(en.turnSpeed * dt, turnDiff));

        // 5-Ray Sensor Whisker Obstacle Avoidance
        let avoidAngle = 0;
        const lookAhead = en.radius + 38;
        const feelers = [-0.65, -0.32, 0, 0.32, 0.65];
        for (let f = 0; f < feelers.length; f++) {
          const testA = en.angle + feelers[f];
          const testX = en.x + Math.cos(testA) * lookAhead;
          const testY = en.y + Math.sin(testA) * lookAhead;
          const collides =
            testX < en.radius ||
            testX > ARENA - en.radius ||
            testY < en.radius ||
            testY > ARENA - en.radius ||
            map.obstacles.some((ob) => circleRectCollide(testX, testY, en.radius, ob));

          if (collides) {
            avoidAngle += feelers[f] < 0 ? 1.0 : -1.0;
          }
        }
        en.angle += avoidAngle * dt * 4;

        // Slide Movement
        const effectiveSpeed = en.speed * (en.state === "hunt" ? 1.25 : 0.95);
        const res = tryMoveWithSlide(
          en.x,
          en.y,
          Math.cos(en.angle) * effectiveSpeed * dt,
          Math.sin(en.angle) * effectiveSpeed * dt,
          en.radius,
          map.obstacles
        );
        en.x = res.x;
        en.y = res.y;

        // Anti-Stuck Dynamic Resolver
        const movedDist = Math.hypot(en.x - en.lastPos.x, en.y - en.lastPos.y);
        en.lastPos = { x: en.x, y: en.y };
        if (movedDist < 1.0) {
          en.stuckCounter += dt;
          if (en.stuckCounter > 0.4) {
            en.angle += (Math.random() > 0.5 ? 1 : -1) * 2.5 * dt;
            en.target = getRandomOpenPoint(map.obstacles, 0);
            en.retargetT = 2.0;
            en.stuckCounter = 0;
          }
        } else {
          en.stuckCounter = 0;
        }

        // Precision Fire
        if (en.state === "hunt" && Math.abs(dAngle) < 0.25 && en.fireCooldown <= 0 && !blocked) {
          en.fireCooldown = en.isBoss ? 0.7 : 1.1;
          const barrelLen = en.radius + 12;
          s.shells.push({
            x: en.x + Math.cos(en.angle) * barrelLen,
            y: en.y + Math.sin(en.angle) * barrelLen,
            vx: Math.cos(en.angle) * 500,
            vy: Math.sin(en.angle) * 500,
            isBoss: en.isBoss,
            life: 1.5,
          });
          playSound("shot");
          triggerSoundAlert(s, en.x, en.y, 450);
        }
      });

      // 4. Projectiles
      s.shells = s.shells.filter((sh) => {
        const nx = sh.x + sh.vx * dt;
        const ny = sh.y + sh.vy * dt;

        for (let o = 0; o < map.obstacles.length; o++) {
          const ob = map.obstacles[o];
          if (nx > ob.x && nx < ob.x + ob.w && ny > ob.y && ny < ob.y + ob.h) {
            createExplosion(s, nx, ny, "#f59e0b", 6);
            return false;
          }
        }

        sh.x = nx;
        sh.y = ny;
        sh.life -= dt;
        if (sh.life <= 0 || nx < 0 || nx > ARENA || ny < 0 || ny > ARENA) return false;

        // Player Hit -> Defeat
        if (Math.hypot(sh.x - p.x, sh.y - p.y) < PLAYER_RADIUS) {
          p.alive = false;
          createExplosion(s, p.x, p.y, "#00f0ff", 24);
          shakeRef.current = 16;
          playSound("lose");
          setStatus("defeated");
          return false;
        }
        return true;
      });

      // 5. Sound Waves & Particles
      s.soundRings = s.soundRings.filter((ring) => {
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

      s.treads = s.treads.filter((tr) => {
        tr.life -= dt;
        return tr.life > 0;
      });

      shakeRef.current = Math.max(0, shakeRef.current - dt * 20);

      const living = s.enemies.filter((e) => e.alive);
      setHud({
        left: living.length,
        total: s.enemies.length,
        isBoss: s.enemies.some((e) => e.isBoss && e.alive),
        theme: map.theme,
      });

      if (living.length === 0) {
        playSound("win");
        setStatus("victory");
      }
    }

    // High-Resolution Rendering Engine
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
      ctx.fillStyle = "#050811";
      ctx.fillRect(0, 0, size, size);

      ctx.translate(sx, sy);
      ctx.scale(scale, scale);

      // Floor Grid
      ctx.strokeStyle = "rgba(0, 180, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let g = 0; g < ARENA; g += 40) {
        ctx.beginPath();
        ctx.moveTo(g, 0);
        ctx.lineTo(g, ARENA);
        ctx.stroke();
      }

      // Tread Marks
      s.treads.forEach((tr) => {
        ctx.save();
        ctx.translate(tr.x, tr.y);
        ctx.rotate(tr.angle);
        ctx.fillStyle = `rgba(0, 0, 0, ${tr.life * 0.15})`;
        ctx.fillRect(-12, -14, 24, 4);
        ctx.fillRect(-12, 10, 24, 4);
        ctx.restore();
      });

      // Sound Shockwave Rings
      s.soundRings.forEach((ring) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 170, 0, ${ring.life * 1.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });

      // Vision Flashlights
      s.enemies.forEach((en) => {
        if (!en.alive) return;
        const rayCount = 26;
        const startA = en.angle - BASE_FOV / 2;
        const stepA = BASE_FOV / rayCount;

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
          grad.addColorStop(0, en.state === "hunt" ? "rgba(255, 140, 0, 0.55)" : "rgba(255, 180, 0, 0.26)");
          grad.addColorStop(1, "rgba(255, 140, 0, 0.01)");
        } else {
          grad.addColorStop(0, en.state === "hunt" ? "rgba(255, 30, 30, 0.5)" : "rgba(255, 60, 60, 0.2)");
          grad.addColorStop(1, "rgba(255, 30, 30, 0.01)");
        }
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // Barricades
      s.map.obstacles.forEach((ob) => {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(ob.x + 5, ob.y + 5, ob.w, ob.h);

        ctx.fillStyle = "#151e2e";
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);

        ctx.strokeStyle = "#25344f";
        ctx.lineWidth = 2;
        ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
      });

      // Shells
      s.shells.forEach((sh) => {
        ctx.save();
        ctx.fillStyle = sh.isBoss ? "#f59e0b" : "#ff2244";
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, sh.isBoss ? 5.5 : 4, 0, Math.PI * 2);
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

      // Red Enemy Tanks
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

        // Body
        ctx.fillStyle = en.isBoss ? "#b45309" : "#b91c1c";
        ctx.fillRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.4);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.strokeRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.4);

        // Cannon
        ctx.fillStyle = en.isBoss ? "#d97706" : "#dc2626";
        ctx.fillRect(0, -r * 0.18, r * 1.5, r * 0.36);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Boss Health Gauge
        if (en.isBoss && en.maxHp > 1) {
          const bw = 54;
          const bh = 6;
          ctx.fillStyle = "rgba(0,0,0,0.8)";
          ctx.fillRect(en.x - bw / 2, en.y - en.radius - 18, bw, bh);
          ctx.fillStyle = "#f59e0b";
          ctx.fillRect(en.x - bw / 2, en.y - en.radius - 18, bw * (en.hp / en.maxHp), bh);
        }
      });

      // Blue Player Tank
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

        // Body
        ctx.fillStyle = p.dashTimer > 0 ? "#38bdf8" : "#0284c7";
        ctx.fillRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.4);
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.strokeRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.4);

        // Cannon
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(0, -r * 0.18, r * 1.5, r * 0.36);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

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
    <div className="hunter-master-root" ref={wrapRef}>
      <style>{`
        .hunter-master-root {
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
        .master-hud {
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
        .theme-txt { color: #94a3b8; font-size: 11px; text-transform: uppercase; }
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

      <div className="master-hud">
        <span className="stage-txt">STAGE {level}</span>
        <span className="theme-txt">{hud.theme}</span>
        {hud.isBoss && <span className="boss-warning">⚠ HEAVY BOSS ENGAGED ⚠</span>}
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
        onDoubleClick={handleCanvasDoubleTap}
      >
        <canvas ref={canvasRef} width={size} height={size} />

        {status !== "playing" && (
          <div className="modal">
            {status === "ready" && (
              <>
                <p className="title" style={{ color: "#38bdf8" }}>
                  TANK HUNTER: ASSASSIN
                </p>
                <p className="sub">
                  Killing an enemy emits a sound shockwave that draws nearby tanks to your position.
                  <br />
                  <b>Stage 1 starts with 3 patrolling tanks.</b>
                  <br />
                  Failing a level lets you retry from that exact level!
                  <br />
                  <b>Controls:</b> Tap/Drag or <b>WASD</b>. Press <b>Spacebar / Double Tap</b> to Turbo Dash!
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
                  Sector cleared. Entering <b>{getMapForLevel(level + 1).theme}</b> with {Math.min(2 + (level + 1), 7)} coordinated tanks
                  {(level + 1) % 5 === 0 ? " and an ARMORED BOSS TANK!" : "."}
                </p>
                <button className="btn-action" onClick={nextLevel}>
                  NEXT STAGE ({level + 1})
                </button>
              </>
            )}

            {status === "defeated" && (
              <>
                <p className="title" style={{ color: "#ef4444" }}>
                  ELIMINATED
                </p>
                <p className="sub">You were spotted and neutralized in Stage {level}.</p>
                <button className="btn-action" onClick={retryCurrentLevel}>
                  RETRY STAGE {level}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}