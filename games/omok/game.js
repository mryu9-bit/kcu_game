const SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");
const modeSelect = document.getElementById("modeSelect");
const levelSelect = document.getElementById("levelSelect");

const padding = 58;
const boardPixels = canvas.width - padding * 2;
const gap = boardPixels / (SIZE - 1);
const stoneRadius = gap * 0.41;

let board = [];
let currentPlayer = BLACK;
let gameOver = false;

let gameMode = "ai";
let aiLevel = "normal";
let humanPlayer = BLACK;
let aiPlayer = WHITE;

function initBoard() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
  currentPlayer = BLACK;
  gameOver = false;
  gameMode = modeSelect.value;
  aiLevel = levelSelect.value;
  updateControls();
  updateStatus();
  drawBoard();
}

function updateControls() {
  levelSelect.disabled = gameMode !== "ai";
}

function updateStatus(message) {
  if (message) {
    statusEl.textContent = message;
    return;
  }

  if (gameMode === "ai") {
    statusEl.textContent =
      currentPlayer === humanPlayer ? "현재 턴: 흑" : "현재 턴: 백";
  } else {
    statusEl.textContent = `현재 턴: ${currentPlayer === BLACK ? "흑" : "백"}`;
  }
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#c79d63";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#7a5428";
ctx.lineWidth = 1.6;

  for (let i = 0; i < SIZE; i++) {
    const pos = padding + i * gap;

    ctx.beginPath();
    ctx.moveTo(padding, pos);
    ctx.lineTo(canvas.width - padding, pos);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pos, padding);
    ctx.lineTo(pos, canvas.height - padding);
    ctx.stroke();
  }

  const starPoints = [3, 7, 11];
  ctx.fillStyle = "#4a2e14";

  for (const r of starPoints) {
    for (const c of starPoints) {
      drawStarPoint(r, c);
    }
  }

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] !== EMPTY) {
        drawStone(row, col, board[row][col]);
      }
    }
  }
}

function drawStarPoint(row, col) {
  const x = padding + col * gap;
  const y = padding + row * gap;

  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawStone(row, col, player) {
  const x = padding + col * gap;
  const y = padding + row * gap;

  const gradient = ctx.createRadialGradient(
    x - stoneRadius * 0.35,
    y - stoneRadius * 0.35,
    stoneRadius * 0.18,
    x,
    y,
    stoneRadius
  );

  if (player === BLACK) {
    gradient.addColorStop(0, "#666666");
    gradient.addColorStop(1, "#050505");
  } else {
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(1, "#d7d7d7");
  }

  ctx.beginPath();
  ctx.arc(x, y, stoneRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = player === BLACK ? "#111111" : "#a3a3a3";
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function inRange(row, col) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function getBoardPosition(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;

  const col = Math.round((x - padding) / gap);
  const row = Math.round((y - padding) / gap);

  if (!inRange(row, col)) return null;

  const centerX = padding + col * gap;
  const centerY = padding + row * gap;
  const distance = Math.hypot(centerX - x, centerY - y);

  if (distance > gap * 0.46) return null;

  return { row, col };
}

function countDirection(row, col, dr, dc, player) {
  let count = 0;
  let r = row + dr;
  let c = col + dc;

  while (inRange(r, c) && board[r][c] === player) {
    count++;
    r += dr;
    c += dc;
  }

  return count;
}

function checkWin(row, col, player) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];

  for (const [dr, dc] of directions) {
    const total =
      1 +
      countDirection(row, col, dr, dc, player) +
      countDirection(row, col, -dr, -dc, player);

    if (player === BLACK) {
      if (total === 5) return true;
    } else {
      if (total >= 5) return true;
    }
  }

  return false;
}

function isBoardFull() {
  return board.every(row => row.every(cell => cell !== EMPTY));
}

function getLineString(row, col, dr, dc, player, range = 5) {
  let line = "";
  const center = range;

  for (let i = -range; i <= range; i++) {
    const r = row + dr * i;
    const c = col + dc * i;

    if (!inRange(r, c)) {
      line += "X";
    } else if (board[r][c] === EMPTY) {
      line += ".";
    } else if (board[r][c] === player) {
      line += "B";
    } else {
      line += "X";
    }
  }

  return { line, center };
}

function hasPatternIncludingCenter(line, center, patterns) {
  for (const pattern of patterns) {
    const len = pattern.length;
    for (let start = 0; start <= line.length - len; start++) {
      const sub = line.slice(start, start + len);
      if (sub === pattern && center >= start && center < start + len) {
        return true;
      }
    }
  }
  return false;
}

function isOverline(row, col, player) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];

  for (const [dr, dc] of directions) {
    const total =
      1 +
      countDirection(row, col, dr, dc, player) +
      countDirection(row, col, -dr, -dc, player);

    if (total > 5) return true;
  }

  return false;
}

