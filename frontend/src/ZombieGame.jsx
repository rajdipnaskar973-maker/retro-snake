import { useEffect, useRef, useState, useCallback } from "react";

// ---------- tiny synth, no audio files needed ----------
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
function noiseBurst({ duration = 0.15, volume = 0.2 }) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

const sfx = {
  shoot: () => noiseBurst({ duration: 0.06, volume: 0.12 }),
  reload: () => tone({ freq: 300, duration: 0.05, type: "square", volume: 0.1 }),
  hit: () => tone({ freq: 140, duration: 0.12, type: "sawtooth", volume: 0.15, glideTo: 60 }),
  zombieDie: () => noiseBurst({ duration: 0.2, volume: 0.15 }),
  playerHurt: () => tone({ freq: 180, duration: 0.2, type: "sawtooth", volume: 0.18, glideTo: 50 }),
  waveStart: () => tone({ freq: 200, duration: 0.4, type: "sawtooth", volume: 0.12, glideTo: 400 }),
  heartbeat: () => tone({ freq: 55, duration: 0.15, type: "sine", volume: 0.2 }),
  gameOver: () => tone({ freq: 220, duration: 0.6, type: "sawtooth", volume: 0.2, glideTo: 40 }),
};

const ARENA = 900; // world size (square)
const PLAYER_SPEED = 210; // px/sec
const PLAYER_MAX_HP = 100;
const MAG_SIZE = 8;
const RELOAD_TIME = 1.1;
const BULLET_SPEED = 620;
const VISION_RADIUS = 210;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function makeZombie(kind = "walker") {
  // spawn just outside the visible canvas edge, in world space around the arena
  const edge = Math.floor(Math.random() * 4);
  const pad = 40;
  let x, y;
  if (edge === 0) { x = Math.random() * ARENA; y = -pad; }
  else if (edge === 1) { x = ARENA + pad; y = Math.random() * ARENA; }
  else if (edge === 2) { x = Math.random() * ARENA; y = ARENA + pad; }
  else { x = -pad; y = Math.random() * ARENA; }

  const isRunner = kind === "runner";
  return {
    x, y,
    hp: isRunner ? 25 : 40,
    speed: isRunner ? 130 + Math.random() * 30 : 55 + Math.random() * 25,
    radius: isRunner ? 11 : 14,
    isRunner,
    hitFlash: 0,
    wobble: Math.random() * Math.PI * 2,
  };
}

