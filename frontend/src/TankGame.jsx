import React, { useRef, useEffect, useState, useCallback } from "react";

// ==========================================
// 1. PROCEDURAL AUDIO SYNTHESIZER (WEB AUDIO API)
// ==========================================
class SoundSynth {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playStep() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.04);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  playStab() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bufSize = Math.floor(this.ctx.sampleRate * 0.14);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.14);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

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
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(460, now);
    osc.frequency.linearRampToValueAtTime(920, now + 0.16);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playGunshot() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    oscGain.gain.setValueAtTime(0.45, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    const bufSize = Math.floor(this.ctx.sampleRate * 0.18);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    noise.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playGem() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.setValueAtTime(1380, now + 0.07);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playWin() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.1;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  playLose() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.55);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  }
}

const audio = new SoundSynth();

// ==========================================
// 2. VECTOR & GEOMETRY UTILITIES
// ==========================================
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
  return dX * dX + dY * dY < r * r;
}

// ==========================================
// 3. MAP DEFINITIONS
// ==========================================
const LEVEL_CONFIGS = [
  {
    id: 1,
    name: "Cargo Bay 01",
    walls: [
      { x: 0, y: 0, w: 900, h: 20 },
      { x: 0, y: 580, w: 900, h: 20 },
      { x: 0, y: 0, w: 20, h: 600 },
      { x: 880, y: 0, w: 20, h: 600 },
      { x: 160, y: 120, w: 140, h: 100 },
      { x: 160, y: 360, w: 140, h: 120 },
      { x: 420, y: 180, w: 60, h: 240 },
      { x: 600, y: 100, w: 160, h: 120 },
      { x: 600, y: 360, w: 160, h: 140 }
    ],
    guards: [
      { x: 350, y: 140, waypoints: [{ x: 350, y: 140 }, { x: 350, y: 460 }] },
      { x: 530, y: 460, waypoints: [{ x: 530, y: 460 }, { x: 530, y: 140 }] },
      { x: 780, y: 260, waypoints: [{ x: 780, y: 260 }, { x: 780, y: 500 }, { x: 530, y: 500 }] }
    ],
    playerStart: { x: 70, y: 70 }
  },
  {
    id: 2,
    name: "Corporate Labs",
    walls: [
      { x: 0, y: 0, w: 900, h: 20 },
      { x: 0, y: 580, w: 900, h: 20 },
      { x: 0, y: 0, w: 20, h: 600 },
      { x: 880, y: 0, w: 20, h: 600 },
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
      { x: 200, y: 80, waypoints: [{ x: 200, y: 80 }, { x: 200, y: 500 }] },
      { x: 330, y: 480, waypoints: [{ x: 330, y: 480 }, { x: 330, y: 100 }] },
      { x: 550, y: 200, waypoints: [{ x: 550, y: 200 }, { x: 550, y: 450 }] },
      { x: 800, y: 150, waypoints: [{ x: 800, y: 150 }, { x: 800, y: 480 }] }
    ],
    playerStart: { x: 60, y: 300 }
  },
  {
    id: 3,
    name: "Black Site Bunker",
    walls: [
      { x: 0, y: 0, w: 900, h: 20 },
      { x: 0, y: 580, w: 900, h: 20 },
      { x: 0, y: 0, w: 20, h: 600 },
      { x: 880, y: 0, w: 20, h: 600 },
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
      { x: 240, y: 100, waypoints: [{ x: 240, y: 100 }, { x: 240, y: 500 }] },
      { x: 400, y: 120, waypoints: [{ x: 400, y: 120 }, { x: 400, y: 480 }] },
      { x: 580, y: 480, waypoints: [{ x: 580, y: 480 }, { x: 580, y: 120 }] },
      { x: 740, y: 150, waypoints: [{ x: 740, y: 150 }, { x: 740, y: 450 }] },
      { x: 840, y: 300, waypoints: [{ x: 840, y: 300 }, { x: 600, y: 300 }] }
    ],
    playerStart: { x: 50, y: 50 }
  }
];

// ==========================================
// 4. ENTITY CLASSES
// ==========================================
class Particle {
  constructor(x, y, color, speed, size, life, type = "normal") {
    this.pos = new Vec2(x, y);
    const ang = Math.random() * Math.PI * 2;
    const v = Math.random() * speed;
    this.vel = new Vec2(Math.cos(ang) * v, Math.sin(ang) * v);
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.type = type;
  }

