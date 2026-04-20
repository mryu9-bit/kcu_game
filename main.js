/* ============================================================
   MINI GAME HUB — main.js
   ============================================================ */

/* ─── 1. PARTICLE / GRID CANVAS ─────────────────────────────── */
(function initCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
  
    const ctx = canvas.getContext('2d');
    let W, H;
  
    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
  
    const COLORS  = ['#00f5d4', '#ff2d78', '#ffe600', '#9b5de5', '#06d6a0', '#ff6b00'];
    const COUNT   = 70;
    const SPACING = 90;
  
    function rand(a, b) { return a + Math.random() * (b - a); }
  
    const particles = Array.from({ length: COUNT }, () => {
      const p = {
        x: rand(0, window.innerWidth),
        y: rand(0, window.innerHeight),
        vx: rand(-0.25, 0.25),
        vy: rand(-0.55, -0.08),
        r:  rand(0.8, 2.4),
        alpha: rand(0.1, 0.45),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 0,
        maxLife: rand(180, 480),
      };
      p.life = Math.floor(Math.random() * p.maxLife); // stagger
      return p;
    });
  
    function drawGrid() {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.022)';
      ctx.lineWidth   = 1;
      for (let x = 0; x < W; x += SPACING) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += SPACING) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.restore();
    }
  
    function tick() {
      ctx.clearRect(0, 0, W, H);
      drawGrid();
  
      particles.forEach(p => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
  
        const t = p.life / p.maxLife;
        p.alpha = t < 0.1
          ? (t / 0.1) * 0.45
          : t > 0.8
            ? ((1 - t) / 0.2) * 0.45
            : 0.45;
  
        if (p.life > p.maxLife || p.y < -8) {
          p.x    = rand(0, W);
          p.y    = H + 8;
          p.life = 0;
          p.maxLife = rand(180, 480);
          p.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        }
  
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle   = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = 7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
  
      requestAnimationFrame(tick);
    }
    tick();
  })();
  
  
  /* ─── 2. APPLY ACCENT COLORS FROM data-color ─────────────────── */
  document.querySelectorAll('.game-card[data-color]').forEach(card => {
    const color = card.dataset.color;
    card.style.setProperty('--accent', color);
  });
  
  
  /* ─── 3. CUSTOM CURSOR ───────────────────────────────────────── */
  (function initCursor() {
    const dot = document.createElement('div');
    dot.style.cssText = [
      'position:fixed', 'width:8px', 'height:8px', 'border-radius:50%',
      'background:#00f5d4', 'pointer-events:none', 'z-index:9999',
      'transform:translate(-50%,-50%)', 'mix-blend-mode:screen',
      'box-shadow:0 0 14px #00f5d4',
      'transition:width .18s,height .18s,background .18s,box-shadow .18s',
    ].join(';');
  
    const ring = document.createElement('div');
    ring.style.cssText = [
      'position:fixed', 'width:30px', 'height:30px', 'border-radius:50%',
      'border:1px solid rgba(0,245,212,0.4)', 'pointer-events:none',
      'z-index:9998', 'transform:translate(-50%,-50%)',
      'transition:width .18s,height .18s',
    ].join(';');
  
    document.body.append(dot, ring);
  
    let mx = -100, my = -100, rx = -100, ry = -100;
  
    document.addEventListener('mousemove', e => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top  = my + 'px';
    });
  
    (function lerp() {
      rx += (mx - rx) * 0.13;
      ry += (my - ry) * 0.13;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(lerp);
    })();
  
    const hoverEls = document.querySelectorAll('.game-card, .nav-links a');
    hoverEls.forEach(el => {
      el.addEventListener('mouseenter', () => {
        dot.style.width  = dot.style.height  = '12px';
        ring.style.width = ring.style.height = '48px';
        const color = el.style.getPropertyValue('--accent') || '#00f5d4';
        dot.style.background  = color;
        dot.style.boxShadow   = `0 0 14px ${color}`;
        ring.style.borderColor = color + '66';
      });
      el.addEventListener('mouseleave', () => {
        dot.style.width  = dot.style.height  = '8px';
        ring.style.width = ring.style.height = '30px';
        dot.style.background  = '#00f5d4';
        dot.style.boxShadow   = '0 0 14px #00f5d4';
        ring.style.borderColor = 'rgba(0,245,212,0.4)';
      });
    });
  })();
  
  
  /* ─── 4. CARD 3-D TILT ───────────────────────────────────────── */
  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width  / 2)) / (r.width  / 2);
      const dy = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);
      card.style.transition = 'transform 0.05s';
      card.style.transform  = `perspective(650px) rotateY(${dx * 5}deg) rotateX(${-dy * 5}deg) scale(1.025)`;
    });
  
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.5s ease';
      card.style.transform  = '';
    });
  });
  
  
  /* ─── 5. SCROLL-IN ANIMATION ─────────────────────────────────── */
  (function initScroll() {
    const cards = document.querySelectorAll('.game-card');
  
    cards.forEach((c, i) => {
      c.style.opacity   = '0';
      c.style.transform = 'translateY(36px)';
      c.style.transition = `opacity 0.55s ${i * 0.08}s ease, transform 0.55s ${i * 0.08}s cubic-bezier(0.22,1,0.36,1)`;
    });
  
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.style.opacity   = '1';
        entry.target.style.transform = '';
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
  
    cards.forEach(c => io.observe(c));
  })();