export default function ZombieGame({ onGameOver }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState(480);
  const [status, setStatus] = useState("ready"); // ready | playing | over
  const [hud, setHud] = useState({ hp: PLAYER_MAX_HP, ammo: MAG_SIZE, wave: 1, kills: 0, reloading: false });

  const stateRef = useRef(null);
  const keysRef = useRef({});
  const aimRef = useRef({ x: 1, y: 0 });
  const shakeRef = useRef(0);
  const lastHeartbeatRef = useRef(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setSize(Math.floor(entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const resetGame = useCallback(() => {
    stateRef.current = {
      player: { x: ARENA / 2, y: ARENA / 2, hp: PLAYER_MAX_HP, ammo: MAG_SIZE, reloading: false, reloadT: 0 },
      bullets: [],
      zombies: [],
      particles: [],
      wave: 1,
      kills: 0,
      zombiesRemaining: 0,
      spawnQueue: 0,
      spawnTimer: 0,
      waveBanner: 1.6, // seconds to show "WAVE 1" banner
      lastShot: -99,
    };
    startWave(stateRef.current, 1);
    setHud({ hp: PLAYER_MAX_HP, ammo: MAG_SIZE, wave: 1, kills: 0, reloading: false });
  }, []);

  function startWave(s, waveNum) {
    s.wave = waveNum;
    s.spawnQueue = 4 + waveNum * 2;
    s.zombiesRemaining = s.spawnQueue;
    s.spawnTimer = 0;
    s.waveBanner = 1.6;
    sfx.waveStart();
  }

  const startGame = useCallback(() => {
    resetGame();
    setStatus("playing");
  }, [resetGame]);

  // ---------- input ----------
  useEffect(() => {
    function down(e) {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "r") tryReload();
      if (e.key === " " && status !== "playing") startGame();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function tryReload() {
    const s = stateRef.current;
    if (!s || status !== "playing") return;
    if (s.player.reloading || s.player.ammo === MAG_SIZE) return;
    s.player.reloading = true;
    s.player.reloadT = RELOAD_TIME;
    sfx.reload();
  }

  function handlePointerMove(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * size;
    const py = ((e.clientY - rect.top) / rect.height) * size;
    const s = stateRef.current;
    if (!s) return;
    const scale = size / (VISION_RADIUS * 2.6); // rough camera scale, matches draw()
    const worldX = s.player.x + (px - size / 2) / scale;
    const worldY = s.player.y + (py - size / 2) / scale;
    const dx = worldX - s.player.x;
    const dy = worldY - s.player.y;
    const len = Math.hypot(dx, dy) || 1;
    aimRef.current = { x: dx / len, y: dy / len };
  }

  function shoot() {
    const s = stateRef.current;
    if (!s || status !== "playing") return;
    if (s.player.reloading || s.player.ammo <= 0) {
      if (s.player.ammo <= 0 && !s.player.reloading) tryReload();
      return;
    }
    s.player.ammo -= 1;
    const a = aimRef.current;
    s.bullets.push({
      x: s.player.x + a.x * 14,
      y: s.player.y + a.y * 14,
      vx: a.x * BULLET_SPEED,
      vy: a.y * BULLET_SPEED,
      life: 0.9,
    });
    sfx.shoot();
    shakeRef.current = Math.min(shakeRef.current + 2, 6);
  }

  // ---------- main loop ----------
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

    function update(dt) {
      const s = stateRef.current;
      if (!s) return;
      const p = s.player;

      if (s.waveBanner > 0) s.waveBanner -= dt;

      // movement
      const keys = keysRef.current;
      let mx = 0, my = 0;
      if (keys["w"] || keys["arrowup"]) my -= 1;
      if (keys["s"] || keys["arrowdown"]) my += 1;
      if (keys["a"] || keys["arrowleft"]) mx -= 1;
      if (keys["d"] || keys["arrowright"]) mx += 1;
      const mlen = Math.hypot(mx, my) || 1;
      p.x = Math.max(20, Math.min(ARENA - 20, p.x + (mx / mlen) * PLAYER_SPEED * dt));
      p.y = Math.max(20, Math.min(ARENA - 20, p.y + (my / mlen) * PLAYER_SPEED * dt));

      // reload
      if (p.reloading) {
        p.reloadT -= dt;
        if (p.reloadT <= 0) {
          p.reloading = false;
          p.ammo = MAG_SIZE;
        }
      }

      // spawn zombies gradually through the wave
      if (s.spawnQueue > 0) {
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
          const isRunner = s.wave >= 3 && Math.random() < 0.25;
          s.zombies.push(makeZombie(isRunner ? "runner" : "walker"));
          s.spawnQueue -= 1;
          s.spawnTimer = Math.max(0.35, 1.1 - s.wave * 0.06);
        }
      }

      // bullets
      s.bullets = s.bullets.filter((b) => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        return b.life > 0 && b.x > -50 && b.x < ARENA + 50 && b.y > -50 && b.y < ARENA + 50;
      });

      // zombies move toward player, wobble for organic feel
      s.zombies.forEach((z) => {
        z.wobble += dt * 6;
        const dx = p.x - z.x, dy = p.y - z.y;
        const len = Math.hypot(dx, dy) || 1;
        const wobbleX = Math.sin(z.wobble) * 8;
        const wobbleY = Math.cos(z.wobble * 0.8) * 8;
        z.x += ((dx / len) * z.speed) * dt + wobbleX * dt;
        z.y += ((dy / len) * z.speed) * dt + wobbleY * dt;
        if (z.hitFlash > 0) z.hitFlash -= dt;

        // touch player
        if (len < z.radius + 16) {
          p.hp -= 14 * dt;
          shakeRef.current = Math.min(shakeRef.current + 0.6, 8);
        }
      });

      // bullet-zombie collisions
      s.bullets.forEach((b) => {
        s.zombies.forEach((z) => {
          if (b.life <= 0) return;
          if (dist(b, z) < z.radius) {
            z.hp -= 20;
            z.hitFlash = 0.15;
            b.life = 0;
            sfx.hit();
            for (let i = 0; i < 5; i++) {
              s.particles.push({
                x: z.x, y: z.y,
                vx: (Math.random() - 0.5) * 160,
                vy: (Math.random() - 0.5) * 160,
                life: 0.4, color: "#ff4444",
              });
            }
          }
        });
      });

      const beforeCount = s.zombies.length;
      s.zombies = s.zombies.filter((z) => {
        if (z.hp <= 0) {
          sfx.zombieDie();
          s.kills += 1;
          return false;
        }
        return true;
      });
      if (s.zombies.length < beforeCount) {
        s.zombiesRemaining = s.spawnQueue + s.zombies.length;
      }

      // particles
      s.particles = s.particles.filter((pt) => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        return pt.life > 0;
      });

      // shake decay
      shakeRef.current = Math.max(0, shakeRef.current - dt * 14);

      // heartbeat when low hp
      if (p.hp > 0 && p.hp < 35) {
        lastHeartbeatRef.current -= dt;
        if (lastHeartbeatRef.current <= 0) {
          sfx.heartbeat();
          lastHeartbeatRef.current = 0.35 + (p.hp / 35) * 0.4;
        }
      }

      // wave complete -> next wave
      if (s.spawnQueue === 0 && s.zombies.length === 0 && s.waveBanner <= 0) {
        startWave(s, s.wave + 1);
      }

      // death
      if (p.hp <= 0) {
        sfx.gameOver();
        setStatus("over");
        onGameOver && onGameOver({ kills: s.kills, wave: s.wave });
        return;
      }

      setHud({
        hp: Math.max(0, Math.round(p.hp)),
        ammo: p.ammo,
        wave: s.wave,
        kills: s.kills,
        reloading: p.reloading,
      });
    }

    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const s = stateRef.current;
      if (!s) return;
      const p = s.player;

      const scale = size / (VISION_RADIUS * 2.6);
      const shakeX = (Math.random() - 0.5) * shakeRef.current;
      const shakeY = (Math.random() - 0.5) * shakeRef.current;

      ctx.save();
      ctx.fillStyle = "#0a0000";
      ctx.fillRect(0, 0, size, size);

      ctx.translate(size / 2 + shakeX, size / 2 + shakeY);
      ctx.scale(scale, scale);
      ctx.translate(-p.x, -p.y);

      // ground texture: faint grid
      ctx.strokeStyle = "rgba(255,68,68,0.05)";
      ctx.lineWidth = 1 / scale;
      const gridStep = 60;
      for (let gx = 0; gx < ARENA; gx += gridStep) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, ARENA); ctx.stroke();
      }
      for (let gy = 0; gy < ARENA; gy += gridStep) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(ARENA, gy); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,68,68,0.25)";
      ctx.lineWidth = 3 / scale;
      ctx.strokeRect(0, 0, ARENA, ARENA);

      // particles
      s.particles.forEach((pt) => {
        ctx.globalAlpha = Math.max(0, pt.life / 0.4);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // zombies
      s.zombies.forEach((z) => {
        ctx.fillStyle = z.hitFlash > 0 ? "#ffffff" : z.isRunner ? "#ff8844" : "#7a1010";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
        ctx.fill();
        // hp sliver
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(z.x - 12, z.y - z.radius - 8, 24, 3);
        ctx.fillStyle = "#ff4444";
        const maxHp = z.isRunner ? 25 : 40;
        ctx.fillRect(z.x - 12, z.y - z.radius - 8, 24 * Math.max(0, z.hp / maxHp), 3);
      });

      // bullets
      ctx.strokeStyle = "#ffd479";
      ctx.lineWidth = 2 / scale;
      s.bullets.forEach((b) => {
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012);
        ctx.stroke();
      });

      // player
      const a = aimRef.current;
      const ang = Math.atan2(a.y, a.x);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.fillStyle = "#ffd479";
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, 9);
      ctx.lineTo(-10, -9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.restore();

      // vision vignette (dread effect) — screen space, not world space
      const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size * 0.62);
      grad.addColorStop(0, "rgba(5,0,0,0)");
      grad.addColorStop(1, "rgba(3,0,0,0.94)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // low-hp red pulse overlay
      if (p.hp < 35 && p.hp > 0) {
        const pulse = 0.15 + Math.sin(performance.now() / 180) * 0.08;
        ctx.fillStyle = `rgba(180,0,0,${Math.max(0, pulse)})`;
        ctx.fillRect(0, 0, size, size);
      }

      // wave banner
      if (s.waveBanner > 0) {
        ctx.globalAlpha = Math.min(1, s.waveBanner);
        ctx.fillStyle = "#ff4444";
        ctx.font = "bold 28px 'VT323', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`WAVE ${s.wave}`, size / 2, size / 2 - 60);
        ctx.globalAlpha = 1;
      }
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, size]);

  return (
    <div className="game-wrap" ref={wrapRef}>
      <div className="game-hud zombie-hud">
        <span>❤ {hud.hp}</span>
        <span>WAVE {hud.wave}</span>
        <span>KILLS {hud.kills}</span>
        <span>{hud.reloading ? "RELOADING…" : `AMMO ${hud.ammo}/${MAG_SIZE}`}</span>
      </div>
      <div
        className="canvas-shell"
        onMouseMove={handlePointerMove}
        onMouseDown={shoot}
        onTouchMove={(e) => {
          const t = e.touches[0];
          handlePointerMove({ clientX: t.clientX, clientY: t.clientY });
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          handlePointerMove({ clientX: t.clientX, clientY: t.clientY });
          shoot();
        }}
      >
        <canvas ref={canvasRef} width={size} height={size} />
        {status !== "playing" && (
          <div className="overlay">
            {status === "ready" && (
              <>
                <p className="overlay-title">OUTBREAK</p>
                <p className="overlay-sub">
                  WASD to move · mouse to aim · click to shoot · R to reload
                  <br />
                  survive the waves — the dark isn't empty
                </p>
                <button className="btn" onClick={startGame}>▶ press start</button>
              </>
            )}
            {status === "over" && (
              <>
                <p className="overlay-title">YOU DIED</p>
                <p className="overlay-sub">
                  survived to wave {stateRef.current?.wave ?? 1} · {stateRef.current?.kills ?? 0} kills
                </p>
                <button className="btn" onClick={startGame}>↻ try again</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
