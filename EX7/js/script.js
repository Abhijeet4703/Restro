(() => {
  /* ───────── INTRO → MENU TRANSITION ───────── */
  const introPage   = document.getElementById('introPage');
  const menuSlider  = document.getElementById('menuSlider');
  const btnEnter    = document.getElementById('btnEnterMenu');
  const btnBack     = document.getElementById('btnBack');

  function enterMenu() {
    introPage.classList.add('intro--exit');
    setTimeout(() => {
      introPage.style.display = 'none';
      menuSlider.classList.remove('hidden');
      menuSlider.classList.add('visible');
      document.getElementById('menuNav').classList.remove('menu-nav--hidden');
      goToSlide(0);
      document.body.style.overflow = 'hidden';
    }, 800);
  }

  function backToIntro() {
    menuSlider.classList.remove('visible');
    menuSlider.classList.add('hidden');
    introPage.style.display = '';
    introPage.classList.remove('intro--exit');
  }

  btnEnter.addEventListener('click', enterMenu);
  btnBack.addEventListener('click', backToIntro);

  /* ───────── SLIDER ───────── */
  const track    = document.getElementById('sliderTrack');
  const slides   = track.querySelectorAll('.slide');
  const dots     = document.querySelectorAll('.dot');
  const navBtns  = document.querySelectorAll('.menu-nav__btn');
  const btnPrev  = document.getElementById('btnPrev');
  const btnNext  = document.getElementById('btnNext');
  const TOTAL    = slides.length;
  let current    = 0;

  function goToSlide(n) {
    if (n < 0 || n >= TOTAL) return;
    current = n;
    track.style.transform = `translateX(-${n * 100}vw)`;

    // dots
    dots.forEach((d, i) => d.classList.toggle('dot--active', i === n));

    // nav
    navBtns.forEach((b, i) => b.classList.toggle('active', i === n));

    // arrows
    btnPrev.classList.toggle('slider-arrow--hidden', n === 0);
    btnNext.classList.toggle('slider-arrow--hidden', n === TOTAL - 1);

    // entrance animation
    animateSlide(n);
  }

  function animateSlide(n) {
    const els = slides[n].querySelectorAll('[data-aos]');
    els.forEach((el, i) => {
      el.classList.remove('aos-in');
      setTimeout(() => el.classList.add('aos-in'), 80 * i);
    });
  }

  /* Navigation */
  btnPrev.addEventListener('click', () => goToSlide(current - 1));
  btnNext.addEventListener('click', () => goToSlide(current + 1));
  dots.forEach(d => d.addEventListener('click', () => goToSlide(+d.dataset.slide)));
  navBtns.forEach(b => b.addEventListener('click', () => goToSlide(+b.dataset.slide)));

  /* Keyboard */
  document.addEventListener('keydown', e => {
    if (menuSlider.classList.contains('hidden')) return;
    if (e.key === 'ArrowRight') goToSlide(current + 1);
    if (e.key === 'ArrowLeft')  goToSlide(current - 1);
  });

  /* Touch / swipe */
  let touchX = 0;
  track.addEventListener('touchstart', e => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) {
      dx > 0 ? goToSlide(current - 1) : goToSlide(current + 1);
    }
  }, { passive: true });

  /* ───────── AMBIENT PARTICLES ───────── */
  const canvas = document.getElementById('ambientCanvas');
  const ctx    = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x  = Math.random() * canvas.width;
      this.y  = Math.random() * canvas.height;
      this.r  = Math.random() * 1.2 + .3;
      this.vx = (Math.random() - .5) * .15;
      this.vy = (Math.random() - .5) * .15;
      this.a  = Math.random() * .3 + .05;
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,169,126,${this.a})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 60; i++) particles.push(new Particle());

  (function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  })();
})();
