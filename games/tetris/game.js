const COLS = 10;
const ROWS = 20;
const CELL = 24;
 
// Block colors (index matches shape id)
const COLORS = [
  '',
  '#00d4ff', // 1 I    - cyan
  '#f5a623', // 2 J    - orange
  '#4a90e2', // 3 L    - blue
  '#f8e71c', // 4 O    - yellow
  '#7ed321', // 5 S    - green
  '#E24B4A', // 6 Z    - red
  '#9b59b6', // 7 T    - purple
  '#ff6b9d', // 8 HARD special: U-shape  - pink
  '#ff9a3c', // 9 HARD special: +cross   - amber
];
 
// Shapes: index 1-7 are standard Tetris pieces
// index 8-9 are hard-mode special pieces
const SHAPES = [
  null,
  [[1,1,1,1]],                      // I
  [[2,0,0],[2,2,2]],                // J
  [[0,0,3],[3,3,3]],                // L
  [[4,4],[4,4]],                    // O
  [[0,5,5],[5,5,0]],                // S
  [[6,6,0],[0,6,6]],                // Z
  [[0,7,0],[7,7,7]],                // T
  [[8,0,8],[8,8,8]],                // U  (HARD)
  [[0,9,0],[9,9,9],[0,9,0]],        // + cross (HARD)
];
 
// Difficulty config
const DIFFICULTY = {
  easy: {
    label: 'EASY',
    dropStart: 900,       // ms per row at start
    dropMin: 300,         // fastest ms per row
    speedupEvery: 15,     // lines to speed up
    speedupAmount: 60,    // ms reduction per speedup
    // Piece pool: normal pieces only, I and O weighted more (forgiving)
    piecePool: [1,1,2,3,4,4,5,6,7],
    scoreMultiplier: 1,
  },
  medium: {
    label: 'MEDIUM',
    dropStart: 600,
    dropMin: 150,
    speedupEvery: 10,
    speedupAmount: 50,
    // Normal pieces, S and Z slightly more frequent
    piecePool: [1,2,3,4,5,5,6,6,7,7],
    scoreMultiplier: 1.5,
  },
  hard: {
    label: 'HARD',
    dropStart: 300,
    dropMin: 60,
    speedupEvery: 8,
    speedupAmount: 40,
    // S, Z, T heavily weighted + special pieces
    piecePool: [1,2,3,5,5,6,6,7,7,7,8,9],
    scoreMultiplier: 2,
  },
};
 
// DOM refs
const boardCanvas = document.getElementById('board');
const ctx = boardCanvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nctx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub = document.getElementById('overlay-sub');
 
// State
let grid, piece, nextPiece;
let score, lines;
let gameActive, rafId, lastTime;
let dropInterval, dropCounter, linesSinceSpeedup;
let currentDiff = 'easy';
 
// Difficulty selector
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDiff = btn.dataset.diff;
    if (!gameActive) {
      overlayTitle.textContent = 'TETRIS';
      overlaySub.textContent = `${DIFFICULTY[currentDiff].label} 모드 선택됨\n시작 버튼을 누르세요`;
    }
  });
});
 
// Grid helpers
function makeGrid() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}
 
function randomPiece(diff) {
  const pool = DIFFICULTY[diff].piecePool;
  const id = pool[Math.floor(Math.random() * pool.length)];
  const shape = SHAPES[id].map(r => [...r]);
  return {
    id,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}
 
function collide(g, p, dx = 0, dy = 0, s = null) {
  const sh = s || p.shape;
  for (let r = 0; r < sh.length; r++) {
    for (let c = 0; c < sh[r].length; c++) {
      if (!sh[r][c]) continue;
      const nx = p.x + c + dx;
      const ny = p.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && g[ny][nx]) return true;
    }
  }
  return false;
}
 
