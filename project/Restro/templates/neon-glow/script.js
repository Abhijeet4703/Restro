/* ═══════════════════════════════════════════════════════
   NEON GLOW — Interactive Script
   Matrix rain · Typed loading · Holo cards · Cart
   ═══════════════════════════════════════════════════════ */

// ═══════ MATRIX RAIN ═══════
class MatrixRain {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
    this.columns = [];
    this.fontSize = 12;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    const colCount = Math.floor(this.canvas.width / this.fontSize);
    this.columns = new Array(colCount).fill(0).map(() => Math.random() * -100);
  }

  animate() {
    this.ctx.fillStyle = 'rgba(5, 2, 13, 0.08)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.font = `${this.fontSize}px monospace`;
    
    this.columns.forEach((y, i) => {
      const char = this.chars[Math.floor(Math.random() * this.chars.length)];
      const x = i * this.fontSize;
      
      // Head character (bright)
      this.ctx.fillStyle = `rgba(0, 245, 255, ${Math.random() * 0.4 + 0.3})`;
      this.ctx.fillText(char, x, y);
      
      // Reset column randomly
      if (y > this.canvas.height && Math.random() > 0.975) {
        this.columns[i] = 0;
      }
      
      this.columns[i] = y + this.fontSize;
    });

    requestAnimationFrame(() => this.animate());
  }
}

// ═══════ TYPED TEXT LOADER ═══════
class TypedLoader {
  constructor() {
    this.el = document.getElementById('typedText');
    this.progressBar = document.getElementById('loaderProgress');
    this.messages = [
      'INITIALIZING MENU DATABASE...',
      'LOADING FOOD MODULES...',
      'CONNECTING TO KITCHEN...',
      'CALIBRATING TASTE SENSORS...',
      'SYSTEM READY'
    ];
    this.currentMsg = 0;
    this.currentChar = 0;
    this.progress = 0;
    this.start();
  }

  start() {
    this.typeNext();
  }

  typeNext() {
    if (this.currentMsg >= this.messages.length) {
      setTimeout(() => this.finalize(), 300);
      return;
    }

    const msg = this.messages[this.currentMsg];
    
    if (this.currentChar < msg.length) {
      this.el.textContent = msg.substring(0, this.currentChar + 1);
      this.currentChar++;
      
      // Update progress
      const totalChars = this.messages.reduce((sum, m) => sum + m.length, 0);
      this.progress += (100 / totalChars);
      this.progressBar.style.width = `${Math.min(this.progress, 100)}%`;
      
      setTimeout(() => this.typeNext(), 20 + Math.random() * 30);
    } else {
      this.currentMsg++;
      this.currentChar = 0;
      setTimeout(() => this.typeNext(), 400);
    }
  }

  finalize() {
    this.progressBar.style.width = '100%';
    setTimeout(() => {
      const loader = document.getElementById('loader');
      const wrapper = document.getElementById('menuWrapper');
      loader.classList.add('hidden');
      wrapper.classList.add('visible');
      revealCards();
    }, 500);
  }
}

// ═══════ SCROLL REVEAL ═══════
function revealCards() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.holo-card').forEach(card => observer.observe(card));
  window._cardObserver = observer;
}

function reRevealCards() {
  document.querySelectorAll('.holo-card:not(.revealed)').forEach(card => {
    if (window._cardObserver) window._cardObserver.observe(card);
  });
}

// ═══════ CATEGORIES ═══════
function initCategories() {
  const pills = document.querySelectorAll('.cat-pill');
  const sections = document.querySelectorAll('.menu-section');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const cat = pill.dataset.cat;
      
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      sections.forEach(s => {
        if (s.id === cat) {
          s.classList.add('active');
          // Re-trigger reveals
          s.querySelectorAll('.holo-card').forEach(card => {
            card.classList.remove('revealed');
          });
          setTimeout(() => reRevealCards(), 50);
        } else {
          s.classList.remove('active');
        }
      });
    });
  });
}

// ═══════ 3D TILT TRACKING ═══════
function init3DTilt() {
  const cards = document.querySelectorAll('.holo-card');
  const maxTilt = 10;

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateY = ((x - centerX) / centerX) * maxTilt;
      const rotateX = ((centerY - y) / centerY) * maxTilt;

      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(30px) scale(1.03)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ═══════ NEON TRAIL EFFECT ═══════
function initNeonTrail() {
  const wrapper = document.getElementById('menuWrapper');
  if (!wrapper) return;

  let lastTrail = 0;
  const colors = ['var(--cyan)', 'var(--magenta)', 'var(--yellow)'];

  wrapper.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastTrail < 50) return; // throttle to ~20fps
    lastTrail = now;

    const dot = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 4 + Math.random() * 4;

    Object.assign(dot.style, {
      position: 'fixed',
      left: `${e.clientX - size / 2}px`,
      top: `${e.clientY - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: color,
      boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`,
      pointerEvents: 'none',
      zIndex: '999',
      opacity: '0.8',
      transition: 'opacity 0.6s ease, transform 0.6s ease',
    });

    document.body.appendChild(dot);

    requestAnimationFrame(() => {
      dot.style.opacity = '0';
      dot.style.transform = `translateY(-10px) scale(0.3)`;
    });

    setTimeout(() => dot.remove(), 650);
  });
}

// ═══════ TYPING ANIMATION FOR CATEGORY SWITCH ═══════
function typeText(element, text, speed = 40) {
  element.textContent = '';
  let i = 0;
  function tick() {
    if (i < text.length) {
      element.textContent += text[i];
      i++;
      setTimeout(tick, speed);
    }
  }
  tick();
}

// Enhance category switch with typing effect
function enhanceCategorySwitch() {
  const pills = document.querySelectorAll('.cat-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const cat = pill.dataset.cat;
      const section = document.getElementById(cat);
      if (!section) return;
      const h2 = section.querySelector('.section-header h2');
      if (h2) {
        const original = h2.textContent;
        typeText(h2, original, 50);
      }
    });
  });
}

// ═══════ INIT ═══════
document.addEventListener('DOMContentLoaded', () => {
  new MatrixRain(document.getElementById('matrixCanvas'));
  new TypedLoader();
  initCategories();

  // Enhanced interactions — init after a delay so cards are ready
  setTimeout(() => {
    init3DTilt();
    initNeonTrail();
    enhanceCategorySwitch();
  }, 2500);

});
