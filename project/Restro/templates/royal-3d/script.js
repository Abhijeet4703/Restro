/* ═══════════════════════════════════════════════════════
   ROYAL 3D — Interactive Script
   Gold particles · 3D tilt · Cart · Scroll reveals
   ═══════════════════════════════════════════════════════ */

// ═══════ GOLD PARTICLE SYSTEM ═══════
class GoldParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.maxParticles = 60;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.init();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle());
    }
  }

  createParticle() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      size: Math.random() * 2.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3 - 0.1,
      opacity: Math.random() * 0.5 + 0.1,
      opacitySpeed: (Math.random() - 0.5) * 0.005,
      hue: 40 + Math.random() * 20,
    };
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.opacity += p.opacitySpeed;

      if (p.opacity <= 0.05 || p.opacity >= 0.6) p.opacitySpeed *= -1;
      if (p.x < 0 || p.x > this.canvas.width) p.speedX *= -1;
      if (p.y < -10) { p.y = this.canvas.height + 10; }
      if (p.y > this.canvas.height + 10) { p.y = -10; }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${p.hue}, 70%, 55%, ${p.opacity})`;
      this.ctx.fill();

      // Inner glow
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${p.hue}, 70%, 55%, ${p.opacity * 0.2})`;
      this.ctx.fill();

      // Outer ambient glow
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 9, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${p.hue}, 60%, 50%, ${p.opacity * 0.06})`;
      this.ctx.fill();
    });

    requestAnimationFrame(() => this.animate());
  }
}

// ═══════ 3D TILT ENGINE ═══════
class TiltEngine {
  constructor() {
    this.cards = document.querySelectorAll('[data-tilt]');
    this.init();
  }

  init() {
    this.cards.forEach(card => {
      card.addEventListener('mousemove', (e) => this.handleMove(card, e));
      card.addEventListener('mouseleave', () => this.handleLeave(card));
      card.addEventListener('touchmove', (e) => this.handleTouch(card, e), { passive: true });
      card.addEventListener('touchend', () => this.handleLeave(card));
    });
  }

  handleMove(card, e) {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / centerY * -8;
    const rotateY = (x - centerX) / centerX * 8;

    const depth = Math.sqrt(rotateX * rotateX + rotateY * rotateY);
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${depth * 2.5}px) scale3d(1.03, 1.03, 1.03)`;
    card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
    card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
  }

  handleTouch(card, e) {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = card.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / centerY * -5;
    const rotateY = (x - centerX) / centerX * 5;

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
  }

  handleLeave(card) {
    card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
  }
}

// ═══════ SCROLL REVEAL ═══════
class ScrollReveal {
  constructor() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.tilt-card, .dish-row').forEach(el => {
      this.observer.observe(el);
    });
  }

  refreshCards() {
    document.querySelectorAll('.tilt-card:not(.revealed), .dish-row:not(.revealed)').forEach(el => {
      this.observer.observe(el);
    });
  }
}

// ═══════ INTRO ═══════
function initIntro() {
  const overlay = document.getElementById('introOverlay');
  const wrapper = document.getElementById('menuWrapper');

  overlay.addEventListener('click', openMenu);
  overlay.addEventListener('touchstart', openMenu, { passive: true });

  // Auto-open after 4 seconds
  setTimeout(() => {
    if (!overlay.classList.contains('leaving')) {
      openMenu();
    }
  }, 4000);

  function openMenu() {
    if (overlay.classList.contains('leaving')) return;
    overlay.classList.add('leaving');
    
    setTimeout(() => {
      overlay.classList.add('hidden');
      wrapper.classList.add('visible');
      // Reveal cards in the active section
      scrollReveal.refreshCards();
    }, 800);
  }
}

// ═══════ CATEGORY NAVIGATION ═══════
function initCategories() {
  const tabs = document.querySelectorAll('.cat-tab');
  const sections = document.querySelectorAll('.menu-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const cat = tab.dataset.cat;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      sections.forEach(s => {
        if (s.id === encodeURIComponent(cat) || s.id === cat) {
          s.classList.add('active');
          s.style.display = '';
          setTimeout(() => scrollReveal && scrollReveal.refreshCards(), 50);
        } else {
          s.classList.remove('active');
          s.style.display = 'none';
        }
      });

      document.querySelector('.menu-content').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

// ═══════ HAPTIC CLICK ANIMATION ═══════
function initHapticClicks() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-btn');
    if (!btn) return;
    const card = btn.closest('.tilt-card');
    if (!card) return;
    card.style.transition = 'transform 0.1s ease';
    card.style.transform = 'perspective(800px) scale3d(0.94, 0.94, 0.94) translateZ(-10px)';
    setTimeout(() => {
      card.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
      card.style.transform = 'perspective(800px) scale3d(1, 1, 1) translateZ(0)';
    }, 120);
  });
}

// ═══════ SCROLL PARALLAX ═══════
function initScrollParallax() {
  const header = document.querySelector('.menu-header');
  const headerGlow = document.querySelector('.header-glow');
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        if (header) {
          header.style.transform = `translateY(${scrollY * 0.25}px)`;
          header.style.opacity = Math.max(0, 1 - scrollY / 500);
        }
        if (headerGlow) {
          headerGlow.style.transform = `translateX(-50%) scale(${1 + scrollY * 0.0015})`;
          headerGlow.style.opacity = Math.max(0.3, 1 - scrollY / 600);
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ═══════ INITIALIZATION ═══════
let scrollReveal;

document.addEventListener('DOMContentLoaded', () => {
  // Start particle system
  const canvas = document.getElementById('particleCanvas');
  new GoldParticleSystem(canvas);

  // Init 3D tilt
  new TiltEngine();

  // Init scroll reveal
  scrollReveal = new ScrollReveal();

  // Init intro
  initIntro();

  // Init categories
  initCategories();

  // Init cart

  // Init haptic click feedback
  initHapticClicks();

  // Init scroll parallax
  initScrollParallax();

  // Hide non-active sections
  document.querySelectorAll('.menu-section:not(.active)').forEach(s => {
    s.style.display = 'none';
  });

});
