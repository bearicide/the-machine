const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const ballsEl = document.getElementById('balls');
const modeEl = document.getElementById('mode');
const slotEl = document.getElementById('slotReadout');

let score = 0;
let balls = 3;
let leftDown = false;
let rightDown = false;
let running = true;
let multiball = false;
let multiballTicks = 0;

const table = {
  w: canvas.width,
  h: canvas.height,
  wall: 24,
  drainY: canvas.height + 40
};

const mainBall = makeBall(360, 250, 2.6, 3.2, '#ffffff');
const extraBalls = [];

const bumpers = [
  { x: 220, y: 300, r: 46, label: 'WORD', value: 120 },
  { x: 500, y: 350, r: 52, label: 'PLAY', value: 140 },
  { x: 360, y: 520, r: 58, label: 'BEAR', value: 180 },
  { x: 185, y: 620, r: 34, label: 'FX', value: 90 },
  { x: 535, y: 655, r: 34, label: 'WILD', value: 90 }
];

const lanes = [
  { x: 82, y: 118, w: 84, h: 520 },
  { x: 554, y: 118, w: 84, h: 520 }
];

function makeBall(x, y, vx, vy, color) {
  return { x, y, vx, vy, r: 14, color, active: true };
}

function setHud() {
  scoreEl.textContent = String(score);
  ballsEl.textContent = String(Math.max(0, balls));
  modeEl.textContent = multiball ? 'MULTIBALL' : 'RITUAL IDLE';
}

function slotHit(label) {
  const symbols = ['WORD', 'PLAY', 'BEAR', 'WILD', 'FX', '777'];
  const a = label;
  const b = symbols[Math.floor(Math.random() * symbols.length)];
  const c = symbols[Math.floor(Math.random() * symbols.length)];
  slotEl.textContent = `${a}-${b}-${c}`;
  if (a === b && b === c) score += 1000;
}

function launchBall() {
  mainBall.x = 360;
  mainBall.y = 880;
  mainBall.vx = (Math.random() - 0.5) * 5;
  mainBall.vy = -15;
  mainBall.active = true;
}

function triggerMultiball() {
  multiball = true;
  multiballTicks = 600;
  extraBalls.length = 0;
  extraBalls.push(makeBall(335, 270, -4.2, 3.4, '#9dff37'));
  extraBalls.push(makeBall(390, 270, 4.5, 3.1, '#ff2bd6'));
  slotEl.textContent = 'MULTIBALL';
  setHud();
}

function resetGame() {
  score = 0;
  balls = 3;
  multiball = false;
  multiballTicks = 0;
  extraBalls.length = 0;
  launchBall();
  setHud();
}

function drawTable() {
  ctx.clearRect(0, 0, table.w, table.h);

  const bg = ctx.createLinearGradient(0, 0, table.w, table.h);
  bg.addColorStop(0, '#07030f');
  bg.addColorStop(0.55, '#101026');
  bg.addColorStop(1, '#05010a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, table.w, table.h);

  ctx.strokeStyle = 'rgba(0,245,255,0.35)';
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, table.w - 48, table.h - 48);

  ctx.strokeStyle = 'rgba(255,43,214,0.42)';
  ctx.lineWidth = 4;
  lanes.forEach(l => ctx.strokeRect(l.x, l.y, l.w, l.h));

  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(110, 790, 500, 18);
  ctx.fillRect(140, 830, 440, 18);

  drawBumpers();
  drawFlippers();
  drawBall(mainBall);
  extraBalls.forEach(drawBall);

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = '700 28px Bahnschrift, Arial';
  ctx.fillText('THE MACHINE REMEMBERS', 164, 92);
}

function drawBumpers() {
  bumpers.forEach(b => {
    ctx.save();
    ctx.shadowBlur = 28;
    ctx.shadowColor = b.label === 'WORD' ? '#00f5ff' : '#ff2bd6';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.label === 'WORD' ? '#00f5ff' : b.label === 'PLAY' ? '#ff2bd6' : '#9dff37';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#05010a';
    ctx.font = '800 18px Bahnschrift, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x, b.y + 6);
    ctx.restore();
  });
}

function drawFlippers() {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 20;
  ctx.shadowBlur = 20;

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
  ctx.shadowBlur = 26;
  ctx.shadowColor = b.color;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fillStyle = b.color;
  ctx.fill();
  ctx.restore();
}

function updateBall(b) {
  if (!b.active) return;

  b.vy += 0.34;
  b.x += b.vx;
  b.y += b.vy;

  if (b.x < table.wall + b.r) {
    b.x = table.wall + b.r;
    b.vx *= -0.92;
  }
  if (b.x > table.w - table.wall - b.r) {
    b.x = table.w - table.wall - b.r;
    b.vx *= -0.92;
  }
  if (b.y < table.wall + b.r) {
    b.y = table.wall + b.r;
    b.vy *= -0.88;
  }

  bumpers.forEach(hitBumper => collideBumper(b, hitBumper));
  collideFlippers(b);

  if (b.y > table.drainY) {
    b.active = false;
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
  const dist = Math.hypot(dx, dy);
  const min = b.r + bumper.r;
  if (dist < min) {
    const nx = dx / dist;
    const ny = dy / dist;
    b.x = bumper.x + nx * min;
    b.y = bumper.y + ny * min;
    const speed = Math.max(9, Math.hypot(b.vx, b.vy) + 1.4);
    b.vx = nx * speed;
    b.vy = ny * speed;
    score += bumper.value;
    slotHit(bumper.label);
    setHud();
  }
}

function collideFlippers(b) {
  if (b.y > 850 && b.y < 950) {
    if (leftDown && b.x > 190 && b.x < 350) {
      b.vx = -5 + Math.random() * 3;
      b.vy = -14;
      score += 25;
    }
    if (rightDown && b.x > 370 && b.x < 530) {
      b.vx = 2 + Math.random() * 5;
      b.vy = -14;
      score += 25;
    }
    setHud();
  }
}

function tick() {
  if (!running) return;
  updateBall(mainBall);
  extraBalls.forEach(updateBall);
  if (multiball) {
    multiballTicks -= 1;
    if (multiballTicks <= 0) {
      multiball = false;
      extraBalls.length = 0;
      setHud();
    }
  }
  drawTable();
  requestAnimationFrame(tick);
}

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') leftDown = true;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') rightDown = true;
  if (e.code === 'Space') launchBall();
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
document.getElementById('touchRight').addEventListener('pointerdown', () => rightDown = true);
document.getElementById('touchRight').addEventListener('pointerup', () => rightDown = false);

resetGame();
tick();
