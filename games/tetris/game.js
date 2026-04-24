const COLS = 10;
const ROWS = 20;
const CELL = 24;

const COLORS = [
  '',
  '#00d4ff', '#f5a623', '#4a90e2', '#f8e71c',
  '#7ed321', '#E24B4A', '#9b59b6', '#ff6b9d', '#ff9a3c',
];

const SHAPES = [
  null,
  [[1,1,1,1]],
  [[2,0,0],[2,2,2]],
  [[0,0,3],[3,3,3]],
  [[4,4],[4,4]],
  [[0,5,5],[5,5,0]],
  [[6,6,0],[0,6,6]],
  [[0,7,0],[7,7,7]],
  [[8,0,8],[8,8,8]],
  [[0,9,0],[9,9,9],[0,9,0]],
];

const DIFFICULTY = {
  easy: {
    label: 'EASY',
    dropStart: 900, dropMin: 300, speedupEvery: 15, speedupAmount: 60,
    piecePool: [1,1,2,3,4,4,5,6,7],
    scoreMultiplier: 1,
  },
  medium: {
    label: 'MEDIUM',
    dropStart: 600, dropMin: 150, speedupEvery: 10, speedupAmount: 50,
    piecePool: [1,2,3,4,5,5,6,6,7,7],
    scoreMultiplier: 1.5,
  },
  hard: {
    label: 'HARD',
    dropStart: 300, dropMin: 60, speedupEvery: 8, speedupAmount: 40,
    piecePool: [1,2,3,5,5,6,6,7,7,7,8,9],
    scoreMultiplier: 2,
  },
};

const boardCanvas = document.getElementById('board');
const ctx = boardCanvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nctx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub = document.getElementById('overlay-sub');

// 캔버스 포커스 설정 (키입력이 항상 캔버스로 가도록)
boardCanvas.setAttribute('tabindex', '0');
boardCanvas.style.outline = 'none';

let grid, piece, nextPiece;
let score, lines;
let gameActive, rafId, lastTime;
let dropInterval, dropCounter, linesSinceSpeedup;
let currentDiff = 'easy';

// 난이도 버튼: 클릭 시 active 전환 + 게임 재시작
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDiff = btn.dataset.diff;
    startGame();
  });
});

function makeGrid() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece(diff) {
  const pool = DIFFICULTY[diff].piecePool;
  const id = pool[Math.floor(Math.random() * pool.length)];
  const shape = SHAPES[id].map(r => [...r]);
  return { id, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(g, p, dx = 0, dy = 0, s = null) {
  const sh = s || p.shape;
  for (let r = 0; r < sh.length; r++)
    for (let c = 0; c < sh[r].length; c++) {
      if (!sh[r][c]) continue;
      const nx = p.x + c + dx, ny = p.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && g[ny][nx]) return true;
    }
  return false;
}

function merge(g, p) {
  p.shape.forEach((row, r) =>
    row.forEach((v, c) => { if (v && p.y + r >= 0) g[p.y + r][p.x + c] = v; })
  );
}

function rotate(shape) {
  const rows = shape.length, cols = shape[0].length;
  const out = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out[c][rows - 1 - r] = shape[r][c];
  return out;
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0;) {
    if (grid[r].every(v => v)) { grid.splice(r, 1); grid.unshift(new Array(COLS).fill(0)); cleared++; }
    else r--;
  }
  if (cleared) {
    const cfg = DIFFICULTY[currentDiff];
    const basePts = [0, 100, 300, 500, 800];
    score += Math.round((basePts[cleared] || 800) * cfg.scoreMultiplier);
    lines += cleared;
    linesSinceSpeedup += cleared;
    if (linesSinceSpeedup >= cfg.speedupEvery) {
      linesSinceSpeedup = 0;
      dropInterval = Math.max(cfg.dropMin, dropInterval - cfg.speedupAmount);
    }
    scoreEl.textContent = score;
    linesEl.textContent = lines;
  }
}

function ghostY() {
  let dy = 0;
  while (!collide(grid, piece, 0, dy + 1)) dy++;
  return dy;
}

function drawCell(context, x, y, colorId, cellSize, alpha = 1) {
  const col = COLORS[colorId], cs = cellSize;
  context.globalAlpha = alpha;
  context.fillStyle = col;
  context.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
  context.fillStyle = 'rgba(255,255,255,0.22)';
  context.fillRect(x * cs + 1, y * cs + 1, cs - 2, 4);
  context.fillStyle = 'rgba(0,0,0,0.28)';
  context.fillRect(x * cs + 1, y * cs + cs - 5, cs - 2, 4);
  context.globalAlpha = 1;
}