  update(dt) {
    this.pos.add(new Vec2(this.vel.x * dt * 60, this.vel.y * dt * 60));
    this.life -= dt;
    if (this.type === "blood") this.vel.mult(0.92);
  }

  draw(ctx) {
    ctx.save();
    const alpha = Math.max(this.life / this.maxLife, 0);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.size * (this.type === "blood" ? 1 : alpha), 0, Math.PI * 2);
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
    const next = new Vec2(this.pos.x + this.vel.x * dt, this.pos.y + this.vel.y * dt);

    for (let w of walls) {
      if (
        lineIntersects(this.pos, next, { x: w.x, y: w.y }, { x: w.x + w.w, y: w.y }) ||
        lineIntersects(this.pos, next, { x: w.x + w.w, y: w.y }, { x: w.x + w.w, y: w.y + w.h }) ||
        lineIntersects(this.pos, next, { x: w.x + w.w, y: w.y + w.h }, { x: w.x, y: w.y + w.h }) ||
        lineIntersects(this.pos, next, { x: w.x, y: w.y + w.h }, { x: w.x, y: w.y })
      ) {
        this.isDead = true;
        return;
      }
    }

    if (next.dist(player.pos) < player.radius + this.radius) {
      player.takeDamage(25);
      this.isDead = true;
      return;
    }

