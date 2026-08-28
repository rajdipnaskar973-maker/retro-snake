<html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>Shadow Strike - Stealth Action</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
    }

    body, html {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #07090e;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #fff;
    }

    #game-container {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    canvas {
      display: block;
      background-color: #0d1117;
      box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
      cursor: crosshair;
    }

    #ui-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 16px;
    }

    .hud-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      background: rgba(13, 17, 23, 0.75);
      backdrop-filter: blur(8px);
      padding: 12px 20px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }

    .hud-stat {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .health-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 140px;
    }

    .health-bar-bg {
      width: 100%;
      height: 10px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 5px;
      overflow: hidden;
    }

    .health-bar-fill {
      width: 100%;
      height: 100%;
      background: #00ff66;
      transition: width 0.2s ease, background-color 0.2s ease;
    }

    .hud-badge {
      background: rgba(255, 255, 255, 0.1);
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 700;
      color: #00d4ff;
    }

    .modal {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(7, 9, 14, 0.85);
      backdrop-filter: blur(10px);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      pointer-events: auto;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
      z-index: 10;
    }

    .modal.active {
      opacity: 1;
      visibility: visible;
    }

    .modal-card {
      background: #161b22;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
      transform: translateY(20px);
      transition: transform 0.3s ease;
    }

    .modal.active .modal-card {
      transform: translateY(0);
    }

    .modal-title {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 12px;
    }

    .modal-desc {
      font-size: 15px;
      color: #8b949e;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .btn {
      background: #00d4ff;
      color: #07090e;
      border: none;
      padding: 12px 28px;
      font-size: 16px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.1s ease, background-color 0.2s ease;
    }

    .btn:hover {
      background: #38e1ff;
      transform: scale(1.03);
    }

    .btn:active {
      transform: scale(0.98);
    }

    .win-text { color: #00ff66; }
    .lose-text { color: #ff3366; }
    .info-text { color: #00d4ff; }
  </style>
</head>
<body>

  <div id="game-container">
    <canvas id="gameCanvas"></canvas>

    <div id="ui-layer">
      <div class="hud-bar">
        <div class="hud-stat">
          <span>HEALTH</span>
          <div class="health-container">
            <div class="health-bar-bg">
              <div id="health-fill" class="health-bar-fill"></div>
            </div>
          </div>
        </div>

        <div class="hud-stat">
          <span>LEVEL:</span>
          <span id="level-display" class="hud-badge">1/3</span>
        </div>

        <div class="hud-stat">
          <span>ENEMIES:</span>
          <span id="enemies-display" class="hud-badge" style="color: #ff3366;">0</span>
        </div>

        <div class="hud-stat">
          <span>GEMS:</span>
          <span id="gems-display" class="hud-badge" style="color: #ffd700;">0</span>
        </div>
      </div>
    </div>

    <!-- Start / Level / Game Over Modals -->
    <div id="menu-modal" class="modal active">
      <div class="modal-card">
        <h1 class="modal-title info-text">SHADOW STRIKE</h1>
        <p class="modal-desc">
          Tap or click to move.<br>
          Sneak behind guards to eliminate them silently.<br>
          Avoid their vision cones, collect gems, and survive.
        </p>
        <button id="start-btn" class="btn">START OPERATION</button>
      </div>
    </div>

    <div id="victory-modal" class="modal">
      <div class="modal-card">
        <h1 class="modal-title win-text">AREA CLEARED</h1>
        <p id="victory-desc" class="modal-desc">All targets neutralized. Ready for extraction.</p>
        <button id="next-btn" class="btn">NEXT SECTOR</button>
      </div>
    </div>

    <div id="gameover-modal" class="modal">
      <div class="modal-card">
        <h1 class="modal-title lose-text">MISSION FAILED</h1>
        <p class="modal-desc">You were detected and eliminated by security forces.</p>
        <button id="restart-btn" class="btn">RETRY SECTOR</button>
      </div>
    </div>
  </div>

  <script>
    /* ==========================================================================
       AUDIO SYNTHESIZER (WEB AUDIO API)
       ========================================================================== */
    class SoundController {
      constructor() {
        this.ctx = null;
      }

      init() {
        if (!this.ctx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      }

      playStep() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.05);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
      }

      playStab() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Noise buffer for knife slash/impact
        const bufferSize = this.ctx.sampleRate * 0.12;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.12);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
      }

      playAlert() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.15);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
      }

      playGunshot() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Punch oscillator
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        oscGain.gain.setValueAtTime(0.4, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);

        // Gunshot noise decay
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
      }

      playGem() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.06); // E6

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
      }

      playVictory() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
        notes.forEach((freq, index) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const startTime = now + index * 0.1;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.3);
        });
      }
    }

    const sound = new SoundController();

    /* ==========================================================================
       VECTOR & COLLISION MATH
       ========================================================================== */
    class Vec2 {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
      set(x, y) { this.x = x; this.y = y; return this; }
      add(v) { this.x += v.x; this.y += v.y; return this; }
      sub(v) { this.x -= v.x; this.y -= v.y; return this; }
      mult(s) { this.x *= s; this.y *= s; return this; }
      mag() { return Math.hypot(this.x, this.y); }
      normalize() {
        const m = this.mag();
        if (m > 0) { this.x /= m; this.y /= m; }
        return this;
      }
      dist(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
      angle() { return Math.atan2(this.y, this.x); }
      clone() { return new Vec2(this.x, this.y); }
    }

    function lineIntersects(p1, p2, p3, p4) {
      const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
      if (denom === 0) return null;
      const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
      const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
      if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
        return new Vec2(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
      }
      return null;
    }

    function circleRectCollide(cx, cy, r, rx, ry, rw, rh) {
      const closeX = Math.max(rx, Math.min(cx, rx + rw));
      const closeY = Math.max(ry, Math.min(cy, ry + rh));
      const dX = cx - closeX;
      const dY = cy - closeY;
      return (dX * dX + dY * dY) < (r * r);
    }

    /* ==========================================================================
       MAP & LEVEL DEFINITIONS
       ========================================================================== */
    const LEVEL_DATA = [
      {
        id: 1,
        name: "Dock Warehouse",
        walls: [
          // Outer Bounds
          { x: 0, y: 0, w: 900, h: 20 },
          { x: 0, y: 580, w: 900, h: 20 },
          { x: 0, y: 0, w: 20, h: 600 },
          { x: 880, y: 0, w: 20, h: 600 },
          // Obstacles & Rooms
          { x: 160, y: 120, w: 140, h: 100 },
          { x: 160, y: 360, w: 140, h: 120 },
          { x: 420, y: 180, w: 60, h: 240 },
          { x: 600, y: 100, w: 160, h: 120 },
          { x: 600, y: 360, w: 160, h: 140 }
        ],
        guards: [
          { x: 350, y: 140, waypoints: [{x:350, y:140}, {x:350, y:460}] },
          { x: 530, y: 460, waypoints: [{x:530, y:460}, {x:530, y:140}] },
          { x: 780, y: 260, waypoints: [{x:780, y:260}, {x:780, y:500}, {x:530, y:500}] }
        ],
        playerStart: { x: 70, y: 70 }
      },
      {
        id: 2,
        name: "Corporate Labs",
        walls: [
          // Outer Bounds
          { x: 0, y: 0, w: 900, h: 20 },
          { x: 0, y: 580, w: 900, h: 20 },
          { x: 0, y: 0, w: 20, h: 600 },
          { x: 880, y: 0, w: 20, h: 600 },
          // Rooms
          { x: 140, y: 120, w: 20, h: 360 },
          { x: 260, y: 20, w: 20, h: 240 },
          { x: 260, y: 340, w: 20, h: 240 },
          { x: 400, y: 160, w: 120, h: 120 },
          { x: 400, y: 360, w: 120, h: 100 },
          { x: 620, y: 100, w: 140, h: 60 },
          { x: 620, y: 240, w: 140, h: 140 },
          { x: 620, y: 460, w: 140, h: 60 }
        ],
        guards: [
          { x: 200, y: 80, waypoints: [{x:200, y:80}, {x:200, y:500}] },
          { x: 330, y: 480, waypoints: [{x:330, y:480}, {x:330, y:100}] },
          { x: 550, y: 200, waypoints: [{x:550, y:200}, {x:550, y:450}] },
          { x: 800, y: 150, waypoints: [{x:800, y:150}, {x:800, y:480}] }
        ],
        playerStart: { x: 60, y: 300 }
      },
      {
        id: 3,
        name: "Black Site Facility",
        walls: [
          // Outer Bounds
          { x: 0, y: 0, w: 900, h: 20 },
          { x: 0, y: 580, w: 900, h: 20 },
          { x: 0, y: 0, w: 20, h: 600 },
          { x: 880, y: 0, w: 20, h: 600 },
          // Complex obstacles
          { x: 120, y: 100, w: 100, h: 100 },
          { x: 120, y: 400, w: 100, h: 100 },
          { x: 300, y: 200, w: 80, h: 200 },
          { x: 460, y: 80, w: 100, h: 140 },
          { x: 460, y: 380, w: 100, h: 140 },
          { x: 640, y: 200, w: 80, h: 200 },
          { x: 780, y: 100, w: 60, h: 120 },
          { x: 780, y: 380, w: 60, h: 120 }
        ],
        guards: [
          { x: 240, y: 100, waypoints: [{x:240, y:100}, {x:240, y:500}] },
          { x: 400, y: 120, waypoints: [{x:400, y:120}, {x:400, y:480}] },
          { x: 580, y: 480, waypoints: [{x:580, y:480}, {x:580, y:120}] },
          { x: 740, y: 150, waypoints: [{x:740, y:150}, {x:740, y:450}] },
          { x: 840, y: 300, waypoints: [{x:840, y:300}, {x:600, y:300}] }
        ],
        playerStart: { x: 50, y: 50 }
      }
    ];

    /* ==========================================================================
       PARTICLE & PROJECTILE SYSTEM
       ========================================================================== */
    class Particle {
      constructor(x, y, color, speed, size, life, type = 'normal') {
        this.pos = new Vec2(x, y);
        const angle = Math.random() * Math.PI * 2;
        const velMag = Math.random() * speed;
        this.vel = new Vec2(Math.cos(angle) * velMag, Math.sin(angle) * velMag);
        this.color = color;
        this.size = size;
        this.maxLife = life;
        this.life = life;
        this.type = type;
      }

      update(dt) {
        this.pos.add(new Vec2(this.vel.x * dt * 60, this.vel.y * dt * 60));
        this.life -= dt;
        if (this.type === 'blood') {
          this.vel.mult(0.92); // blood splatters and stops
        }
      }

      draw(ctx) {
        ctx.save();
        const alpha = Math.max(this.life / this.maxLife, 0);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size * (this.type === 'blood' ? 1 : alpha), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class Bullet {
      constructor(x, y, angle) {
        this.pos = new Vec2(x, y);
        this.speed = 460;
        this.vel = new Vec2(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
        this.radius = 3;
        this.isDead = false;
      }

      update(dt, walls, player) {
        const nextPos = new Vec2(this.pos.x + this.vel.x * dt, this.pos.y + this.vel.y * dt);

        // Wall collision
        for (let wall of walls) {
          if (lineIntersects(this.pos, nextPos, {x: wall.x, y: wall.y}, {x: wall.x + wall.w, y: wall.y}) ||
              lineIntersects(this.pos, nextPos, {x: wall.x + wall.w, y: wall.y}, {x: wall.x + wall.w, y: wall.y + wall.h}) ||
              lineIntersects(this.pos, nextPos, {x: wall.x + wall.w, y: wall.y + wall.h}, {x: wall.x, y: wall.y + wall.h}) ||
              lineIntersects(this.pos, nextPos, {x: wall.x, y: wall.y + wall.h}, {x: wall.x, y: wall.y})) {
            this.isDead = true;
            return;
          }
        }

        // Player collision
        if (nextPos.dist(player.pos) < player.radius + this.radius) {
          player.takeDamage(25);
          this.isDead = true;
          return;
        }

        this.pos = nextPos;
      }

      draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#ffea00';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class Gem {
      constructor(x, y) {
        this.pos = new Vec2(x, y);
        this.radius = 8;
        this.collected = false;
        this.bobble = Math.random() * Math.PI * 2;
      }

      update(dt, player) {
        this.bobble += dt * 4;
        if (!this.collected && this.pos.dist(player.pos) < player.radius + this.radius + 8) {
          this.collected = true;
          sound.playGem();
        }
      }

      draw(ctx) {
        ctx.save();
        const yOff = Math.sin(this.bobble) * 3;
        ctx.translate(this.pos.x, this.pos.y + yOff);
        
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffea00';
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, 0);
        ctx.lineTo(0, this.radius);
        ctx.lineTo(-this.radius, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    /* ==========================================================================
       ACTORS (PLAYER & GUARDS)
       ========================================================================== */
    class Player {
      constructor(x, y) {
        this.pos = new Vec2(x, y);
        this.target = new Vec2(x, y);
        this.angle = 0;
        this.speed = 190;
        this.radius = 14;
        this.maxHealth = 100;
        this.health = 100;
        this.stepDistance = 0;
      }

      reset(x, y) {
        this.pos.set(x, y);
        this.target.set(x, y);
        this.health = this.maxHealth;
        this.angle = 0;
      }

      setTarget(x, y) {
        this.target.set(x, y);
      }

      takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        updateHUD();
      }

      update(dt, walls) {
        const dist = this.pos.dist(this.target);
        if (dist > 2) {
          const dir = this.target.clone().sub(this.pos).normalize();
          this.angle = dir.angle();

          const moveStep = dir.mult(this.speed * dt);
          
          // Collision resolution (X and Y decoupled for smooth sliding)
          let nextX = this.pos.x + moveStep.x;
          let collideX = false;
          for (let w of walls) {
            if (circleRectCollide(nextX, this.pos.y, this.radius, w.x, w.y, w.w, w.h)) {
              collideX = true;
              break;
            }
          }
          if (!collideX) this.pos.x = nextX;

          let nextY = this.pos.y + moveStep.y;
          let collideY = false;
          for (let w of walls) {
            if (circleRectCollide(this.pos.x, nextY, this.radius, w.x, w.y, w.w, w.h)) {
              collideY = true;
              break;
            }
          }
          if (!collideY) this.pos.y = nextY;

          // Sound trigger for steps
          this.stepDistance += moveStep.mag();
          if (this.stepDistance > 35) {
            sound.playStep();
            this.stepDistance = 0;
          }
        }
      }

      draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.arc(2, 2, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Character Body (Infiltrator Outfit)
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Shoulders / Arms
        ctx.fillStyle = '#0088aa';
        ctx.beginPath();
        ctx.arc(0, -this.radius + 3, 4, 0, Math.PI * 2);
        ctx.arc(0, this.radius - 3, 4, 0, Math.PI * 2);
        ctx.fill();

        // Head / Mask
        ctx.fillStyle = '#0a1018';
        ctx.beginPath();
        ctx.arc(-2, 0, this.radius - 5, 0, Math.PI * 2);
        ctx.fill();

        // Visor glow
        ctx.strokeStyle = '#38e1ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(2, 0, 4, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        ctx.restore();
      }
    }

    class Guard {
      constructor(x, y, waypoints) {
        this.pos = new Vec2(x, y);
        this.waypoints = waypoints.map(w => new Vec2(w.x, w.y));
        this.currentWpIndex = 0;
        this.angle = 0;
        this.targetAngle = 0;
        this.speed = 85;
        this.chaseSpeed = 135;
        this.radius = 14;
        
        this.state = 'PATROL'; // PATROL, ALERT, SEARCH
        this.alertTimer = 0;
        this.shootCooldown = 0;
        this.fovAngle = (65 * Math.PI) / 180;
        this.viewDistance = 220;
        this.lastKnownPos = null;
        this.isDead = false;
      }

      update(dt, walls, player, bullets, particles, guards) {
        if (this.isDead) return;

        if (this.shootCooldown > 0) this.shootCooldown -= dt;

        // Line-of-sight and vision check
        const canSeePlayer = this.checkVision(player, walls);

        if (canSeePlayer) {
          if (this.state !== 'ALERT') {
            sound.playAlert();
            this.state = 'ALERT';
            // Alert nearby guards
            guards.forEach(g => {
              if (g !== this && !g.isDead && g.pos.dist(this.pos) < 260) {
                g.triggerExternalAlert(player.pos);
              }
            });
          }
          this.lastKnownPos = player.pos.clone();
          this.targetAngle = player.pos.clone().sub(this.pos).angle();
          
          // Fire at player
          if (this.shootCooldown <= 0) {
            bullets.push(new Bullet(this.pos.x, this.pos.y, this.angle));
            sound.playGunshot();
            this.shootCooldown = 0.6; // Rate of fire

            // Muzzle flash particle
            for (let i = 0; i < 4; i++) {
              particles.push(new Particle(
                this.pos.x + Math.cos(this.angle) * 20,
                this.pos.y + Math.sin(this.angle) * 20,
                '#ffea00',
                120,
                3,
                0.1
              ));
            }
          }
        } else if (this.state === 'ALERT') {
          this.state = 'SEARCH';
          this.alertTimer = 3.5; // Search duration
        }

        // Behavior State Machine
        if (this.state === 'ALERT') {
          // Approach player
          this.moveTo(player.pos, this.chaseSpeed, dt, walls);
        } else if (this.state === 'SEARCH') {
          this.alertTimer -= dt;
          if (this.lastKnownPos) {
            this.moveTo(this.lastKnownPos, this.speed, dt, walls);
            if (this.pos.dist(this.lastKnownPos) < 10) {
              this.lastKnownPos = null;
            }
          } else {
            this.targetAngle += dt * 2.5; // Look around
          }

          if (this.alertTimer <= 0) {
            this.state = 'PATROL';
          }
        } else {
          // PATROL
          const targetWp = this.waypoints[this.currentWpIndex];
          this.moveTo(targetWp, this.speed, dt, walls);
          if (this.pos.dist(targetWp) < 10) {
            this.currentWpIndex = (this.currentWpIndex + 1) % this.waypoints.length;
          }
        }

        // Smooth rotation
        let diff = this.targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.angle += diff * Math.min(dt * 8, 1);
      }

      moveTo(targetPos, speed, dt, walls) {
        const dir = targetPos.clone().sub(this.pos);
        if (dir.mag() > 2) {
          dir.normalize();
          this.targetAngle = dir.angle();

          const moveStep = dir.mult(speed * dt);

          let nextX = this.pos.x + moveStep.x;
          let collideX = false;
          for (let w of walls) {
            if (circleRectCollide(nextX, this.pos.y, this.radius, w.x, w.y, w.w, w.h)) {
              collideX = true;
              break;
            }
          }
          if (!collideX) this.pos.x = nextX;

          let nextY = this.pos.y + moveStep.y;
          let collideY = false;
          for (let w of walls) {
            if (circleRectCollide(this.pos.x, nextY, this.radius, w.x, w.y, w.w, w.h)) {
              collideY = true;
              break;
            }
          }
          if (!collideY) this.pos.y = nextY;
        }
      }

      triggerExternalAlert(pos) {
        if (this.state !== 'ALERT') {
          this.state = 'SEARCH';
          this.lastKnownPos = pos.clone();
          this.alertTimer = 4.0;
        }
      }

      checkVision(player, walls) {
        const toPlayer = player.pos.clone().sub(this.pos);
        const dist = toPlayer.mag();

        if (dist > this.viewDistance) return false;

        const angleToPlayer = toPlayer.angle();
        let angleDiff = angleToPlayer - this.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (Math.abs(angleDiff) > this.fovAngle / 2) return false;

        // Line-of-sight raycast against walls
        for (let w of walls) {
          const lines = [
            [{x: w.x, y: w.y}, {x: w.x + w.w, y: w.y}],
            [{x: w.x + w.w, y: w.y}, {x: w.x + w.w, y: w.y + w.h}],
            [{x: w.x + w.w, y: w.y + w.h}, {x: w.x, y: w.y + w.h}],
            [{x: w.x, y: w.y + w.h}, {x: w.x, y: w.y}]
          ];
          for (let line of lines) {
            if (lineIntersects(this.pos, player.pos, line[0], line[1])) {
              return false;
            }
          }
        }

        return true;
      }

      drawVisionCone(ctx, walls) {
        if (this.isDead) return;

        ctx.save();
        const rayCount = 40;
        const startAngle = this.angle - this.fovAngle / 2;
        const angleStep = this.fovAngle / rayCount;
        const points = [this.pos];

        for (let i = 0; i <= rayCount; i++) {
          const currentAngle = startAngle + i * angleStep;
          const rayEnd = new Vec2(
            this.pos.x + Math.cos(currentAngle) * this.viewDistance,
            this.pos.y + Math.sin(currentAngle) * this.viewDistance
          );

          let closestHit = rayEnd;
          let minDst = this.viewDistance;

          for (let w of walls) {
            const lines = [
              [{x: w.x, y: w.y}, {x: w.x + w.w, y: w.y}],
              [{x: w.x + w.w, y: w.y}, {x: w.x + w.w, y: w.y + w.h}],
              [{x: w.x + w.w, y: w.y + w.h}, {x: w.x, y: w.y + w.h}],
              [{x: w.x, y: w.y + w.h}, {x: w.x, y: w.y}]
            ];
            for (let line of lines) {
              const hit = lineIntersects(this.pos, rayEnd, line[0], line[1]);
              if (hit) {
                const dst = this.pos.dist(hit);
                if (dst < minDst) {
                  minDst = dst;
                  closestHit = hit;
                }
              }
            }
          }
          points.push(closestHit);
        }

        // Fill vision cone with soft lighting gradient
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();

        let coneColor = 'rgba(255, 230, 100, 0.15)';
        if (this.state === 'ALERT') coneColor = 'rgba(255, 50, 50, 0.35)';
        if (this.state === 'SEARCH') coneColor = 'rgba(255, 150, 0, 0.25)';

        ctx.fillStyle = coneColor;
        ctx.fill();

        // Edge stroke for higher visual fidelity
        ctx.strokeStyle = this.state === 'ALERT' ? 'rgba(255, 50, 50, 0.5)' : 'rgba(255, 230, 100, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }

      draw(ctx) {
        if (this.isDead) return;

        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);

        // Body base
        ctx.fillStyle = this.state === 'ALERT' ? '#ff3366' : (this.state === 'SEARCH' ? '#ff9900' : '#8b949e');
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Weapon barrel
        ctx.fillStyle = '#21262d';
        ctx.fillRect(4, -3, 14, 6);

        // Head/Helmet
        ctx.fillStyle = '#161b22';
        ctx.beginPath();
        ctx.arc(-1, 0, this.radius - 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    /* ==========================================================================
       GAME ENGINE & STATE MANAGEMENT
       ========================================================================== */
    class GameEngine {
      constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.width = 900;
        this.height = 600;
        this.scale = 1;

        this.currentLevelIndex = 0;
        this.gemsCollected = 0;
        this.gameState = 'MENU'; // MENU, PLAYING, GAMEOVER, VICTORY

        this.walls = [];
        this.guards = [];
        this.bullets = [];
        this.particles = [];
        this.gems = [];

        this.player = new Player(0, 0);

        this.lastTime = 0;
        this.initCanvas();
        this.bindEvents();
      }

      initCanvas() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
      }

      resize() {
        const containerW = window.innerWidth;
        const containerH = window.innerHeight;

        const scaleX = containerW / this.width;
        const scaleY = containerH / this.height;
        this.scale = Math.min(scaleX, scaleY) * 0.95;

        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = `${this.width * this.scale}px`;
        this.canvas.style.height = `${this.height * this.scale}px`;
      }

      bindEvents() {
        const handlePointer = (e) => {
          if (this.gameState !== 'PLAYING') return;

          const rect = this.canvas.getBoundingClientRect();
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;

          const x = (clientX - rect.left) / this.scale;
          const y = (clientY - rect.top) / this.scale;

          this.player.setTarget(x, y);

          // Tap indicator visual
          for (let i = 0; i < 6; i++) {
            this.particles.push(new Particle(x, y, '#00d4ff', 80, 2, 0.25));
          }
        };

        this.canvas.addEventListener('mousedown', handlePointer);
        this.canvas.addEventListener('touchstart', (e) => {
          e.preventDefault();
          handlePointer(e);
        }, { passive: false });

        document.getElementById('start-btn').addEventListener('click', () => {
          sound.init();
          this.hideModals();
          this.loadLevel(0);
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
          this.hideModals();
          this.loadLevel(this.currentLevelIndex);
        });

        document.getElementById('next-btn').addEventListener('click', () => {
          this.hideModals();
          if (this.currentLevelIndex + 1 < LEVEL_DATA.length) {
            this.loadLevel(this.currentLevelIndex + 1);
          } else {
            this.loadLevel(0); // Loop back
          }
        });
      }

      hideModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
      }

      loadLevel(index) {
        this.currentLevelIndex = index;
        const data = LEVEL_DATA[index];

        this.walls = data.walls;
        this.guards = data.guards.map(g => new Guard(g.x, g.y, g.waypoints));
        this.player.reset(data.playerStart.x, data.playerStart.y);
        
        this.bullets = [];
        this.particles = [];
        this.gems = [];

        this.gameState = 'PLAYING';
        updateHUD();
      }

      spawnBloodSplatter(x, y) {
        for (let i = 0; i < 35; i++) {
          this.particles.push(new Particle(x, y, '#ff1a4a', 180, Math.random() * 3 + 2, Math.random() * 0.8 + 0.4, 'blood'));
        }
      }

      update(dt) {
        if (this.gameState !== 'PLAYING') return;

        this.player.update(dt, this.walls);

        // Update Gems
        this.gems.forEach(g => {
          const wasCollected = g.collected;
          g.update(dt, this.player);
          if (!wasCollected && g.collected) {
            this.gemsCollected += 10;
            updateHUD();
          }
        });
        this.gems = this.gems.filter(g => !g.collected);

        // Update Bullets
        this.bullets.forEach(b => b.update(dt, this.walls, this.player));
        this.bullets = this.bullets.filter(b => !b.isDead);

        // Update Guards & check Takedowns
        let aliveGuardsCount = 0;
        this.guards.forEach(guard => {
          if (!guard.isDead) {
            guard.update(dt, this.walls, this.player, this.bullets, this.particles, this.guards);
            
            // Stealth Assassination Check
            const dist = this.player.pos.dist(guard.pos);
            if (dist < this.player.radius + guard.radius + 6) {
              // Execute Kill
              guard.isDead = true;
              sound.playStab();
              this.spawnBloodSplatter(guard.pos.x, guard.pos.y);
              this.gems.push(new Gem(guard.pos.x, guard.pos.y));
              updateHUD();
            } else {
              aliveGuardsCount++;
            }
          }
        });

        // Update Particles
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.life > 0);

        // Condition: Player Died
        if (this.player.health <= 0) {
          this.gameState = 'GAMEOVER';
          document.getElementById('gameover-modal').classList.add('active');
        }

        // Condition: Level Cleared
        if (aliveGuardsCount === 0 && this.gameState === 'PLAYING') {
          this.gameState = 'VICTORY';
          sound.playVictory();
          const desc = document.getElementById('victory-desc');
          if (this.currentLevelIndex + 1 < LEVEL_DATA.length) {
            desc.innerText = `Sector ${this.currentLevelIndex + 1} cleared! Prepare for the next mission.`;
          } else {
            desc.innerText = `All black-ops sectors neutralized! Operation Complete.`;
          }
          document.getElementById('victory-modal').classList.add('active');
        }
      }

      draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Base Floor Grid Texture
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        this.ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < this.width; x += gridSize) {
          this.ctx.beginPath();
          this.ctx.moveTo(x, 0);
          this.ctx.lineTo(x, this.height);
          this.ctx.stroke();
        }
        for (let y = 0; y < this.height; y += gridSize) {
          this.ctx.beginPath();
          this.ctx.moveTo(0, y);
          this.ctx.lineTo(this.width, y);
          this.ctx.stroke();
        }

        // Draw Blood/Ground Particles first
        this.particles.filter(p => p.type === 'blood').forEach(p => p.draw(this.ctx));

        // Draw Vision Cones
        this.guards.forEach(g => g.drawVisionCone(this.ctx, this.walls));

        // Draw Walls & Obstacles
        this.walls.forEach(w => {
          // Drop Shadow
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          this.ctx.fillRect(w.x + 4, w.y + 4, w.w, w.h);

          // Wall Body
          this.ctx.fillStyle = '#161b22';
          this.ctx.fillRect(w.x, w.y, w.w, w.h);

          // Top Border highlight
          this.ctx.strokeStyle = '#30363d';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(w.x, w.y, w.w, w.h);
        });

        // Draw Gems
        this.gems.forEach(g => g.draw(this.ctx));

        // Draw Actors
        this.guards.forEach(g => g.draw(this.ctx));
        if (this.player.health > 0) {
          this.player.draw(this.ctx);
        }

        // Draw Bullets & Standard FX Particles
        this.bullets.forEach(b => b.draw(this.ctx));
        this.particles.filter(p => p.type !== 'blood').forEach(p => p.draw(this.ctx));
      }

      start() {
        const loop = (timestamp) => {
          if (!this.lastTime) this.lastTime = timestamp;
          const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
          this.lastTime = timestamp;

          this.update(dt);
          this.draw();

          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      }
    }

    /* ==========================================================================
       HUD SYNCHRONIZATION
       ========================================================================== */
    const game = new GameEngine();

    function updateHUD() {
      // Health UI
      const healthPercent = Math.max(0, (game.player.health / game.player.maxHealth) * 100);
      const fill = document.getElementById('health-fill');
      fill.style.width = `${healthPercent}%`;
      if (healthPercent < 30) {
        fill.style.backgroundColor = '#ff3366';
      } else if (healthPercent < 60) {
        fill.style.backgroundColor = '#ff9900';
      } else {
        fill.style.backgroundColor = '#00ff66';
      }

      // Stats UI
      document.getElementById('level-display').innerText = `${game.currentLevelIndex + 1}/${LEVEL_DATA.length}`;
      const aliveGuards = game.guards.filter(g => !g.isDead).length;
      document.getElementById('enemies-display').innerText = aliveGuards;
      document.getElementById('gems-display').innerText = game.gemsCollected;
    }

    // Run Engine
    window.onload = () => {
      game.start();
    };
  </script>
</body>
</html>