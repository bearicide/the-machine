const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const ballsEl = document.getElementById('balls');
const modeEl = document.getElementById('mode');
const slotEl = document.getElementById('slotReadout');
const muteBtn = document.getElementById('muteBtn');

let score = 0;
let balls = 3;
let leftDown = false;
let rightDown = false;
let running = true;
let multiball = false;
let multiballTicks = 0;
let shake = 0;
let frame = 0;
let combo = 1;
let comboTicks = 0;
let lastHitLabel = 'READY';
let muted = true;
let audioCtx = null;

const table = {
  w: canvas.width,
  h: canvas.height,
  wall: 24,
  drainY: canvas.height + 40
};

const mainBall = makeBall(360, 250, 2.6, 3.2, '#ffffff');
const extraBalls = [];
const particles = [];
const popups = [];
const trails = [];

const bumpers = [
  { x: 220, y: 300, r: 46, label: 'WORD', value: 120, color: '#00f5ff', pulse: 0 },
  { x: 500, y: 350, r: 52, label: 'PLAY', value: 140, color: '#ff2bd6', pulse: 0 },
  { x: 360, y: 520, r: 58, label: 'BEAR', value: 180, color: '#9dff37', pulse: 0 },
  { x: 185, y: 620, r: 34, label: 'FX', value: 90, color: '#ffd166', pulse: 0 },
  { x: 535, y: 655, r: 34, label: 'WILD', value: 90, color: '#ff3131', pulse: 0 }
];

const lanes = [
  { x: 82, y: 118, w: 84, h: 520, color: '#00f5ff' },
  { x: 554, y: 118, w: 84, h: 520, color: '#ff2bd6' }
];

function makeBall(x, y, vx, vy, color) {
  return { x, y, vx, vy, r: 14, color, active: true, lastTrail: 0 };
}

function setHud() {
  scoreEl.textContent = String(score);
  ballsEl.textContent = String(Math.max(0, balls));
  modeEl.textContent = multiball ? 'MULTIBALL RITUAL' : combo > 1 ? `COMBO x${combo}` : 'RITUAL IDLE';
}

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function tone(freq, duration = 0.07, type = 'square', gain = 0.025) {
  if (muted) return;
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.value = gain;
  osc.connect(amp).connect(audioCtx.destination);
  osc.start();
  amp.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.stop(audioCtx.currentTime + duration);
}

function ritualChord(base) {
  tone(base, 0.08, 'sawtooth', 0.025);
  setTimeout(() => tone(base * 1.5, 0.08, 'triangle', 0.018), 34);
  setTimeout(() => tone(base * 2, 0.08, 'square', 0.014), 68);
}

function slotHit(label) {
  const symbols = ['WORD', 'PLAY', 'BEAR', 'WILD', 'FX', '777'];
  const a = label;
  const b = symbols[Math.floor(Math.random() * symbols.length)];
  const c = symbols[Math.floor(Math.random() * symbols.length)];
  slotEl.textContent = `${a}-${b}-${c}`;
  if (a === b && b === c) {
    award(1000 * combo, table.w / 2, 210, 'JACKPOT', '#ffd166');
    shake = 22;
    ritualChord(180);
  }
}

function award(amount, x, y, label = `+${amount}`, color = '#ffffff') {
  score += amount;
  popups.push({ x, y, text: label, color, life: 68, max: 68, vy: -1.25 });
  setHud();
}

function launchBall() {
  ensureAudio();
  mainBall.x = 360;
  mainBall.y = 880;
  mainBall.vx = (Math.random() - 0.5) * 5;
  mainBall.vy = -15;
  mainBall.active = true;
  lastHitLabel = 'LAUNCH';
  spawnBurst(360, 880, '#00f5ff', 18, 8);
  tone(95, 0.11, 'sawtooth', 0.035);
}

