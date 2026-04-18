/* ═══════════════════════════════════════════════════════
   INSTA REEL — Interactive Script
   Intro particles · Parallax scroll · Like/share · Cart
   ═══════════════════════════════════════════════════════ */

// ═══════ INTRO SPARKLE PARTICLES ═══════
class IntroParticles {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.resize();
    for (let i = 0; i < 30; i++) this.particles.push(this.create());
    this.animate();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  create() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      size: Math.random() * 2 + 0.5,
      speedY: -(Math.random() * 0.5 + 0.1),
      speedX: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.6 + 0.2,
      opDir: Math.random() > 0.5 ? 1 : -1,
    };
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.opacity += p.opDir * 0.005;
      if (p.opacity <= 0.1 || p.opacity >= 0.8) p.opDir *= -1;
      if (p.y < -5) { p.y = this.canvas.height + 5; p.x = Math.random() * this.canvas.width; }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      this.ctx.fill();
    });
    this._raf = requestAnimationFrame(() => this.animate());
  }

  destroy() { cancelAnimationFrame(this._raf); }
}

// ═══════ INTRO ═══════
let introParticles;

function initIntro() {
  const intro = document.getElementById('intro');
  const container = document.getElementById('reelContainer');
  const canvas = document.getElementById('introParticles');
  
  introParticles = new IntroParticles(canvas);

  // Swipe up or click to open
  let startY = 0;
  intro.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  intro.addEventListener('touchend', e => {
    const endY = e.changedTouches[0].clientY;
    if (startY - endY > 50) openMenu();
  });
  intro.addEventListener('click', openMenu);

  // Auto open after 3.5s
  setTimeout(() => {
    if (!intro.classList.contains('hidden')) openMenu();
  }, 3500);

  function openMenu() {
    if (intro.classList.contains('hidden')) return;
    intro.classList.add('hidden');
    container.classList.add('visible');
    introParticles.destroy();
    initScrollProgress();
  }
}

// ═══════ SCROLL PROGRESS ═══════
function initScrollProgress() {
  const reels = document.getElementById('reels');
  const allReels = document.querySelectorAll('.reel');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const progress = entry.target.querySelector('.reel-progress');
        if (progress) {
          progress.style.setProperty('--prog', '100%');
          progress.querySelector('::after')?.style.setProperty('width', '100%');
        }
        // Parallax effect on bg
        entry.target.querySelector('.reel-bg').style.transform = 'scale(1)';
      } else {
        entry.target.querySelector('.reel-bg').style.transform = 'scale(1.05)';
      }
    });
  }, { threshold: 0.5 });

  allReels.forEach(r => observer.observe(r));
}

// ═══════ CATEGORIES (STORY BAR) ═══════
function initCategories() {
  const bubbles = document.querySelectorAll('.story-bubble');
  const reels = document.querySelectorAll('.reel');
  const reelsContainer = document.getElementById('reels');

  bubbles.forEach(bubble => {
    bubble.addEventListener('click', () => {
      const cat = bubble.dataset.cat;

      bubbles.forEach(b => b.classList.remove('active'));
      bubble.classList.add('active');

      reels.forEach(r => {
        if (cat === 'all' || r.dataset.cat === cat) {
          r.style.display = '';
        } else {
          r.style.display = 'none';
        }
      });

      // Scroll to first visible reel
      const firstVisible = reelsContainer.querySelector('.reel:not([style*="display: none"])');
      if (firstVisible) firstVisible.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// ═══════ LIKE ═══════
function toggleLike(el) {
  el.classList.toggle('liked');
  const icon = el.querySelector('.side-icon');
  if (el.classList.contains('liked')) {
    icon.textContent = '❤️';
    // Floating hearts effect
    spawnFloatingEmoji(el, '❤️');
  } else {
    icon.textContent = '🤍';
  }
}

function spawnFloatingEmoji(parent, emoji) {
  for (let i = 0; i < 6; i++) {
    const el = document.createElement('div');
    el.textContent = emoji;
    const drift = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 30);
    el.style.cssText = `
      position: absolute;
      font-size: ${16 + Math.random() * 14}px;
      pointer-events: none;
      z-index: 100;
      top: 0;
      left: 50%;
      --drift: ${drift}px;
      animation: floatUp 1.2s ease forwards;
      animation-delay: ${i * 0.08}s;
      opacity: 0;
    `;
    parent.style.position = 'relative';
    parent.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
}

// ═══════ 3D SWIPE GESTURE ═══════
function init3DSwipe() {
  const reelsEl = document.getElementById('reels');
  let startY = 0, startX = 0, isDragging = false;

  reelsEl.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  reelsEl.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY;
    const deltaX = e.touches[0].clientX - startX;
    // Carousel-style rotation based on drag distance (max 15deg)
    const rotateY = Math.max(-15, Math.min(15, deltaX * 0.08));
    const rotateX = Math.max(-5, Math.min(5, deltaY * 0.03));
    const depth = Math.min(30, Math.abs(deltaY) * 0.1);

    document.querySelectorAll('.reel:not([style*="display: none"])').forEach(reel => {
      const rect = reel.getBoundingClientRect();
      if (rect.top > -window.innerHeight / 2 && rect.top < window.innerHeight / 2) {
        reel.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg) translateZ(-${depth}px)`;
        reel.style.transition = 'none';
      }
    });
  }, { passive: true });

  reelsEl.addEventListener('touchend', () => {
    isDragging = false;
    document.querySelectorAll('.reel').forEach(reel => {
      reel.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
      reel.style.transform = '';
    });
  });
}

// ═══════ DOUBLE-TAP HEART ═══════
function initDoubleTap() {
  let lastTap = 0;

  document.querySelectorAll('.reel').forEach(reel => {
    reel.addEventListener('touchend', e => {
      const now = Date.now();
      if (now - lastTap < 300) {
        const touch = e.changedTouches[0];
        const rect = reel.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        // Spawn big animated heart at tap location
        const heart = document.createElement('div');
        heart.className = 'double-tap-heart';
        heart.textContent = '❤️';
        heart.style.left = x + 'px';
        heart.style.top = y + 'px';
        reel.appendChild(heart);
        setTimeout(() => heart.remove(), 900);

        // Auto-like if not already liked
        const likeBtn = reel.querySelector('.side-btn.like');
        if (likeBtn && !likeBtn.classList.contains('liked')) {
          toggleLike(likeBtn);
        }
      }
      lastTap = now;
    });
  });
}

// ═══════ AUTO-PLAY SHIMMER ═══════
function initAutoShimmer() {
  setInterval(() => {
    document.querySelectorAll('.reel:not([style*="display: none"])').forEach(reel => {
      const rect = reel.getBoundingClientRect();
      if (rect.top >= 0 && rect.top < window.innerHeight * 0.5) {
        if (reel.querySelector('.reel-shimmer-overlay')) return;
        const shimmer = document.createElement('div');
        shimmer.className = 'reel-shimmer-overlay';
        reel.appendChild(shimmer);
        setTimeout(() => shimmer.remove(), 1600);
      }
    });
  }, 5000);
}

// ═══════ INIT ═══════
document.addEventListener('DOMContentLoaded', () => {
  initIntro();
  initCategories();
  init3DSwipe();
  initDoubleTap();
  initAutoShimmer();

});
