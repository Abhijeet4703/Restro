/* ═══════════════════════════════════════════════════════
   MINIMAL ZEN — Interactive Script
   Sakura petals · Ink reveals · Zen ripples · Cart
   ═══════════════════════════════════════════════════════ */

// ═══════ SAKURA PETAL SYSTEM ═══════
class SakuraSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.petals = [];
    this.maxPetals = 25;
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
    for (let i = 0; i < this.maxPetals; i++) {
      this.petals.push(this.createPetal());
    }
  }

  createPetal() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height - this.canvas.height,
      size: Math.random() * 8 + 4,
      speedY: Math.random() * 0.8 + 0.3,
      speedX: Math.random() * 0.4 - 0.1,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.02 + 0.01,
      opacity: Math.random() * 0.4 + 0.1,
    };
  }

  drawPetal(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(p.rotation);
    this.ctx.globalAlpha = p.opacity;
    
    // Petal shape
    this.ctx.beginPath();
    this.ctx.moveTo(0, -p.size / 2);
    this.ctx.bezierCurveTo(
      p.size / 2, -p.size / 3,
      p.size / 2, p.size / 3,
      0, p.size / 2
    );
    this.ctx.bezierCurveTo(
      -p.size / 2, p.size / 3,
      -p.size / 2, -p.size / 3,
      0, -p.size / 2
    );
    
    this.ctx.fillStyle = `hsl(${340 + Math.random() * 10}, 60%, ${80 + Math.random() * 10}%)`;
    this.ctx.fill();
    this.ctx.restore();
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.petals.forEach(p => {
      p.wobble += p.wobbleSpeed;
      p.x += p.speedX + Math.sin(p.wobble) * 0.3;
      p.y += p.speedY;
      p.rotation += p.rotSpeed;

      if (p.y > this.canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * this.canvas.width;
      }

      this.drawPetal(p);
    });

    requestAnimationFrame(() => this.animate());
  }
}

// ═══════ SCROLL REVEAL ═══════
function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
  window._zenObserver = observer;
}

function reReveal() {
  document.querySelectorAll('[data-reveal]:not(.revealed)').forEach(el => {
    if (window._zenObserver) window._zenObserver.observe(el);
  });
}

// ═══════ CATEGORIES ═══════
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const sections = document.querySelectorAll('.section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const cat = tab.dataset.cat;
      
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      sections.forEach(s => {
        if (s.id === cat) {
          s.classList.add('active');
          s.querySelectorAll('[data-reveal]').forEach(el => {
            el.classList.remove('revealed');
          });
          setTimeout(() => reReveal(), 50);
        } else {
          s.classList.remove('active');
        }
      });
    });
  });
}

// ═══════ GENTLE 3D TILT ═══════
function initCardTilt() {
  const cards = document.querySelectorAll('.item');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      if (!card.classList.contains('revealed')) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -3;
      const rotateY = ((x - centerX) / centerX) * 3;
      card.style.transition = 'box-shadow 0.3s ease';
      card.style.transform = `translateY(-8px) translateZ(20px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = '';
      card.style.transform = '';
    });
  });
}

// ═══════ INK RIPPLE EFFECT ═══════
function initInkRipple() {
  document.addEventListener('click', (e) => {
    const ripple = document.createElement('div');
    ripple.className = 'ink-ripple';
    ripple.style.left = e.clientX + 'px';
    ripple.style.top = e.clientY + 'px';
    document.body.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

// ═══════ INIT ═══════
document.addEventListener('DOMContentLoaded', () => {
  new SakuraSystem(document.getElementById('sakuraCanvas'));
  initReveal();
  initTabs();
  initCardTilt();
  initInkRipple();

});
