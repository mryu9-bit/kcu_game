const maxObstacles = 2;
const minObstacleGap = 420;
const game = document.getElementById("game");
const player = document.getElementById("player");
const princess = document.getElementById("princess");
const castle = document.getElementById("castle");
const scoreDisplay = document.getElementById("score");
const goalDisplay = document.getElementById("goal");
const message = document.getElementById("message");
const restartBtn = document.getElementById("restartBtn");

const goal = 1000;
goalDisplay.textContent = goal;

let isJumping = false;
let isGameRunning = false;
let isGameOver = false;
let isCleared = false;

let playerBottom = 80;
let velocity = 0;
const gravity = 0.8;
const jumpPower = 14;

let score = 0;
let animationId = null;
let spawnTimeout = null;
let obstacles = [];

function startGame() {
  if (isGameRunning) return;

  isGameRunning = true;
  isGameOver = false;
  isCleared = false;
  isJumping = false;

  score = 0;
  playerBottom = 80;
  velocity = 0;

  scoreDisplay.textContent = score;
  player.style.bottom = playerBottom + "px";

  clearAllObstacles();

  message.classList.add("hidden");
  restartBtn.style.display = "none";
  princess.classList.add("hidden");
  castle.classList.add("hidden");

  spawnObstacleLoop();
  gameLoop();
}

function jump() {
  if (!isGameRunning || isGameOver || isCleared) return;

  if (!isJumping) {
    isJumping = true;
    velocity = jumpPower;
  }
}

function updatePlayer() {
  if (isJumping) {
    playerBottom += velocity;
    velocity -= gravity;

    if (playerBottom <= 80) {
      playerBottom = 80;
      velocity = 0;
      isJumping = false;
    }
  }

  player.style.bottom = playerBottom + "px";
}

function createObstacle() {
  if (obstacles.length >= 3) return;

  const obstacle = document.createElement("div");
  obstacle.classList.add("obstacle");

  const obstacleTypes = [
    { className: "block", width: 36, height: 55, speed: 7 },
    { className: "tall", width: 28, height: 100, speed: 8.5 },
    { className: "wide", width: 80, height: 36, speed: 6.5 },
    { className: "pillar", width: 22, height: 80, speed: 9 },
    { className: "rock", width: 52, height: 42, speed: 7.2 }
  ];

  const randomType =
    obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

  obstacle.classList.add(randomType.className);
  obstacle.style.width = randomType.width + "px";
  obstacle.style.height = randomType.height + "px";
  obstacle.style.left = game.offsetWidth + "px";

  game.appendChild(obstacle);

  obstacles.push({
    element: obstacle,
    left: game.offsetWidth,
    width: randomType.width,
    height: randomType.height,
    speed: randomType.speed
  });
}

function spawnObstacleLoop() {
  if (!isGameRunning) return;

  createObstacle();

  const delay = Math.random() * 1200 + 1000; // 더 빠르고 촘촘하게
  spawnTimeout = setTimeout(spawnObstacleLoop, delay);
}

function updateObstacles() {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];

    obs.left -= obs.speed + score / 500;
    obs.element.style.left = obs.left + "px";

    if (obs.left < -150) {
      obs.element.remove();
      obstacles.splice(i, 1);
    }
  }
}

function updateScore() {
  if (!isGameRunning || isGameOver || isCleared) return;

  score += 1;
  scoreDisplay.textContent = score;

  if (score >= goal) {
    winGame();
  }
}

function checkCollision() {
  const playerRect = player.getBoundingClientRect();

  for (const obs of obstacles) {
    const obstacleRect = obs.element.getBoundingClientRect();

    const hit =
      playerRect.left < obstacleRect.right &&
      playerRect.right > obstacleRect.left &&
      playerRect.top < obstacleRect.bottom &&
      playerRect.bottom > obstacleRect.top;

    if (hit) {
      gameOver();
      break;
    }
  }
}

function gameLoop() {
  if (!isGameRunning) return;

  updatePlayer();
  updateObstacles();
  updateScore();
  checkCollision();

  animationId = requestAnimationFrame(gameLoop);
}

function gameOver() {
  isGameRunning = false;
  isGameOver = true;

  cancelAnimationFrame(animationId);
  clearTimeout(spawnTimeout);

  message.classList.remove("hidden");
  message.innerHTML = `
    <h2>Game Over 💀</h2>
    <p>You hit an obstacle. Press Restart to try again.</p>
  `;

  restartBtn.style.display = "inline-block";
}

function winGame() {
  isGameRunning = false;
  isCleared = true;

  cancelAnimationFrame(animationId);
  clearTimeout(spawnTimeout);
  clearAllObstacles();

  castle.classList.remove("hidden");
  princess.classList.remove("hidden");

  message.classList.remove("hidden");
  message.innerHTML = `
    <h2>You Saved the Princess 👑</h2>
    <p>Congratulations! Press Restart to play again.</p>
  `;

  restartBtn.style.display = "inline-block";
}

function clearAllObstacles() {
  for (const obs of obstacles) {
    obs.element.remove();
  }
  obstacles = [];
}

function resetGame() {
  cancelAnimationFrame(animationId);
  clearTimeout(spawnTimeout);

  isJumping = false;
  isGameRunning = false;
  isGameOver = false;
  isCleared = false;

  score = 0;
  playerBottom = 80;
  velocity = 0;

  scoreDisplay.textContent = score;
  goalDisplay.textContent = goal;
  player.style.bottom = playerBottom + "px";

  clearAllObstacles();

  princess.classList.add("hidden");
  castle.classList.add("hidden");

  message.classList.remove("hidden");
  message.innerHTML = `
    <h2>The Princess Has Been Captured!</h2>
    <p>Press SPACE to start and jump.</p>
  `;

  restartBtn.style.display = "none";
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();

    if (!isGameRunning && !isGameOver && !isCleared) {
      startGame();
    } else if (isGameRunning) {
      jump();
    }
  }
});

restartBtn.addEventListener("click", resetGame);

resetGame();