function triggerMultiball() {
  ensureAudio();
  multiball = true;
  multiballTicks = 720;
  extraBalls.length = 0;
  extraBalls.push(makeBall(335, 270, -4.2, 3.4, '#9dff37'));
  extraBalls.push(makeBall(390, 270, 4.5, 3.1, '#ff2bd6'));
  extraBalls.push(makeBall(360, 235, 0.8, 4.6, '#00f5ff'));
  slotEl.textContent = 'MULTIBALL';
  combo = Math.max(combo, 2);
  comboTicks = 500;
  shake = 28;
  spawnBurst(360, 430, '#ffd166', 70, 14);
  popups.push({ x: 360, y: 250, text: 'MULTIBALL RITUAL', color: '#ffd166', life: 90, max: 90, vy: -0.7 });
  ritualChord(110);
  setHud();
}

function resetGame() {
  score = 0;
  balls = 3;
  multiball = false;
  multiballTicks = 0;
  combo = 1;
  comboTicks = 0;
  extraBalls.length = 0;
  particles.length = 0;
  popups.length = 0;
  trails.length = 0;
  slotEl.textContent = 'READY';
  launchBall();
  setHud();
}

function drawTable() {
  frame++;
  const sx = shake ? (Math.random() - 0.5) * shake : 0;
  const sy = shake ? (Math.random() - 0.5) * shake : 0;
  if (shake > 0) shake *= 0.86;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.clearRect(-40, -40, table.w + 80, table.h + 80);

  const bg = ctx.createLinearGradient(0, 0, table.w, table.h);
  bg.addColorStop(0, '#07030f');
  bg.addColorStop(0.5, multiball ? '#17103a' : '#101026');
  bg.addColorStop(1, '#05010a');
  ctx.fillStyle = bg;
  ctx.fillRect(-40, -40, table.w + 80, table.h + 80);

  drawBackgroundGrid();
  drawCabinetLines();
  drawLanes();
  drawRitualMeters();
  drawBumpers();
  drawFlippers();
  updateAndDrawTrails();
  drawBall(mainBall);
  extraBalls.forEach(drawBall);
  updateAndDrawParticles();
  updateAndDrawPopups();

  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = '800 28px Bahnschrift, Arial';
  ctx.textAlign = 'center';
  ctx.fillText(machinePhrase(), table.w / 2, 92);

  ctx.fillStyle = 'rgba(157,255,55,0.75)';
  ctx.font = '700 16px Bahnschrift, Arial';
  ctx.fillText(`LAST HIT: ${lastHitLabel}`, table.w / 2, 118);
  ctx.restore();
}

function machinePhrase() {
  if (multiball) return 'THE MACHINE HAS ENTERED RITUAL STATE';
  if (combo > 2) return 'THE MACHINE REWARDS REPETITION';
  return 'THE MACHINE REMEMBERS';
}

function drawBackgroundGrid() {
  ctx.save();
  ctx.strokeStyle = 'rgba(0,245,255,0.07)';
  ctx.lineWidth = 1;
  for (let x = 48; x < table.w; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x + Math.sin((frame + x) * 0.015) * 10, table.h - 60);
    ctx.stroke();
  }
  for (let y = 130; y < table.h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(45, y);
    ctx.lineTo(table.w - 45, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCabinetLines() {
  ctx.strokeStyle = 'rgba(0,245,255,0.35)';
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, table.w - 48, table.h - 48);

  ctx.strokeStyle = 'rgba(255,43,214,0.22)';
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, table.w - 88, table.h - 88);

  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(110, 790, 500, 18);
  ctx.fillRect(140, 830, 440, 18);
}