function hasOpenFourInDirection(row, col, dr, dc, player) {
  const { line, center } = getLineString(row, col, dr, dc, player, 5);

  const openFourPatterns = [
    ".BBBB.",
    ".BBB.B.",
    ".BB.BB.",
    ".B.BBB."
  ];

  return hasPatternIncludingCenter(line, center, openFourPatterns);
}

function countOpenFours(row, col, player) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];

  let count = 0;

  for (const [dr, dc] of directions) {
    if (hasOpenFourInDirection(row, col, dr, dc, player)) {
      count++;
    }
  }

  return count;
}

function hasOpenThreeInDirection(row, col, dr, dc, player) {
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue;

    const r = row + dr * i;
    const c = col + dc * i;

    if (!inRange(r, c)) continue;
    if (board[r][c] !== EMPTY) continue;

    board[r][c] = player;
    const result = hasOpenFourInDirection(row, col, dr, dc, player);
    board[r][c] = EMPTY;

    if (result) return true;
  }

  return false;
}

function countOpenThrees(row, col, player) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];

  let count = 0;

  for (const [dr, dc] of directions) {
    if (hasOpenThreeInDirection(row, col, dr, dc, player)) {
      count++;
    }
  }

  return count;
}

function getForbiddenType(row, col) {
  if (board[row][col] !== BLACK) return null;

  if (isOverline(row, col, BLACK)) return "장목(6목 이상)";
  if (countOpenFours(row, col, BLACK) >= 2) return "사사(44)";
  if (countOpenThrees(row, col, BLACK) >= 2) return "삼삼(33)";
  return null;
}

function hasNeighbor(row, col, dist = 2) {
  for (let dr = -dist; dr <= dist; dr++) {
    for (let dc = -dist; dc <= dist; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (inRange(r, c) && board[r][c] !== EMPTY) {
        return true;
      }
    }
  }
  return false;
}

function isBoardEmpty() {
  return board.every(row => row.every(cell => cell === EMPTY));
}

function evaluateLine(count, openEnds) {
  if (count >= 5) return 1000000;
  if (count === 4 && openEnds === 2) return 100000;
  if (count === 4 && openEnds === 1) return 20000;
  if (count === 3 && openEnds === 2) return 8000;
  if (count === 3 && openEnds === 1) return 1500;
  if (count === 2 && openEnds === 2) return 500;
  if (count === 2 && openEnds === 1) return 100;
  if (count === 1 && openEnds === 2) return 30;
  return 0;
}

function evaluateDirection(row, col, dr, dc, player) {
  let count1 = 0;
  let r = row + dr;
  let c = col + dc;

  while (inRange(r, c) && board[r][c] === player) {
    count1++;
    r += dr;
    c += dc;
  }

  const open1 = inRange(r, c) && board[r][c] === EMPTY ? 1 : 0;

  let count2 = 0;
  r = row - dr;
  c = col - dc;

  while (inRange(r, c) && board[r][c] === player) {
    count2++;
    r -= dr;
    c -= dc;
  }

  const open2 = inRange(r, c) && board[r][c] === EMPTY ? 1 : 0;

  return evaluateLine(1 + count1 + count2, open1 + open2);
}

function evaluateMove(row, col, player) {
  const opponent = player === BLACK ? WHITE : BLACK;
  let score = 0;

  board[row][col] = player;

  if (player === BLACK && getForbiddenType(row, col)) {
    board[row][col] = EMPTY;
    return -Infinity;
  }

  if (checkWin(row, col, player)) {
    board[row][col] = EMPTY;
    return 10000000;
  }

  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];

  for (const [dr, dc] of directions) {
    score += evaluateDirection(row, col, dr, dc, player);
  }

  score += countOpenFours(row, col, player) * 40000;
  score += countOpenThrees(row, col, player) * 7000;

  board[row][col] = EMPTY;

  board[row][col] = opponent;

  if (!(opponent === BLACK && getForbiddenType(row, col))) {
    if (checkWin(row, col, opponent)) {
      score += 9000000;
    }

    for (const [dr, dc] of directions) {
      score += evaluateDirection(row, col, dr, dc, opponent) * 0.9;
    }

    score += countOpenFours(row, col, opponent) * 35000;
    score += countOpenThrees(row, col, opponent) * 6000;
  }

  board[row][col] = EMPTY;

  const center = Math.floor(SIZE / 2);
  const distanceToCenter = Math.abs(row - center) + Math.abs(col - center);
  score += Math.max(0, 20 - distanceToCenter);

  return score;
}

