const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const gravity = 0.8;
const groundY = 410;

const keys = {
  a: false,
  d: false,
  w: false,
  f: false
};

let gameOver = false;

function createFighter(x, color, direction) {
  return {
    x,
    y: groundY,
    width: 60,
    height: 90,
    color,
    vx: 0,
    vy: 0,
    speed: 5,
    jumpPower: 16,
    hp: 100,
    isJumping: false,
    isAttacking: false,
    attackCooldown: 0,
    attackDuration: 0,
    facing: direction,
    hitFlash: 0
  };
}

let player = createFighter(150, "#2563eb", "right");
let enemy = createFighter(780, "#dc2626", "left");

function resetGame() {
  player = createFighter(150, "#2563eb", "right");
  enemy = createFighter(780, "#dc2626", "left");
  gameOver = false;
  document.getElementById("message").style.display = "none";
  document.getElementById("restartBtn").style.display = "none";
  updateHpBars();
  animate();
}

function updateHpBars() {
  document.getElementById("playerHp").style.width = player.hp + "%";
  document.getElementById("enemyHp").style.width = enemy.hp + "%";
}

function drawBackground() {
  ctx.fillStyle = "#7c5e3c";
  ctx.fillRect(0, 460, canvas.width, 40);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(120, 90, 140, 40);
  ctx.fillRect(620, 70, 180, 50);

  ctx.fillStyle = "#2e8b57";
  ctx.fillRect(60, 390, 30, 70);
  ctx.beginPath();
  ctx.arc(75, 375, 35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillRect(900, 395, 25, 65);
  ctx.beginPath();
  ctx.arc(912, 380, 30, 0, Math.PI * 2);
  ctx.fill();
}

function drawFighter(fighter) {
  ctx.save();

  if (fighter.hitFlash > 0) {
    ctx.globalAlpha = 0.6;
  }

  ctx.fillStyle = fighter.color;
  ctx.fillRect(fighter.x, fighter.y - fighter.height, fighter.width, fighter.height);

  ctx.fillStyle = "#ffe0bd";
  ctx.beginPath();
  ctx.arc(fighter.x + fighter.width / 2, fighter.y - fighter.height - 18, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111";
  if (fighter.facing === "right") {
    ctx.fillRect(fighter.x + 40, fighter.y - fighter.height + 25, 8, 8);
  } else {
    ctx.fillRect(fighter.x + 12, fighter.y - fighter.height + 25, 8, 8);
  }

  if (fighter.isAttacking) {
    ctx.fillStyle = "rgba(255, 215, 0, 0.8)";
    const attackBox = getAttackBox(fighter);
    ctx.fillRect(attackBox.x, attackBox.y, attackBox.width, attackBox.height);
  }

  ctx.restore();
}

function getAttackBox(fighter) {
  if (fighter.facing === "right") {
    return {
      x: fighter.x + fighter.width,
      y: fighter.y - fighter.height + 20,
      width: 35,
      height: 20
    };
  } else {
    return {
      x: fighter.x - 35,
      y: fighter.y - fighter.height + 20,
      width: 35,
      height: 20
    };
  }
}

function isColliding(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

function fighterBodyBox(fighter) {
  return {
    x: fighter.x,
    y: fighter.y - fighter.height,
    width: fighter.width,
    height: fighter.height
  };
}

function attack(attacker, defender) {
  if (attacker.attackCooldown > 0 || attacker.isAttacking) return;

  attacker.isAttacking = true;
  attacker.attackDuration = 12;
  attacker.attackCooldown = 30;

  const attackBox = getAttackBox(attacker);
  const defenderBox = fighterBodyBox(defender);

  if (isColliding(attackBox, defenderBox)) {
    defender.hp -= 10;
    defender.hitFlash = 8;

    if (attacker.facing === "right") {
      defender.x += 20;
    } else {
      defender.x -= 20;
    }

    if (defender.hp < 0) defender.hp = 0;
    updateHpBars();
    checkWinner();
  }
}

function updatePlayer() {
  player.vx = 0;

  if (keys.a) {
    player.vx = -player.speed;
    player.facing = "left";
  }
  if (keys.d) {
    player.vx = player.speed;
    player.facing = "right";
  }
  if (keys.w && !player.isJumping) {
    player.vy = -player.jumpPower;
    player.isJumping = true;
  }

  player.x += player.vx;
  player.y += player.vy;
  player.vy += gravity;

  if (player.y >= groundY) {
    player.y = groundY;
    player.vy = 0;
    player.isJumping = false;
  }

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.attackDuration > 0) {
    player.attackDuration--;
  } else {
    player.isAttacking = false;
  }

  if (player.hitFlash > 0) player.hitFlash--;
}

function updateEnemy() {
  const distance = player.x - enemy.x;

  enemy.vx = 0;

  if (Math.abs(distance) > 80) {
    if (distance < 0) {
      enemy.vx = -3;
      enemy.facing = "left";
    } else {
      enemy.vx = 3;
      enemy.facing = "right";
    }
  } else {
    if (enemy.attackCooldown <= 0 && Math.random() < 0.05) {
      attack(enemy, player);
    }
  }

  if (Math.random() < 0.003 && !enemy.isJumping) {
    enemy.vy = -14;
    enemy.isJumping = true;
  }

  enemy.x += enemy.vx;
  enemy.y += enemy.vy;
  enemy.vy += gravity;

  if (enemy.y >= groundY) {
    enemy.y = groundY;
    enemy.vy = 0;
    enemy.isJumping = false;
  }

  if (enemy.x < 0) enemy.x = 0;
  if (enemy.x + enemy.width > canvas.width) enemy.x = canvas.width - enemy.width;

  if (enemy.attackCooldown > 0) enemy.attackCooldown--;
  if (enemy.attackDuration > 0) {
    enemy.attackDuration--;
  } else {
    enemy.isAttacking = false;
  }

  if (enemy.hitFlash > 0) enemy.hitFlash--;
}

function checkWinner() {
  if (player.hp <= 0 || enemy.hp <= 0) {
    gameOver = true;
    const msg = document.getElementById("message");
    const restartBtn = document.getElementById("restartBtn");

    if (player.hp <= 0 && enemy.hp <= 0) {
      msg.textContent = "무승부!";
    } else if (enemy.hp <= 0) {
      msg.textContent = "플레이어 승리!";
    } else {
      msg.textContent = "컴퓨터 승리!";
    }

    msg.style.display = "block";
    restartBtn.style.display = "block";
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawFighter(player);
  drawFighter(enemy);
}

function animate() {
  if (gameOver) {
    draw();
    return;
  }

  updatePlayer();
  updateEnemy();
  draw();
  requestAnimationFrame(animate);
}

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (key === "a") keys.a = true;
  if (key === "d") keys.d = true;
  if (key === "w") keys.w = true;

  if (key === "f") {
    attack(player, enemy);
  }
});

window.addEventListener("keyup", (e) => {
  const key = e.key.toLowerCase();

  if (key === "a") keys.a = false;
  if (key === "d") keys.d = false;
  if (key === "w") keys.w = false;
});

document.getElementById("restartBtn").addEventListener("click", () => {
  resetGame();
});

updateHpBars();
animate();