function drawLanes() {
  lanes.forEach((lane, i) => {
    const glow = 0.35 + Math.sin(frame * 0.04 + i) * 0.18;
    ctx.save();
    ctx.strokeStyle = lane.color;
    ctx.globalAlpha = glow;
    ctx.lineWidth = 5;
    ctx.strokeRect(lane.x, lane.y, lane.w, lane.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(lane.x, lane.y, lane.w, lane.h);
    ctx.restore();
  });
}

function drawRitualMeters() {
  const meter = Math.min(1, comboTicks / 500);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(190, 150, 340, 14);
  const grad = ctx.createLinearGradient(190, 0, 530, 0);
  grad.addColorStop(0, '#00f5ff');
  grad.addColorStop(0.5, '#ff2bd6');
  grad.addColorStop(1, '#ffd166');
  ctx.fillStyle = grad;
  ctx.fillRect(190, 150, 340 * meter, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '700 13px Bahnschrift, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('RITUAL PRESSURE', 360, 144);
  ctx.restore();
}

function drawBumpers() {
  bumpers.forEach(b => {
    b.pulse *= 0.88;
    const pulseR = b.r + b.pulse;
    ctx.save();
    ctx.shadowBlur = 28 + b.pulse * 2;
    ctx.shadowColor = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, pulseR, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.24;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#05010a';
    ctx.font = '900 18px Bahnschrift, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x, b.y + 6);
    ctx.restore();
  });
}

function drawFlippers() {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 22;
  ctx.shadowBlur = 24;

  ctx.strokeStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.beginPath();
  ctx.moveTo(210, 930);
  ctx.lineTo(leftDown ? 330 : 310, leftDown ? 870 : 935);
  ctx.stroke();

  ctx.strokeStyle = '#ff2bd6';
  ctx.shadowColor = '#ff2bd6';
  ctx.beginPath();
  ctx.moveTo(510, 930);
  ctx.lineTo(rightDown ? 390 : 410, rightDown ? 870 : 935);
  ctx.stroke();
  ctx.restore();
}

function drawBall(b) {
  if (!b.active) return;
  ctx.save();
  const grad = ctx.createRadialGradient(b.x - 5, b.y - 5, 2, b.x, b.y, b.r + 8);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.45, b.color);
  grad.addColorStop(1, 'rgba(0,245,255,0.1)');
  ctx.shadowBlur = 30;
  ctx.shadowColor = b.color;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

function updateBall(b) {
  if (!b.active) return;

  b.vy += 0.34;
  b.vx *= 0.998;
  b.vy *= 0.998;
  b.x += b.vx;
  b.y += b.vy;

  if (frame - b.lastTrail > 2) {
    trails.push({ x: b.x, y: b.y, color: b.color, life: 24, max: 24, r: b.r });
    b.lastTrail = frame;
  }

  if (b.x < table.wall + b.r) {
    b.x = table.wall + b.r;
    b.vx *= -0.92;
    wallSpark(b.x, b.y, '#00f5ff');
  }
  if (b.x > table.w - table.wall - b.r) {
    b.x = table.w - table.wall - b.r;
    b.vx *= -0.92;
    wallSpark(b.x, b.y, '#ff2bd6');
  }
  if (b.y < table.wall + b.r) {
    b.y = table.wall + b.r;
    b.vy *= -0.88;
    wallSpark(b.x, b.y, '#ffd166');
  }

  bumpers.forEach(hitBumper => collideBumper(b, hitBumper));
  collideFlippers(b);

  if (b.y > table.drainY) {
    b.active = false;
    spawnBurst(b.x, table.h - 48, '#ff3131', 28, 8);
    popups.push({ x: table.w / 2, y: table.h - 110, text: 'BALL LOST', color: '#ff3131', life: 60, max: 60, vy: -0.8 });
    if (b === mainBall) {
      balls -= 1;
      if (balls > 0) launchBall();
    }
    setHud();
  }
}

function collideBumper(b, bumper) {
  const dx = b.x - bumper.x;
  const dy = b.y - bumper.y;
  const dist = Math.hypot(dx, dy) || 0.001;
  const min = b.r + bumper.r;
  if (dist < min) {
    const nx = dx / dist;
    const ny = dy / dist;
    b.x = bumper.x + nx * min;
    b.y = bumper.y + ny * min;
    const speed = Math.max(9, Math.hypot(b.vx, b.vy) + 1.4);
    b.vx = nx * speed;
    b.vy = ny * speed;

    bumper.pulse = 16;
    lastHitLabel = bumper.label;
    combo = Math.min(9, combo + 1);
    comboTicks = 500;
    const amount = bumper.value * combo;
    award(amount, bumper.x, bumper.y - bumper.r, `+${amount}`, bumper.color);
    slotHit(bumper.label);
    spawnBurst(bumper.x, bumper.y, bumper.color, 22 + combo * 2, 7 + combo * 0.4);
    shake = Math.max(shake, 7 + combo * 0.6);
    tone(140 + bumper.value * 2, 0.045, 'square', 0.025);
  }
}

function collideFlippers(b) {
  if (b.y > 850 && b.y < 950) {
    if (leftDown && b.x > 190 && b.x < 350) {
      b.vx = -5 + Math.random() * 3;
      b.vy = -14;
      award(25 * combo, b.x, b.y - 30, 'FLIP', '#00f5ff');
      spawnBurst(b.x, b.y, '#00f5ff', 10, 5);
      tone(95, 0.04, 'sawtooth', 0.028);
    }
    if (rightDown && b.x > 370 && b.x < 530) {
      b.vx = 2 + Math.random() * 5;
      b.vy = -14;
      award(25 * combo, b.x, b.y - 30, 'FLIP', '#ff2bd6');
      spawnBurst(b.x, b.y, '#ff2bd6', 10, 5);
      tone(115, 0.04, 'sawtooth', 0.028);
    }
  }
}

function spawnBurst(x, y, color, count = 16, speed = 6) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * speed + 1;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: Math.random() * 3 + 1.5,
      color,
      life: 34 + Math.random() * 24,
      max: 58
    });
  }
}