function evaluateEasyMove(row, col, player) {
  const opponent = player === BLACK ? WHITE : BLACK;

  if (player === BLACK) {
    board[row][col] = player;
    const forbidden = getForbiddenType(row, col);
    board[row][col] = EMPTY;
    if (forbidden) return -Infinity;
  }

  let score = 0;

  // 내가 바로 이기는 수는 둠
  board[row][col] = player;
  if (checkWin(row, col, player)) {
    board[row][col] = EMPTY;
    return 1000000;
  }

  // 내 공격 계산은 약하게
  score += countOpenFours(row, col, player) * 9000;
  score += countOpenThrees(row, col, player) * 1200;

  const easyDirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];

  for (const [dr, dc] of easyDirs) {
    score += evaluateDirection(row, col, dr, dc, player) * 0.22;
  }

  board[row][col] = EMPTY;

  // 상대가 바로 이기는 수는 막음
  board[row][col] = opponent;
  if (!(opponent === BLACK && getForbiddenType(row, col))) {
    if (checkWin(row, col, opponent)) {
      board[row][col] = EMPTY;
      return 900000;
    }

    // 방어 계산도 너무 강하지 않게
    score += countOpenFours(row, col, opponent) * 7000;
    score += countOpenThrees(row, col, opponent) * 900;

    for (const [dr, dc] of easyDirs) {
      score += evaluateDirection(row, col, dr, dc, opponent) * 0.16;
    }
  }
  board[row][col] = EMPTY;

  // 중앙 약간 선호
  const center = Math.floor(SIZE / 2);
  const distanceToCenter = Math.abs(row - center) + Math.abs(col - center);
  score += Math.max(0, 8 - distanceToCenter);

  // 랜덤성 크게 줘서 사람도 이길 수 있게
  score += Math.random() * 1200;

  return score;
}

function placeStone(row, col) {
  if (gameOver) return false;
  if (!inRange(row, col)) return false;
  if (board[row][col] !== EMPTY) return false;

  board[row][col] = currentPlayer;

  if (currentPlayer === BLACK) {
    const forbidden = getForbiddenType(row, col);
    if (forbidden) {
      board[row][col] = EMPTY;
      drawBoard();
      updateStatus(`흑 금수: ${forbidden}`);
      return false;
    }
  }

  drawBoard();

  if (checkWin(row, col, currentPlayer)) {
    gameOver = true;

    if (gameMode === "ai") {
      updateStatus(currentPlayer === humanPlayer ? "당신 승리!" : "AI 승리!");
    } else {
      updateStatus(`${currentPlayer === BLACK ? "흑" : "백"} 승리!`);
    }

    return true;
  }

  if (isBoardFull()) {
    gameOver = true;
    updateStatus("무승부!");
    return true;
  }

  currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
  updateStatus();

  if (gameMode === "ai" && !gameOver && currentPlayer === aiPlayer) {
    setTimeout(aiMove, 220);
  }

  return true;
}

function easyAiMove() {
  let bestMove = null;
  let bestScore = -Infinity;

  if (isBoardEmpty()) {
    placeStone(7, 7);
    return;
  }

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] !== EMPTY) continue;
      if (!hasNeighbor(row, col, 2)) continue;

      const score = evaluateEasyMove(row, col, aiPlayer);

      if (score > bestScore) {
        bestScore = score;
        bestMove = { row, col };
      }
    }
  }

  if (!bestMove) {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (board[row][col] !== EMPTY) continue;

        const score = evaluateEasyMove(row, col, aiPlayer);

        if (score > bestScore) {
          bestScore = score;
          bestMove = { row, col };
        }
      }
    }
  }

  if (bestMove) {
    placeStone(bestMove.row, bestMove.col);
  }
}

function normalAiMove() {
  let bestMove = null;
  let bestScore = -Infinity;

  if (isBoardEmpty()) {
    placeStone(7, 7);
    return;
  }

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] !== EMPTY) continue;
      if (!hasNeighbor(row, col, 2)) continue;

      const score = evaluateMove(row, col, aiPlayer);

      if (score > bestScore) {
        bestScore = score;
        bestMove = { row, col };
      }
    }
  }

  if (!bestMove) {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (board[row][col] !== EMPTY) continue;

        const score = evaluateMove(row, col, aiPlayer);

        if (score > bestScore) {
          bestScore = score;
          bestMove = { row, col };
        }
      }
    }
  }

  if (bestMove) {
    placeStone(bestMove.row, bestMove.col);
  }
}

function aiMove() {
  if (gameOver || gameMode !== "ai" || currentPlayer !== aiPlayer) return;

  if (aiLevel === "easy") {
    easyAiMove();
  } else {
    normalAiMove();
  }
}

function handleMove(clientX, clientY) {
  if (gameOver) return;
  if (gameMode === "ai" && currentPlayer !== humanPlayer) return;

  const pos = getBoardPosition(clientX, clientY);
  if (!pos) return;

  placeStone(pos.row, pos.col);
}

canvas.addEventListener("click", (event) => {
  handleMove(event.clientX, event.clientY);
});

canvas.addEventListener("touchstart", (event) => {
  const touch = event.touches[0];
  handleMove(touch.clientX, touch.clientY);
  event.preventDefault();
}, { passive: false });

resetBtn.addEventListener("click", initBoard);
modeSelect.addEventListener("change", initBoard);
levelSelect.addEventListener("change", initBoard);

initBoard();


