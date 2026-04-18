/* ===== Coffee Menu Data ===== */
const menuData = [
  {
    name: "Espresso",
    price: "$2.50",
    img: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=500&h=650&fit=crop",
    thumb: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=120&h=120&fit=crop"
  },
  {
    name: "Americano",
    price: "$3.00",
    img: "https://images.unsplash.com/photo-1551030173-122aabc4489c?w=500&h=650&fit=crop",
    thumb: "https://images.unsplash.com/photo-1551030173-122aabc4489c?w=120&h=120&fit=crop"
  },
  {
    name: "Latte",
    price: "$4.00",
    img: "https://images.unsplash.com/photo-1541167760496-9af0ab096558?w=500&h=650&fit=crop",
    thumb: "https://images.unsplash.com/photo-1541167760496-9af0ab096558?w=120&h=120&fit=crop"
  },
  {
    name: "Cappuccino",
    price: "$4.00",
    img: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&h=650&fit=crop",
    thumb: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=120&h=120&fit=crop"
  },
  {
    name: "Flat White",
    price: "$4.00",
    img: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=500&h=650&fit=crop",
    thumb: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=120&h=120&fit=crop"
  },
  {
    name: "Macchiato",
    price: "$4.00",
    img: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=500&h=650&fit=crop",
    thumb: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=120&h=120&fit=crop"
  },
  {
    name: "Tea",
    price: "$3.00",
    img: "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=500&h=650&fit=crop",
    thumb: "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=120&h=120&fit=crop"
  },
  {
    name: "Hot Chocolate",
    price: "$4.50",
    img: "https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=500&h=650&fit=crop",
    thumb: "https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=120&h=120&fit=crop"
  },
  {
    name: "Matcha Latte",
    price: "$4.50",
    img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&h=650&fit=crop",
    thumb: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=120&h=120&fit=crop"
  },
  {
    name: "Chai Latte",
    price: "$4.50",
    img: "https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?w=500&h=650&fit=crop",
    thumb: "https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?w=120&h=120&fit=crop"
  },
  {
    name: "Croissant",
    price: "$3.50",
    img: "https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=500&h=650&fit=crop",
    thumb: "https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=120&h=120&fit=crop"
  }
];

/* ===== DOM Elements ===== */
const featureImg = document.getElementById("featureImg");
const featureLabel = document.getElementById("featureLabel");
const thumbCarousel = document.getElementById("thumbCarousel");
const thumbItems = document.querySelectorAll(".thumb-item");
const menuItems = document.querySelectorAll(".menu-item");

let activeIndex = 0;

/* ===== Select Item (synchronized update) ===== */
function selectItem(index) {
  if (index === activeIndex) return;
  activeIndex = index;
  const item = menuData[index];

  // 1. Animate feature image out, then swap
  featureImg.classList.add("fade-out");
  setTimeout(() => {
    featureImg.src = item.img;
    featureImg.alt = item.name;
    featureLabel.textContent = item.name;
    featureImg.classList.remove("fade-out");
  }, 300);

  // 2. Highlight active thumbnail
  thumbItems.forEach((t) => t.classList.remove("active"));
  const activeThumb = document.querySelector(`.thumb-item[data-index="${index}"]`);
  if (activeThumb) {
    activeThumb.classList.add("active");
    activeThumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  // 3. Highlight active menu item
  menuItems.forEach((m) => m.classList.remove("active"));
  const activeMenu = document.querySelector(`.menu-item[data-index="${index}"]`);
  if (activeMenu) {
    activeMenu.classList.add("active");
  }
}

/* ===== Thumbnail Click ===== */
thumbItems.forEach((thumb) => {
  thumb.addEventListener("click", () => {
    const idx = parseInt(thumb.dataset.index, 10);
    selectItem(idx);
  });
});

/* ===== Menu Item Click ===== */
menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    const idx = parseInt(item.dataset.index, 10);
    selectItem(idx);
  });
});

/* ===== Thumbnail Carousel Arrows ===== */
const thumbArrowLeft = document.querySelector(".thumb-arrow-left");
const thumbArrowRight = document.querySelector(".thumb-arrow-right");
const scrollAmount = 260;

thumbArrowLeft.addEventListener("click", () => {
  thumbCarousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
});

thumbArrowRight.addEventListener("click", () => {
  thumbCarousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
});

/* ===== Hero Carousel (simple rotate) ===== */
const heroCards = document.querySelectorAll(".hero-card");
const heroArrowLeft = document.querySelector(".hero-arrow-left");
const heroArrowRight = document.querySelector(".hero-arrow-right");
let heroCenterIndex = 1;

function updateHeroCarousel() {
  heroCards.forEach((card, i) => {
    card.classList.remove("hero-card-center");
    card.style.opacity = "0.55";
    card.style.transform = "scale(0.85)";
  });
  heroCards[heroCenterIndex].classList.add("hero-card-center");
  heroCards[heroCenterIndex].style.opacity = "1";
  heroCards[heroCenterIndex].style.transform = "scale(1)";
}

heroArrowLeft.addEventListener("click", () => {
  heroCenterIndex = (heroCenterIndex - 1 + heroCards.length) % heroCards.length;
  updateHeroCarousel();
});

heroArrowRight.addEventListener("click", () => {
  heroCenterIndex = (heroCenterIndex + 1) % heroCards.length;
  updateHeroCarousel();
});

/* ===== Keyboard Navigation ===== */
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") {
    selectItem(Math.max(0, activeIndex - 1));
  } else if (e.key === "ArrowRight") {
    selectItem(Math.min(menuData.length - 1, activeIndex + 1));
  }
});
