/* ═══════════════════════════════════════════════════════
   VINTAGE PAPER — Interactive Script
   Typewriter text · Scroll reveal · Sections · Cart
   ═══════════════════════════════════════════════════════ */

// ═══════ TYPEWRITER EFFECT ═══════
class Typewriter {
  constructor() {
    const headline = document.querySelector('.typewriter');
    if (!headline) return;
    
    const text = headline.dataset.text;
    headline.textContent = '';
    headline.style.borderRight = '2px solid var(--ink)';
    
    let i = 0;
    const type = () => {
      if (i < text.length) {
        headline.textContent += text[i];
        i++;
        setTimeout(type, 30 + Math.random() * 40);
      } else {
        // Remove cursor after typing
        setTimeout(() => { headline.style.borderRight = 'none'; }, 1000);
      }
    };
    
    // Start after a delay
    setTimeout(type, 500);
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
  window._vintageObserver = observer;
}

function reReveal() {
  document.querySelectorAll('[data-reveal]:not(.revealed)').forEach(el => {
    if (window._vintageObserver) window._vintageObserver.observe(el);
  });
}

// ═══════ SECTIONS ═══════
function initSections() {
  const btns = document.querySelectorAll('.sec-btn');
  const secs = document.querySelectorAll('.sec');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Find current active section for page-turn-out
      const currentSec = document.querySelector('.sec.active');
      const nextSec = document.getElementById(cat);

      if (currentSec && currentSec !== nextSec) {
        // Animate outgoing page
        currentSec.classList.add('page-turn-out');
        currentSec.addEventListener('animationend', function handler() {
          currentSec.removeEventListener('animationend', handler);
          currentSec.classList.remove('active', 'page-turn-out');
          currentSec.style.transform = '';

          // Animate incoming page
          nextSec.classList.add('active', 'page-turn-in');
          nextSec.querySelectorAll('[data-reveal]').forEach(el => el.classList.remove('revealed'));
          setTimeout(() => reReveal(), 50);
          nextSec.addEventListener('animationend', function handler2() {
            nextSec.removeEventListener('animationend', handler2);
            nextSec.classList.remove('page-turn-in');
            nextSec.style.transform = '';
            // Re-bind 3D tilt for new cards
            if (typeof init3DTilt === 'function') init3DTilt();
          }, { once: true });
        }, { once: true });
      } else if (!currentSec) {
        // No current section, just show
        nextSec.classList.add('active');
        nextSec.querySelectorAll('[data-reveal]').forEach(el => el.classList.remove('revealed'));
        setTimeout(() => reReveal(), 50);
      }
    });
  });
}

// ═══════ 3D TILT ON CARDS ═══════
function init3DTilt() {
  const MAX_DEG = 5;
  document.querySelectorAll('.story, .classified').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5; // -0.5 to 0.5
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      const rotateY = x * MAX_DEG * 2;  // left-right tilt
      const rotateX = -y * MAX_DEG * 2; // up-down tilt
      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(12px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ═══════ INIT ═══════
document.addEventListener('DOMContentLoaded', () => {
  new Typewriter();
  initReveal();
  initSections();
  init3DTilt();

});
