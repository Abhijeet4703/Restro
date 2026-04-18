// Notebook Menu — Arrow Navigation

const pages = document.querySelectorAll('.page');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const dotsContainer = document.getElementById('pageDots');
const totalPages = pages.length;
let currentIndex = 0;

// Build dots
for (let i = 0; i < totalPages; i++) {
  const dot = document.createElement('span');
  dot.classList.add('dot');
  if (i === 0) dot.classList.add('active');
  dot.addEventListener('click', () => goToPage(i));
  dotsContainer.appendChild(dot);
}
const dots = dotsContainer.querySelectorAll('.dot');

function goToPage(index) {
  if (index < 0 || index >= totalPages) return;

  // Deactivate all
  pages.forEach(p => {
    p.classList.remove('active');
    p.style.position = 'absolute';
  });
  dots.forEach(d => d.classList.remove('active'));

  // Activate target
  currentIndex = index;
  pages[currentIndex].classList.add('active');
  pages[currentIndex].style.position = 'relative';
  dots[currentIndex].classList.add('active');

  // Arrow visibility
  prevBtn.classList.toggle('disabled', currentIndex === 0);
  nextBtn.classList.toggle('disabled', currentIndex === totalPages - 1);
}

prevBtn.addEventListener('click', () => goToPage(currentIndex - 1));
nextBtn.addEventListener('click', () => goToPage(currentIndex + 1));

// Keyboard support
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') goToPage(currentIndex - 1);
  if (e.key === 'ArrowRight') goToPage(currentIndex + 1);
});

// Init
goToPage(0);