function drawBoard() {
  ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r*CELL); ctx.lineTo(COLS*CELL, r*CELL); ctx.stroke(); }
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c*CELL, 0); ctx.lineTo(c*CELL, ROWS*CELL); ctx.stroke(); }
  grid.forEach((row, r) => row.forEach((v, c) => { if (v) drawCell(ctx, c, r, v, CELL); }));
  if (piece) {
    const gy = ghostY();
    if (gy > 0)
      piece.shape.forEach((row, r) => row.forEach((v, c) => { if (v) drawCell(ctx, piece.x+c, piece.y+r+gy, piece.id, CELL, 0.2); }));
    piece.shape.forEach((row, r) => row.forEach((v, c) => { if (v) drawCell(ctx, piece.x+c, piece.y+r, piece.id, CELL); }));
  }
}

function drawNext() {
  const cs = 22;
  nctx.fillStyle = '#0a0a14';
  nctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPiece) return;
  const s = nextPiece.shape;
  const ox = Math.floor((4 - s[0].length) / 2), oy = Math.floor((4 - s.length) / 2);
  s.forEach((row, r) => row.forEach((v, c) => {
    if (!v) return;
    nctx.globalAlpha = 1;
    nctx.fillStyle = COLORS[nextPiece.id];
    nctx.fillRect((ox+c)*cs+4, (oy+r)*cs+4, cs-2, cs-2);
    nctx.fillStyle = 'rgba(255,255,255,0.22)';
    nctx.fillRect((ox+c)*cs+4, (oy+r)*cs+4, cs-2, 4);
    nctx.fillStyle = 'rgba(0,0,0,0.28)';
    nctx.fillRect((ox+c)*cs+4, (oy+r)*cs+cs-5, cs-2, 4);
  }));
}

function spawnPiece() {
  piece = nextPiece || randomPiece(currentDiff);
  nextPiece = randomPiece(currentDiff);
  drawNext();
  if (collide(grid, piece)) {
    gameActive = false;
    cancelAnimationFrame(rafId);
    overlayTitle.textContent = 'GAME OVER';
    overlaySub.textContent = `점수: ${score}  |  라인: ${lines}`;
    overlay.style.display = 'flex';
  }
}

function drop() {
  if (!collide(grid, piece, 0, 1)) { piece.y++; }
  else { merge(grid, piece); clearLines(); spawnPiece(); }
}

function hardDrop() {
  const dy = ghostY();
  piece.y += dy;
  score += dy * 2;
  scoreEl.textContent = score;
  merge(grid, piece);
  clearLines();
  spawnPiece();
}

function gameLoop(ts = 0) {
  if (!gameActive) return;
  const dt = ts - lastTime;
  lastTime = ts;
  dropCounter += dt;
  if (dropCounter >= dropInterval) { drop(); dropCounter = 0; }
  drawBoard();
  rafId = requestAnimationFrame(gameLoop);
}

function startGame() {
  const cfg = DIFFICULTY[currentDiff];
  grid = makeGrid();
  score = 0; lines = 0;
  dropInterval = cfg.dropStart;
  dropCounter = 0; linesSinceSpeedup = 0;
  scoreEl.textContent = '0';
  linesEl.textContent = '0';
  nextPiece = randomPiece(currentDiff);
  spawnPiece();
  gameActive = true;
  overlay.style.display = 'none';
  lastTime = 0;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(gameLoop);
  // 버튼 클릭 후 포커스가 버튼에 남지 않도록 캔버스로 이동
  boardCanvas.focus();
}

document.getElementById('btn-start').addEventListener('click', startGame);

// window에 등록 → 포커스 위치와 무관하게 항상 키입력 수신
window.addEventListener('keydown', e => {
  const handled = ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', ' '];
  if (handled.includes(e.key)) e.preventDefault(); // 스크롤 등 브라우저 기본동작 차단
  if (!gameActive) return;
  if (e.key === 'a' || e.key === 'A') {
    if (!collide(grid, piece, -1, 0)) piece.x--;
  } else if (e.key === 'd' || e.key === 'D') {
    if (!collide(grid, piece, 1, 0)) piece.x++;
  } else if (e.key === 's' || e.key === 'S') {
    drop(); dropCounter = 0; score++; scoreEl.textContent = score;
  } else if (e.key === 'w' || e.key === 'W') {
    const rotated = rotate(piece.shape);
    if (!collide(grid, piece, 0, 0, rotated)) piece.shape = rotated;
    else if (!collide(grid, piece, 1, 0, rotated)) { piece.shape = rotated; piece.x++; }
    else if (!collide(grid, piece, -1, 0, rotated)) { piece.shape = rotated; piece.x--; }
  } else if (e.key === ' ') {
    hardDrop();
  }
  drawBoard();
});

drawBoard();
drawNext();