function merge(g, p) {
  p.shape.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v && p.y + r >= 0) g[p.y + r][p.x + c] = v;
    })
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
    if (grid[r].every(v => v)) {
      grid.splice(r, 1);
      grid.unshift(new Array(COLS).fill(0));
      cleared++;
    } else {
      r--;
    }
  }
  if (cleared) {
    const cfg = DIFFICULTY[currentDiff];
    const basePts = [0, 100, 300, 500, 800];
    score += Math.round((basePts[cleared] || 800) * cfg.scoreMultiplier);
    lines += cleared;
    linesSinceSpeedup += cleared;
 
    // Speed up every N lines
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
 
// Drawing
function drawCell(context, x, y, colorId, cellSize, alpha = 1) {
  const col = COLORS[colorId];
  const cs = cellSize;
  context.globalAlpha = alpha;
  context.fillStyle = col;
  context.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
  // highlight top
  context.fillStyle = 'rgba(255,255,255,0.22)';
  context.fillRect(x * cs + 1, y * cs + 1, cs - 2, 4);
  // shadow bottom
  context.fillStyle = 'rgba(0,0,0,0.28)';
  context.fillRect(x * cs + 1, y * cs + cs - 5, cs - 2, 4);
  context.globalAlpha = 1;
}
 
function drawBoard() {
  ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
 
  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(COLS * CELL, r * CELL); ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, ROWS * CELL); ctx.stroke();
  }
 
  // Placed cells
  grid.forEach((row, r) => row.forEach((v, c) => {
    if (v) drawCell(ctx, c, r, v, CELL);
  }));
 
  // Ghost piece
  if (piece) {
    const gy = ghostY();
    if (gy > 0) {
      piece.shape.forEach((row, r) => row.forEach((v, c) => {
        if (v) drawCell(ctx, piece.x + c, piece.y + r + gy, piece.id, CELL, 0.2);
      }));
    }
    // Active piece
    piece.shape.forEach((row, r) => row.forEach((v, c) => {
      if (v) drawCell(ctx, piece.x + c, piece.y + r, piece.id, CELL);
    }));
  }
}
 
function drawNext() {
  const cs = 22;
  nctx.fillStyle = '#0a0a14';
  nctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPiece) return;
  const s = nextPiece.shape;
  const ox = Math.floor((4 - s[0].length) / 2);
  const oy = Math.floor((4 - s.length) / 2);
  s.forEach((row, r) => row.forEach((v, c) => {
    if (!v) return;
    nctx.globalAlpha = 1;
    nctx.fillStyle = COLORS[nextPiece.id];
    nctx.fillRect((ox + c) * cs + 4, (oy + r) * cs + 4, cs - 2, cs - 2);
    nctx.fillStyle = 'rgba(255,255,255,0.22)';
    nctx.fillRect((ox + c) * cs + 4, (oy + r) * cs + 4, cs - 2, 4);
    nctx.fillStyle = 'rgba(0,0,0,0.28)';
    nctx.fillRect((ox + c) * cs + 4, (oy + r) * cs + cs - 5, cs - 2, 4);
  }));
}
 
// Piece lifecycle
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
  if (!collide(grid, piece, 0, 1)) {
    piece.y++;
  } else {
    merge(grid, piece);
    clearLines();
    spawnPiece();
  }
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
 
// Game loop
function gameLoop(ts = 0) {
  if (!gameActive) return;
  const dt = ts - lastTime;
  lastTime = ts;
  dropCounter += dt;
  if (dropCounter >= dropInterval) {
    drop();
    dropCounter = 0;
  }
  drawBoard();
  rafId = requestAnimationFrame(gameLoop);
}
 
function startGame() {
  const cfg = DIFFICULTY[currentDiff];
  grid = makeGrid();
  score = 0;
  lines = 0;
  dropInterval = cfg.dropStart;
  dropCounter = 0;
  linesSinceSpeedup = 0;
  scoreEl.textContent = '0';
  linesEl.textContent = '0';
  nextPiece = randomPiece(currentDiff);
  spawnPiece();
  gameActive = true;
  overlay.style.display = 'none';
  lastTime = 0;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(gameLoop);
}
 
// Controls
document.getElementById('btn-start').addEventListener('click', startGame);
 
document.addEventListener('keydown', e => {
  if (!gameActive) return;
  if (e.key === 'ArrowLeft') {
    if (!collide(grid, piece, -1, 0)) piece.x--;
  } else if (e.key === 'ArrowRight') {
    if (!collide(grid, piece, 1, 0)) piece.x++;
  } else if (e.key === 'ArrowDown') {
    drop();
    dropCounter = 0;
    score++;
    scoreEl.textContent = score;
  } else if (e.key === 'ArrowUp') {
    const rotated = rotate(piece.shape);
    if (!collide(grid, piece, 0, 0, rotated)) {
      piece.shape = rotated;
    } else if (!collide(grid, piece, 1, 0, rotated)) {
      piece.shape = rotated; piece.x++;
    } else if (!collide(grid, piece, -1, 0, rotated)) {
      piece.shape = rotated; piece.x--;
    }
  } else if (e.key === ' ') {
    e.preventDefault();
    hardDrop();
  }
  drawBoard();
});
 
// Initial render
drawBoard();
drawNext();
 