function wallSpark(x, y, color) {
  spawnBurst(x, y, color, 8, 3);
  tone(80 + Math.random() * 80, 0.03, 'square', 0.012);
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.vy += 0.03;
    p.life--;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.shadowBlur = 14;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function updateAndDrawPopups() {
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) {
      popups.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.shadowBlur = 18;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.font = p.text.length > 8 ? '900 24px Bahnschrift, Arial' : '900 28px Bahnschrift, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }
}

function updateAndDrawTrails() {
  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i];
    t.life--;
    if (t.life <= 0) {
      trails.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = (t.life / t.max) * 0.35;
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * (t.life / t.max), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function tick() {
  if (!running) return;
  if (comboTicks > 0) comboTicks--; else combo = Math.max(1, combo - 0.02);
  if (combo < 1.05) combo = 1;
  updateBall(mainBall);
  extraBalls.forEach(updateBall);
  if (multiball) {
    multiballTicks -= 1;
    if (multiballTicks <= 0) {
      multiball = false;
      extraBalls.length = 0;
      popups.push({ x: table.w / 2, y: 250, text: 'RITUAL CLOSED', color: '#b8aee0', life: 64, max: 64, vy: -0.8 });
      setHud();
    }
  }
  drawTable();
  requestAnimationFrame(tick);
}

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') leftDown = true;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') rightDown = true;
  if (e.code === 'Space') {
    e.preventDefault();
    launchBall();
  }
  if (e.key.toLowerCase() === 'm') triggerMultiball();
});

window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') leftDown = false;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') rightDown = false;
});

document.getElementById('startBtn').addEventListener('click', launchBall);
document.getElementById('multiBtn').addEventListener('click', triggerMultiball);
document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('touchLaunch').addEventListener('click', launchBall);
document.getElementById('touchLeft').addEventListener('pointerdown', () => leftDown = true);
document.getElementById('touchLeft').addEventListener('pointerup', () => leftDown = false);
document.getElementById('touchLeft').addEventListener('pointercancel', () => leftDown = false);
document.getElementById('touchRight').addEventListener('pointerdown', () => rightDown = true);
document.getElementById('touchRight').addEventListener('pointerup', () => rightDown = false);
document.getElementById('touchRight').addEventListener('pointercancel', () => rightDown = false);

if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    if (!muted) ensureAudio();
    muteBtn.textContent = muted ? 'Audio: Off' : 'Audio: On';
  });
}

window.MATTBEAR_MACHINE = {
  triggerMultiball,
  resetGame,
  getState: () => ({ score, balls, multiball, combo, particles: particles.length, popups: popups.length })
};

resetGame();
tick();
