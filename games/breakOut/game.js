// ── Wall Breaker — game.js ──────────────────────────────────────────────────
// 조작 방법:
//   마우스 이동      → 패들 조작
//   방향키 (←/→)    → 패들 이동
//   스페이스 / 클릭  → 공 발사 / 화면 전환
//   터치 드래그      → 모바일 패들 이동
//
// 포인트 (위에서 아래 순서):
//   빨강 5pt / 주황 4pt / 노랑 3pt / 초록 2pt / 파랑 1pt

const WB = (() => {

    // ── Canvas 설정 ────────────────────────────────────────────────────────────
    const canvas = document.getElementById('wb-canvas');
    const ctx    = canvas.getContext('2d');
    const W = 480, H = 520;
  
    // ── 상수 ──────────────────────────────────────────────────────────────────
    const PADDLE_W   = 80,  PADDLE_H = 12;
    const BALL_R     = 7;
    const BRICK_COLS = 10,  BRICK_ROWS = 5;
    const BRICK_W    = 42,  BRICK_H   = 20, BRICK_GAP = 3;
    const BRICK_TOP  = 55;
    const BRICK_LEFT = (W - (BRICK_COLS * (BRICK_W + BRICK_GAP) - BRICK_GAP)) / 2;
  
    // 행별 색상 (위 → 아래)
    const ROW_COLORS = ['#e03e3e', '#e07a20', '#d4c020', '#2fa84f', '#2877d4'];
    // 행별 포인트: 5 / 4 / 3 / 2 / 1
    const ROW_PTS    = [5, 4, 3, 2, 1];
  
    // ── 상태 ──────────────────────────────────────────────────────────────────
    let state;
  
    // 레벨에 맞는 초기 상태 생성. prev가 있으면 점수/목숨을 이어받음.
    function mkState(level, prev) {
      const spd = 3.8 + (level - 1) * 0.6;
      const ang = -(Math.PI / 3 + Math.random() * Math.PI / 3);
      return {
        score  : prev ? prev.score : 0,
        lives  : prev ? prev.lives : 3,
        level,
        phase  : 'ready',   // 'ready' | 'play' | 'over' | 'win' | 'nextlevel'
        px     : (W - PADDLE_W) / 2,
        bx     : W / 2,
        by     : H - 60 - BALL_R,
        dx     : spd * Math.cos(ang),
        dy     : spd * Math.sin(ang),
        spd,
        bricks : Array.from({ length: BRICK_ROWS }, () => Array(BRICK_COLS).fill(true)),
        keys   : {},
      };
    }
  
    // ── 공개 함수: 처음부터 다시 시작 ──────────────────────────────────────────
    function restart() {
      state = mkState(1);
      updateHUD();
      setMsg('스페이스 또는 클릭으로 발사');
    }
  
    // ── HUD 업데이트 ──────────────────────────────────────────────────────────
    function updateHUD() {
      document.getElementById('wb-score').textContent = state.score;
      document.getElementById('wb-level').textContent = state.level;
      document.getElementById('wb-lives').textContent =
        state.lives > 0 ? '♥ '.repeat(state.lives).trim() : '—';
    }
  
    function setMsg(m) {
      document.getElementById('wb-msg').textContent = m;
    }
  
    // ── 벽돌 좌표 계산 ────────────────────────────────────────────────────────
    function brickRect(r, c) {
      return {
        x: BRICK_LEFT + c * (BRICK_W + BRICK_GAP),
        y: BRICK_TOP  + r * (BRICK_H  + BRICK_GAP),
        w: BRICK_W,
        h: BRICK_H,
      };
    }
  
    function bricksLeft() {
      return state.bricks.some(row => row.some(b => b));
    }
  
    // ── 그리기 ────────────────────────────────────────────────────────────────
    function draw() {
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, W, H);
  
      drawBricks();
      drawPaddle();
      drawBall();
      drawOverlay();
    }
  
    function drawBricks() {
      ctx.textAlign = 'center';
      ctx.font = '10px monospace';
  
      for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if (!state.bricks[r][c]) continue;
          const { x, y, w, h } = brickRect(r, c);
  
          ctx.fillStyle = ROW_COLORS[r];
          roundRect(x, y, w, h, 3);
          ctx.fill();
  
          ctx.strokeStyle = 'rgba(255,255,255,0.18)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
  
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fillText(ROW_PTS[r] + 'pt', x + w / 2, y + h / 2 + 4);
        }
      }
    }
  
    function drawPaddle() {
      const py = H - 55;
      ctx.fillStyle = '#c8d8ff';
      roundRect(state.px, py, PADDLE_W, PADDLE_H, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  
    function drawBall() {
      ctx.beginPath();
      ctx.arc(state.bx, state.by, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffc8';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  
    function drawOverlay() {
      if (!['over', 'win', 'nextlevel'].includes(state.phase)) return;
  
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
  
      const titleColor = { over: '#ff6060', win: '#60ff80', nextlevel: '#60c8ff' }[state.phase];
      const title      = { over: '게임 오버', win: '클리어!', nextlevel: '레벨 ' + (state.level - 1) + ' 완료!' }[state.phase];
      const sub1       = { over: '점수: ' + state.score, win: '최종 점수: ' + state.score, nextlevel: '레벨 ' + state.level + ' 시작 준비' }[state.phase];
      const sub2       = { over: '스페이스 또는 클릭으로 재시작', win: '스페이스 또는 클릭으로 재시작', nextlevel: '스페이스 또는 클릭으로 계속' }[state.phase];
  
      ctx.fillStyle = titleColor;
      ctx.font = 'bold 26px monospace';
      ctx.fillText(title, W / 2, H / 2 - 20);
  
      ctx.fillStyle = '#999';
      ctx.font = '13px monospace';
      ctx.fillText(sub1, W / 2, H / 2 + 10);
      ctx.fillText(sub2, W / 2, H / 2 + 34);
    }
  
    // ── 유틸: 둥근 사각형 경로 ────────────────────────────────────────────────
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y,     x + w, y + r,     r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x,     y + h, x,     y + h - r, r);
      ctx.lineTo(x,     y + r);
      ctx.arcTo(x,     y,     x + r, y,         r);
      ctx.closePath();
    }
  
    // ── 물리 업데이트 ─────────────────────────────────────────────────────────
    function update() {
      if (state.phase !== 'play') return;
  
      // 키보드 패들 이동
      if (state.keys['ArrowLeft']  && state.px > 0)              state.px -= 6;
      if (state.keys['ArrowRight'] && state.px < W - PADDLE_W)   state.px += 6;
  
      // 공 이동
      state.bx += state.dx;
      state.by += state.dy;
  
      // 벽 충돌
      if (state.bx - BALL_R <= 0)  { state.bx = BALL_R;     state.dx =  Math.abs(state.dx); }
      if (state.bx + BALL_R >= W)  { state.bx = W - BALL_R; state.dx = -Math.abs(state.dx); }
      if (state.by - BALL_R <= 0)  { state.by = BALL_R;     state.dy =  Math.abs(state.dy); }
  
      // 패들 충돌
      const py = H - 55;
      if (
        state.by + BALL_R >= py &&
        state.by + BALL_R <= py + PADDLE_H + 4 &&
        state.bx >= state.px - 4 &&
        state.bx <= state.px + PADDLE_W + 4 &&
        state.dy > 0
      ) {
        const hit   = (state.bx - (state.px + PADDLE_W / 2)) / (PADDLE_W / 2);
        const angle = hit * (Math.PI / 3) - Math.PI / 2;
        const spd   = Math.hypot(state.dx, state.dy);
        state.dx = spd * Math.cos(angle);
        state.dy = spd * Math.sin(angle);
        state.by = py - BALL_R - 1;
      }
  
      // 벽돌 충돌
      for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if (!state.bricks[r][c]) continue;
          const { x, y, w, h } = brickRect(r, c);
  
          if (
            state.bx + BALL_R > x && state.bx - BALL_R < x + w &&
            state.by + BALL_R > y && state.by - BALL_R < y + h
          ) {
            state.bricks[r][c] = false;
            state.score += ROW_PTS[r];
            updateHUD();
  
            const overL = (state.bx + BALL_R) - x;
            const overR = (x + w) - (state.bx - BALL_R);
            const overT = (state.by + BALL_R) - y;
            const overB = (y + h) - (state.by - BALL_R);
            if (Math.min(overL, overR) < Math.min(overT, overB)) state.dx = -state.dx;
            else state.dy = -state.dy;
  
            // 벽돌 깰 때마다 미세 가속
            const spd   = Math.hypot(state.dx, state.dy);
            const boost = Math.min(spd * 1.012, state.spd * 2);
            state.dx = (state.dx / spd) * boost;
            state.dy = (state.dy / spd) * boost;
  
            r = BRICK_ROWS; // 한 프레임에 하나만 처리
            break;
          }
        }
      }
  
      // 레벨 클리어 확인
      if (!bricksLeft()) {
        if (state.level < 3) {
          const next = state.level + 1;
          state = mkState(next, { score: state.score, lives: state.lives });
          state.phase = 'nextlevel';
          updateHUD();
        } else {
          state.phase = 'win';
          setMsg('클리어! 최종 점수: ' + state.score);
        }
        return;
      }
  
      // 공 낙사 확인
      if (state.by - BALL_R > H) {
        state.lives--;
        updateHUD();
        if (state.lives <= 0) {
          state.phase = 'over';
          setMsg('게임 오버');
        } else {
          const ang  = -(Math.PI / 3 + Math.random() * Math.PI / 3);
          state.bx   = state.px + PADDLE_W / 2;
          state.by   = H - 60 - BALL_R;
          state.dx   = state.spd * Math.cos(ang);
          state.dy   = state.spd * Math.sin(ang);
          state.phase = 'ready';
          setMsg('목숨을 잃었습니다! 스페이스 또는 클릭으로 발사');
        }
      }
    }
  
    // ── 액션 (스페이스 / 클릭 / 탭) ──────────────────────────────────────────
    function action() {
      if      (state.phase === 'ready')     { state.phase = 'play'; setMsg(''); }
      else if (state.phase === 'nextlevel') { state.phase = 'ready'; setMsg('스페이스 또는 클릭으로 발사'); }
      else if (state.phase === 'over' || state.phase === 'win') { restart(); }
    }
  
    // ── 입력: 키보드 ─────────────────────────────────────────────────────────
    document.addEventListener('keydown', e => {
      if (!state) return;
      state.keys[e.key] = true;
      if (e.key === ' ') { e.preventDefault(); action(); }
    });
    document.addEventListener('keyup', e => {
      if (state) state.keys[e.key] = false;
    });
  
    // ── 입력: 마우스 ─────────────────────────────────────────────────────────
    canvas.addEventListener('mousemove', e => {
      if (!state || state.phase !== 'play') return;
      const rect = canvas.getBoundingClientRect();
      const mx   = (e.clientX - rect.left) * (W / rect.width);
      state.px   = Math.max(0, Math.min(W - PADDLE_W, mx - PADDLE_W / 2));
    });
    canvas.addEventListener('click', () => action());
  
    // ── 입력: 터치 ───────────────────────────────────────────────────────────
    let touchStartX = null;
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      touchStartX = e.touches[0].clientX;
      action();
    }, { passive: false });
  
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (touchStartX === null || !state) return;
      const delta = e.touches[0].clientX - touchStartX;
      touchStartX = e.touches[0].clientX;
      state.px = Math.max(0, Math.min(W - PADDLE_W, state.px + delta * 1.5));
    }, { passive: false });
  
    canvas.addEventListener('touchend', () => { touchStartX = null; });
  
    // ── 게임 루프 ────────────────────────────────────────────────────────────
    function loop() {
      update();
      draw();
      requestAnimationFrame(loop);
    }
  
    restart();
    loop();
  
    return { restart };
  
  })();