    this.pos = next;
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = "#ffea00";
    ctx.shadowColor = "#ffaa00";
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
      audio.playGem();
    }
  }

  draw(ctx) {
    ctx.save();
    const yOff = Math.sin(this.bobble) * 3;
    ctx.translate(this.pos.x, this.pos.y + yOff);
    ctx.fillStyle = "#ffd700";
    ctx.shadowColor = "#ffea00";
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

class Player {
  constructor(x, y) {
    this.pos = new Vec2(x, y);
    this.target = new Vec2(x, y);
    this.angle = 0;
    this.speed = 195;
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

  takeDamage(amt) {
    this.health = Math.max(0, this.health - amt);
  }

  update(dt, walls) {
    const dist = this.pos.dist(this.target);
    if (dist > 2) {
      const dir = this.target.clone().sub(this.pos).normalize();
      this.angle = dir.angle();
      const moveStep = dir.mult(this.speed * dt);

      // Decoupled X/Y movement for wall sliding
      let nextX = this.pos.x + moveStep.x;
      let colX = false;
      for (let w of walls) {
        if (circleRectCollide(nextX, this.pos.y, this.radius, w.x, w.y, w.w, w.h)) {
          colX = true;
          break;
        }
      }
      if (!colX) this.pos.x = nextX;

      let nextY = this.pos.y + moveStep.y;
      let colY = false;
      for (let w of walls) {
        if (circleRectCollide(this.pos.x, nextY, this.radius, w.x, w.y, w.w, w.h)) {
          colY = true;
          break;
        }
      }
      if (!colY) this.pos.y = nextY;

      this.stepDistance += moveStep.mag();
      if (this.stepDistance > 36) {
        audio.playStep();
        this.stepDistance = 0;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.arc(2, 2, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#00d4ff";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0088aa";
    ctx.beginPath();
    ctx.arc(0, -this.radius + 3, 4, 0, Math.PI * 2);
    ctx.arc(0, this.radius - 3, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0a1018";
    ctx.beginPath();
    ctx.arc(-2, 0, this.radius - 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#38e1ff";
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
    this.waypoints = waypoints.map((w) => new Vec2(w.x, w.y));
    this.currentWpIndex = 0;
    this.angle = 0;
    this.targetAngle = 0;
    this.speed = 85;
    this.chaseSpeed = 135;
    this.radius = 14;
    this.state = "PATROL"; // PATROL, ALERT, SEARCH
    this.alertTimer = 0;
    this.shootCooldown = 0;
    this.fovAngle = (65 * Math.PI) / 180;
    this.viewDistance = 210;
    this.lastKnownPos = null;
    this.isDead = false;
  }

  update(dt, walls, player, bullets, particles, guards) {
    if (this.isDead) return;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const canSeePlayer = this.checkVision(player, walls);

    if (canSeePlayer) {
      if (this.state !== "ALERT") {
        audio.playAlert();
        this.state = "ALERT";
        guards.forEach((g) => {
          if (g !== this && !g.isDead && g.pos.dist(this.pos) < 260) {
            g.triggerExternalAlert(player.pos);
          }
        });
      }
      this.lastKnownPos = player.pos.clone();
      this.targetAngle = player.pos.clone().sub(this.pos).angle();

      if (this.shootCooldown <= 0) {
        bullets.push(new Bullet(this.pos.x, this.pos.y, this.angle));
        audio.playGunshot();
        this.shootCooldown = 0.6;
        for (let i = 0; i < 4; i++) {
          particles.push(
            new Particle(
              this.pos.x + Math.cos(this.angle) * 20,
              this.pos.y + Math.sin(this.angle) * 20,
              "#ffea00",
              120,
              3,
              0.1
            )
          );
        }
      }
    } else if (this.state === "ALERT") {
      this.state = "SEARCH";
      this.alertTimer = 3.5;
    }

    if (this.state === "ALERT") {
      this.moveTo(player.pos, this.chaseSpeed, dt, walls);
    } else if (this.state === "SEARCH") {
      this.alertTimer -= dt;
      if (this.lastKnownPos) {
        this.moveTo(this.lastKnownPos, this.speed, dt, walls);
        if (this.pos.dist(this.lastKnownPos) < 10) this.lastKnownPos = null;
      } else {
        this.targetAngle += dt * 2.5;
      }
      if (this.alertTimer <= 0) this.state = "PATROL";
    } else {
      const targetWp = this.waypoints[this.currentWpIndex];
      this.moveTo(targetWp, this.speed, dt, walls);
      if (this.pos.dist(targetWp) < 10) {
        this.currentWpIndex = (this.currentWpIndex + 1) % this.waypoints.length;
      }
    }

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
      let colX = false;
      for (let w of walls) {
        if (circleRectCollide(nextX, this.pos.y, this.radius, w.x, w.y, w.w, w.h)) {
          colX = true;
          break;
        }
      }
      if (!colX) this.pos.x = nextX;

      let nextY = this.pos.y + moveStep.y;
      let colY = false;
      for (let w of walls) {
        if (circleRectCollide(this.pos.x, nextY, this.radius, w.x, w.y, w.w, w.h)) {
          colY = true;
          break;
        }
      }
      if (!colY) this.pos.y = nextY;
    }
  }

  triggerExternalAlert(pos) {
    if (this.state !== "ALERT") {
      this.state = "SEARCH";
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

    for (let w of walls) {
      const lines = [
        [{ x: w.x, y: w.y }, { x: w.x + w.w, y: w.y }],
        [{ x: w.x + w.w, y: w.y }, { x: w.x + w.w, y: w.y + w.h }],
        [{ x: w.x + w.w, y: w.y + w.h }, { x: w.x, y: w.y + w.h }],
        [{ x: w.x, y: w.y + w.h }, { x: w.x, y: w.y }]
      ];
      for (let line of lines) {
        if (lineIntersects(this.pos, player.pos, line[0], line[1])) return false;
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
      const curAngle = startAngle + i * angleStep;
      const rayEnd = new Vec2(
        this.pos.x + Math.cos(curAngle) * this.viewDistance,
        this.pos.y + Math.sin(curAngle) * this.viewDistance
      );

      let closest = rayEnd;
      let minDst = this.viewDistance;

      for (let w of walls) {
        const lines = [
          [{ x: w.x, y: w.y }, { x: w.x + w.w, y: w.y }],
          [{ x: w.x + w.w, y: w.y }, { x: w.x + w.w, y: w.y + w.h }],
          [{ x: w.x + w.w, y: w.y + w.h }, { x: w.x, y: w.y + w.h }],
          [{ x: w.x, y: w.y + w.h }, { x: w.x, y: w.y }]
        ];
        for (let line of lines) {
          const hit = lineIntersects(this.pos, rayEnd, line[0], line[1]);
          if (hit) {
            const dst = this.pos.dist(hit);
            if (dst < minDst) {
              minDst = dst;
              closest = hit;
            }
          }
        }
      }
      points.push(closest);
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();

    let coneColor = "rgba(255, 230, 100, 0.16)";
    if (this.state === "ALERT") coneColor = "rgba(255, 50, 50, 0.36)";
    if (this.state === "SEARCH") coneColor = "rgba(255, 150, 0, 0.26)";

    ctx.fillStyle = coneColor;
    ctx.fill();

    ctx.strokeStyle = this.state === "ALERT" ? "rgba(255, 50, 50, 0.55)" : "rgba(255, 230, 100, 0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  draw(ctx) {
    if (this.isDead) return;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    ctx.fillStyle = this.state === "ALERT" ? "#ff3366" : this.state === "SEARCH" ? "#ff9900" : "#8b949e";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#21262d";
    ctx.fillRect(4, -3, 14, 6);

    ctx.fillStyle = "#161b22";
    ctx.beginPath();
    ctx.arc(-1, 0, this.radius - 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Alert / Search indicators
    if (this.state === "ALERT") {
      ctx.save();
      ctx.fillStyle = "#ff3366";
      ctx.font = "bold 18px monospace";
      ctx.fillText("!", this.pos.x - 4, this.pos.y - 20);
      ctx.restore();
    } else if (this.state === "SEARCH") {
      ctx.save();
      ctx.fillStyle = "#ff9900";
      ctx.font = "bold 18px monospace";
      ctx.fillText("?", this.pos.x - 5, this.pos.y - 20);
      ctx.restore();
    }
  }
}

// ==========================================
// 5. REACT COMPONENT
// ==========================================
export default function HunterGame() {
  const canvasRef = useRef(null);
  const engineRef = useRef({
    gameState: "MENU", // MENU, PLAYING, VICTORY, GAMEOVER
    currentLevel: 0,
    walls: [],
    guards: [],
    bullets: [],
    particles: [],
    gems: [],
    player: new Player(0, 0),
    lastTime: 0,
    animId: null,
    scale: 1
  });

  const [uiState, setUiState] = useState({
    gameState: "MENU",
    level: 1,
    totalLevels: LEVEL_CONFIGS.length,
    enemiesLeft: 0,
    gemsCollected: 0,
    health: 100,
    maxHealth: 100,
    isPaused: false
  });

  const loadLevel = useCallback((levelIdx) => {
    const e = engineRef.current;
    e.currentLevel = levelIdx;
    const data = LEVEL_CONFIGS[levelIdx];

    e.walls = data.walls;
    e.guards = data.guards.map((g) => new Guard(g.x, g.y, g.waypoints));
    e.player.reset(data.playerStart.x, data.playerStart.y);
    e.bullets = [];
    e.particles = [];
    e.gems = [];
    e.gameState = "PLAYING";

    setUiState((prev) => ({
      ...prev,
      gameState: "PLAYING",
      level: levelIdx + 1,
      enemiesLeft: e.guards.length,
      health: e.player.health,
      maxHealth: e.player.maxHealth,
      isPaused: false
    }));
  }, []);

  const spawnBlood = (x, y) => {
    const e = engineRef.current;
    for (let i = 0; i < 35; i++) {
      e.particles.push(
        new Particle(x, y, "#ff1a4a", 180, Math.random() * 3 + 2, Math.random() * 0.8 + 0.4, "blood")
      );
    }
  };

  const handlePointer = (e) => {
    const eng = engineRef.current;
    if (eng.gameState !== "PLAYING" || uiState.isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) / eng.scale;
    const y = (clientY - rect.top) / eng.scale;

    eng.player.setTarget(x, y);
    for (let i = 0; i < 6; i++) {
      eng.particles.push(new Particle(x, y, "#00d4ff", 80, 2, 0.25));
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const eng = engineRef.current;

    const resize = () => {
      const containerW = window.innerWidth;
      const containerH = window.innerHeight;
      const scaleX = containerW / 900;
      const scaleY = containerH / 600;
      eng.scale = Math.min(scaleX, scaleY) * 0.94;

      canvas.width = 900;
      canvas.height = 600;
      canvas.style.width = `${900 * eng.scale}px`;
      canvas.style.height = `${600 * eng.scale}px`;
    };

    resize();
    window.addEventListener("resize", resize);

    const gameLoop = (timestamp) => {
      if (!eng.lastTime) eng.lastTime = timestamp;
      const dt = Math.min((timestamp - eng.lastTime) / 1000, 0.1);
      eng.lastTime = timestamp;

      if (eng.gameState === "PLAYING" && !uiState.isPaused) {
        eng.player.update(dt, eng.walls);

        eng.gems.forEach((g) => {
          const wasCol = g.collected;
          g.update(dt, eng.player);
          if (!wasCol && g.collected) {
            setUiState((prev) => ({ ...prev, gemsCollected: prev.gemsCollected + 10 }));
          }
        });
        eng.gems = eng.gems.filter((g) => !g.collected);

        eng.bullets.forEach((b) => b.update(dt, eng.walls, eng.player));
        eng.bullets = eng.bullets.filter((b) => !b.isDead);

        let activeCount = 0;
        eng.guards.forEach((guard) => {
          if (!guard.isDead) {
            guard.update(dt, eng.walls, eng.player, eng.bullets, eng.particles, eng.guards);

            // Knife assassination range check
            const dist = eng.player.pos.dist(guard.pos);
            if (dist < eng.player.radius + guard.radius + 7) {
              guard.isDead = true;
              audio.playStab();
              spawnBlood(guard.pos.x, guard.pos.y);
              eng.gems.push(new Gem(guard.pos.x, guard.pos.y));
            } else {
              activeCount++;
            }
          }
        });

        eng.particles.forEach((p) => p.update(dt));
        eng.particles = eng.particles.filter((p) => p.life > 0);

        setUiState((prev) => {
          if (prev.enemiesLeft !== activeCount || prev.health !== eng.player.health) {
            return { ...prev, enemiesLeft: activeCount, health: eng.player.health };
          }
          return prev;
        });

        if (eng.player.health <= 0) {
          eng.gameState = "GAMEOVER";
          audio.playLose();
          setUiState((prev) => ({ ...prev, gameState: "GAMEOVER" }));
        } else if (activeCount === 0) {
          eng.gameState = "VICTORY";
          audio.playWin();
          setUiState((prev) => ({ ...prev, gameState: "VICTORY" }));
        }
      }

      // RENDER
      ctx.clearRect(0, 0, 900, 600);

      // Floor grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      for (let x = 0; x < 900; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 600);
        ctx.stroke();
      }
      for (let y = 0; y < 600; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(900, y);
        ctx.stroke();
      }

      eng.particles.filter((p) => p.type === "blood").forEach((p) => p.draw(ctx));
      eng.guards.forEach((g) => g.drawVisionCone(ctx, eng.walls));

      // Walls
      eng.walls.forEach((w) => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(w.x + 4, w.y + 4, w.w, w.h);

        ctx.fillStyle = "#161b22";
        ctx.fillRect(w.x, w.y, w.w, w.h);

        ctx.strokeStyle = "#30363d";
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
      });

      eng.gems.forEach((g) => g.draw(ctx));
      eng.guards.forEach((g) => g.draw(ctx));
      if (eng.player.health > 0) eng.player.draw(ctx);
      eng.bullets.forEach((b) => b.draw(ctx));
      eng.particles.filter((p) => p.type !== "blood").forEach((p) => p.draw(ctx));

      eng.animId = requestAnimationFrame(gameLoop);
    };

    eng.animId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("resize", resize);
      if (eng.animId) cancelAnimationFrame(eng.animId);
    };
  }, [uiState.isPaused]);

  return (
    <div style={styles.container}>
      <style>{`
        * { box-sizing: border-box; user-select: none; }
        .btn-hover:hover { transform: scale(1.03); background-color: #38e1ff !important; }
        .btn-hover:active { transform: scale(0.98); }
      `}</style>

      {/* TOP HUD BAR */}
      <div style={styles.hudBar}>
        <div style={styles.hudStat}>
          <span style={styles.label}>HEALTH</span>
          <div style={styles.healthBg}>
            <div
              style={{
                ...styles.healthFill,
                width: `${Math.max(0, (uiState.health / uiState.maxHealth) * 100)}%`,
                backgroundColor:
                  uiState.health < 30 ? "#ff3366" : uiState.health < 60 ? "#ff9900" : "#00ff66"
              }}
            />
          </div>
        </div>

        <div style={styles.hudStat}>
          <span style={styles.label}>LEVEL:</span>
          <span style={{ ...styles.badge, color: "#00d4ff" }}>
            {uiState.level}/{uiState.totalLevels}
          </span>
        </div>

        <div style={styles.hudStat}>
          <span style={styles.label}>ENEMIES:</span>
          <span style={{ ...styles.badge, color: "#ff3366" }}>{uiState.enemiesLeft}</span>
        </div>

        <div style={styles.hudStat}>
          <span style={styles.label}>GEMS:</span>
          <span style={{ ...styles.badge, color: "#ffd700" }}>{uiState.gemsCollected}</span>
        </div>

        {uiState.gameState === "PLAYING" && (
          <button
            style={styles.pauseBtn}
            onClick={() => setUiState((prev) => ({ ...prev, isPaused: !prev.isPaused }))}
          >
            {uiState.isPaused ? "RESUME" : "PAUSE"}
          </button>
        )}
      </div>

      {/* CANVAS */}
      <canvas
        ref={canvasRef}
        onMouseDown={handlePointer}
        onTouchStart={(e) => {
          e.preventDefault();
          handlePointer(e);
        }}
        style={styles.canvas}
      />

      {/* MODAL OVERLAYS */}
      {uiState.gameState === "MENU" && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h1 style={{ ...styles.modalTitle, color: "#00d4ff" }}>SHADOW HUNTER</h1>
            <p style={styles.modalDesc}>
              Tap or click to move stealthily.
              <br />
              Eliminate guards from behind or outside their flashlight beams.
              <br />
              Collect diamonds and neutralize all targets to clear sectors.
            </p>
            <button
              className="btn-hover"
              style={styles.btn}
              onClick={() => {
                audio.init();
                loadLevel(0);
              }}
            >
              START OPERATION
            </button>
          </div>
        </div>
      )}

      {uiState.gameState === "VICTORY" && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h1 style={{ ...styles.modalTitle, color: "#00ff66" }}>SECTOR CLEARED</h1>
            <p style={styles.modalDesc}>
              {engineRef.current.currentLevel + 1 < LEVEL_CONFIGS.length
                ? `Sector ${engineRef.current.currentLevel + 1} secure. Ready for next insertion.`
                : "All priority sectors cleared! Mission accomplished."}
            </p>
            <button
              className="btn-hover"
              style={styles.btn}
              onClick={() => {
                const next = engineRef.current.currentLevel + 1;
                loadLevel(next < LEVEL_CONFIGS.length ? next : 0);
              }}
            >
              {engineRef.current.currentLevel + 1 < LEVEL_CONFIGS.length ? "NEXT SECTOR" : "REPLAY CAMPAIGN"}
            </button>
          </div>
        </div>
      )}

      {uiState.gameState === "GAMEOVER" && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h1 style={{ ...styles.modalTitle, color: "#ff3366" }}>MISSION FAILED</h1>
            <p style={styles.modalDesc}>You were detected and neutralized by security forces.</p>
            <button
              className="btn-hover"
              style={styles.btn}
              onClick={() => loadLevel(engineRef.current.currentLevel)}
            >
              RETRY SECTOR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 6. ENCAPSULATED REACT STYLES
// ==========================================
const styles = {
  container: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#07090e",
    overflow: "hidden",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: "#fff"
  },
  hudBar: {
    position: "absolute",
    top: 16,
    zIndex: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "90%",
    maxWidth: 880,
    backgroundColor: "rgba(13, 17, 23, 0.8)",
    backdropFilter: "blur(8px)",
    padding: "10px 20px",
    borderRadius: 12,
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)"
  },
  hudStat: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 600
  },
  label: {
    color: "#8b949e",
    letterSpacing: "0.5px"
  },
  healthBg: {
    width: 110,
    height: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 5,
    overflow: "hidden"
  },
  healthFill: {
    height: "100%",
    transition: "width 0.2s ease, background-color 0.2s ease"
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    padding: "3px 8px",
    borderRadius: 6,
    fontWeight: 700
  },
  pauseBtn: {
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    color: "#fff",
    padding: "4px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer"
  },
  canvas: {
    display: "block",
    backgroundColor: "#0d1117",
    boxShadow: "0 0 35px rgba(0, 0, 0, 0.85)",
    cursor: "crosshair",
    borderRadius: 8
  },
  modalOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 20,
    backgroundColor: "rgba(7, 9, 14, 0.85)",
    backdropFilter: "blur(10px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  modalCard: {
    backgroundColor: "#161b22",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    padding: "36px 40px",
    borderRadius: 16,
    textAlign: "center",
    maxWidth: 420,
    width: "90%",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6)"
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: 800,
    marginBottom: 12,
    letterSpacing: "0.5px"
  },
  modalDesc: {
    fontSize: 14,
    color: "#8b949e",
    marginBottom: 24,
    lineHeight: 1.6
  },
  btn: {
    backgroundColor: "#00d4ff",
    color: "#07090e",
    border: "none",
    padding: "12px 28px",
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 8,
    cursor: "pointer",
    transition: "transform 0.15s ease, background-color 0.2s ease"
  }
};