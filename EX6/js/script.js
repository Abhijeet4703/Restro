/* =====================================================
   Royal Feast — Black & Gold Menu  |  script.js
   Full-page horizontal slider navigation
   ===================================================== */

(function () {
  'use strict';

  var track    = document.getElementById('sliderTrack');
  var dots     = document.querySelectorAll('.dot');
  var btnPrev  = document.getElementById('btnPrev');
  var btnNext  = document.getElementById('btnNext');
  var btnCover = document.getElementById('btnViewMenu');
  var menuNav  = document.getElementById('menuNav');
  var navBtns  = document.querySelectorAll('.menu-nav__btn');

  var TOTAL   = document.querySelectorAll('.slide').length;
  var current = 0;

  // ── Core: go to a slide ─────────────────────────────
  function goToSlide(n) {
    n = Math.max(0, Math.min(n, TOTAL - 1));
    current = n;

    track.style.transform = 'translateX(-' + (n * 100) + 'vw)';

    dots.forEach(function (dot) {
      dot.classList.toggle('dot--active', parseInt(dot.dataset.slide, 10) === n);
    });

    menuNav.classList.toggle('menu-nav--hidden', n === 0);

    navBtns.forEach(function (btn) {
      btn.classList.toggle('active', parseInt(btn.dataset.slide, 10) === n);
    });

    btnPrev.classList.toggle('slider-arrow--hidden', n === 0);
    btnNext.classList.toggle('slider-arrow--hidden', n === TOTAL - 1);

    var slideEl = track.children[n];
    if (slideEl) slideEl.scrollTop = 0;
  }

  // ── Keyboard ──────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.target !== document.body && e.target !== document.documentElement) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goToSlide(current + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goToSlide(current - 1); }
  });

  // ── Touch / swipe ──────────────────────────────────────
  var touchStartX = 0, touchStartY = 0;
  document.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 55) {
      if (dx < 0) goToSlide(current + 1);
      else        goToSlide(current - 1);
    }
  }, { passive: true });

  // ── Wire controls ─────────────────────────────────────
  btnPrev.addEventListener('click', function () { goToSlide(current - 1); });
  btnNext.addEventListener('click', function () { goToSlide(current + 1); });
  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      goToSlide(parseInt(dot.dataset.slide, 10));
    });
  });
  navBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      goToSlide(parseInt(btn.dataset.slide, 10));
    });
  });
  if (btnCover) {
    btnCover.addEventListener('click', function () { goToSlide(1); });
  }

  // ── Init ──────────────────────────────────────────────
  goToSlide(0);

}());