const cells = document.querySelectorAll(".cell");
const statusText = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");
const modeButtons = document.querySelectorAll(".mode-btn");

const HUMAN = "X";
const AI = "O";

let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let gameActive = true;
let isAiThinking = false;
let currentMode = "two-player";

const winPatterns = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

function updateStatus(message) {
  statusText.textContent = message;
}

function handleCellClick(event) {
  const clickedCell = event.target;
  const index = Number(clickedCell.dataset.index);

  if (!gameActive || board[index] !== "" || isAiThinking) {
    return;
  }

  if (currentMode === "two-player") {
    placeMark(index, currentPlayer);

    if (checkWinner(currentPlayer)) {
      updateStatus(`PLAYER ${currentPlayer} WINS`);
      endGame();
      return;
    }

    if (checkDraw()) {
      updateStatus("DRAW GAME");
      endGame();
      return;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    updateStatus(`PLAYER ${currentPlayer} TURN`);
    return;
  }

  placeMark(index, HUMAN);

  if (checkWinner(HUMAN)) {
    updateStatus("YOU WIN");
    endGame();
    return;
  }

  if (checkDraw()) {
    updateStatus("DRAW GAME");
    endGame();
    return;
  }

  isAiThinking = true;
  updateStatus(currentMode === "easy-ai" ? "EASY AI THINKING..." : "HARD AI THINKING...");

  setTimeout(() => {
    if (currentMode === "easy-ai") {
      easyAiMove();
    } else {
      hardAiMove();
    }

    if (checkWinner(AI)) {
      updateStatus(currentMode === "easy-ai" ? "EASY AI WINS" : "HARD AI WINS");
      endGame();
      return;
    }

    if (checkDraw()) {
      updateStatus("DRAW GAME");
      endGame();
      return;
    }

    isAiThinking = false;
    updateStatus("YOUR TURN");
  }, 350);
}

function placeMark(index, player) {
  board[index] = player;
  cells[index].textContent = player;
  cells[index].classList.add(player.toLowerCase());
  cells[index].disabled = true;
}

function checkWinner(player, currentBoard = board) {
  return winPatterns.some((pattern) =>
    pattern.every((index) => currentBoard[index] === player)
  );
}

function checkDraw(currentBoard = board) {
  return currentBoard.every((cell) => cell !== "");
}

function endGame() {
  gameActive = false;
  isAiThinking = false;
  disableBoard();
}

function disableBoard() {
  cells.forEach((cell) => {
    cell.disabled = true;
  });
}

function resetBoardUI() {
  cells.forEach((cell) => {
    cell.textContent = "";
    cell.disabled = false;
    cell.classList.remove("x", "o");
  });
}

function restartGame() {
  board = ["", "", "", "", "", "", "", "", ""];
  currentPlayer = "X";
  gameActive = true;
  isAiThinking = false;
  resetBoardUI();
  updateModeStatus();
}

function setMode(mode) {
  currentMode = mode;

  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  restartGame();
}

function updateModeStatus() {
  if (currentMode === "two-player") {
    updateStatus(`PLAYER ${currentPlayer} TURN`);
  } else {
    updateStatus("YOUR TURN");
  }
}

/* =========================
   EASY AI
   - 일부러 실수 가능
   - 사람도 충분히 이길 수 있음
========================= */
function easyAiMove() {
  const emptyCells = getEmptyCells(board);

  if (emptyCells.length === 0) {
    return;
  }

  const shouldPlaySmart = Math.random() < 0.45;

  if (shouldPlaySmart) {
    let move = findWinningMove(AI);
    if (move !== null) {
      placeMark(move, AI);
      return;
    }

    move = findWinningMove(HUMAN);
    if (move !== null && Math.random() < 0.6) {
      placeMark(move, AI);
      return;
    }

    if (board[4] === "" && Math.random() < 0.5) {
      placeMark(4, AI);
      return;
    }
  }

  const randomMove = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  placeMark(randomMove, AI);
}

/* =========================
   HARD AI
   - minimax
   - 절대 안 짐
========================= */
function hardAiMove() {
  let bestScore = -Infinity;
  let move = null;

  for (const index of getEmptyCells(board)) {
    board[index] = AI;
    const score = minimax(board, 0, false);
    board[index] = "";

    if (score > bestScore) {
      bestScore = score;
      move = index;
    }
  }

  if (move !== null) {
    placeMark(move, AI);
  }
}

function minimax(currentBoard, depth, isMaximizing) {
  if (checkWinner(AI, currentBoard)) {
    return 10 - depth;
  }

  if (checkWinner(HUMAN, currentBoard)) {
    return depth - 10;
  }

  if (checkDraw(currentBoard)) {
    return 0;
  }

  if (isMaximizing) {
    let bestScore = -Infinity;

    for (const index of getEmptyCells(currentBoard)) {
      currentBoard[index] = AI;
      const score = minimax(currentBoard, depth + 1, false);
      currentBoard[index] = "";
      bestScore = Math.max(score, bestScore);
    }

    return bestScore;
  } else {
    let bestScore = Infinity;

    for (const index of getEmptyCells(currentBoard)) {
      currentBoard[index] = HUMAN;
      const score = minimax(currentBoard, depth + 1, true);
      currentBoard[index] = "";
      bestScore = Math.min(score, bestScore);
    }

    return bestScore;
  }
}

function getEmptyCells(currentBoard) {
  return currentBoard
    .map((cell, index) => (cell === "" ? index : null))
    .filter((value) => value !== null);
}

function findWinningMove(player) {
  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    const values = [board[a], board[b], board[c]];
    const playerCount = values.filter((value) => value === player).length;
    const emptyCount = values.filter((value) => value === "").length;

    if (playerCount === 2 && emptyCount === 1) {
      if (board[a] === "") return a;
      if (board[b] === "") return b;
      if (board[c] === "") return c;
    }
  }

  return null;
}

function goBackHub() {
  alert("Connect this button to your hub page.");
}

cells.forEach((cell) => {
  cell.addEventListener("click", handleCellClick);
});

restartBtn.addEventListener("click", restartGame);

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

updateModeStatus();