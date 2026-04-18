/* ===================================================
   MASALA HOUSE — Slider + Interactivity
   =================================================== */
(() => {
  'use strict';

  /* ---------- DOM refs ---------- */
  const track    = document.getElementById('sliderTrack');
  const slides   = track.querySelectorAll('.slide');
  const btnPrev  = document.getElementById('btnPrev');
  const btnNext  = document.getElementById('btnNext');
  const btnCTA   = document.getElementById('btnViewMenu');
  const dotsWrap = document.getElementById('sliderDots');
  const dots     = dotsWrap.querySelectorAll('.dot');
  const menuNav  = document.getElementById('menuNav');
  const navBtns  = menuNav.querySelectorAll('.menu-nav__btn');
  const total    = slides.length;

  let current    = 0;
  let autoTimer  = null;
  let resumeTimer = null;

  /* ---------- Core navigation ---------- */
  function goToSlide(n) {
    if (n < 0 || n >= total) return;
    current = n;
    track.style.transform = `translateX(-${current * 100}vw)`;
    syncUI();
  }

  function syncUI() {
    /* Dots */
    dots.forEach((d, i) => d.classList.toggle('dot--active', i === current));

    /* Nav visibility */
    if (current === 0) {
      menuNav.classList.add('menu-nav--hidden');
    } else {
      menuNav.classList.remove('menu-nav--hidden');
    }

    /* Nav active button */
    navBtns.forEach(btn => {
      const target = +btn.dataset.slide;
      btn.classList.toggle('active', target === current);
    });
  }

  /* ---------- Arrows ---------- */
  btnPrev.addEventListener('click', () => { pauseAuto(); goToSlide(current - 1); scheduleResume(); });
  btnNext.addEventListener('click', () => { pauseAuto(); goToSlide(current + 1); scheduleResume(); });

  /* ---------- CTA button ---------- */
  btnCTA.addEventListener('click', () => { pauseAuto(); goToSlide(1); scheduleResume(); });

  /* ---------- Dots ---------- */
  dots.forEach(d => d.addEventListener('click', () => {
    pauseAuto();
    goToSlide(+d.dataset.slide);
    scheduleResume();
  }));

  /* ---------- Nav buttons ---------- */
  navBtns.forEach(btn => btn.addEventListener('click', () => {
    pauseAuto();
    goToSlide(+btn.dataset.slide);
    scheduleResume();
  }));

  /* ---------- Keyboard ---------- */
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { pauseAuto(); goToSlide(current + 1); scheduleResume(); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { pauseAuto(); goToSlide(current - 1); scheduleResume(); }
  });

  /* ---------- Touch / swipe ---------- */
  let touchX = 0;
  track.addEventListener('touchstart', e => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 55) {
      pauseAuto();
      goToSlide(current + (diff > 0 ? 1 : -1));
      scheduleResume();
    }
  }, { passive: true });

  /* ---------- Auto-play ---------- */
  function startAuto() { autoTimer = setInterval(() => goToSlide((current + 1) % total), 4500); }
  function pauseAuto() { clearInterval(autoTimer); clearTimeout(resumeTimer); }
  function scheduleResume() { resumeTimer = setTimeout(startAuto, 8000); }

  /* ---------- Card hover parallax ---------- */
  document.querySelectorAll('.menu-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform .4s ease, box-shadow .4s ease, border-color .4s ease';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
    });
  });

  /* ---------- Init ---------- */
  goToSlide(0);
  startAuto();
})();
