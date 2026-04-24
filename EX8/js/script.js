/* ================================================================
   LUSCIOUS — Interactive Menu Navigation
   ================================================================ */

(function() {
  'use strict';

  // DOM Elements
  const screens = {
    1: document.getElementById('screen-1'),
    2: document.getElementById('screen-2'),
    3: document.getElementById('screen-3')
  };

  const slideBtn = document.getElementById('slideBtn');
  const closeBtn = document.getElementById('closeBtn');
  const lockBtn = document.querySelector('.lock-btn');
  const categoryItems = document.querySelectorAll('.category-item');
  const menuItemGroups = document.querySelectorAll('.menu-item-group');

  let currentScreen = 1;

  /* ================================================================
     SCREEN NAVIGATION
     ================================================================ */

  function showScreen(screenNum) {
    console.log('Showing screen:', screenNum);
    
    // Hide all screens
    Object.values(screens).forEach(screen => {
      if (screen) screen.classList.remove('active');
    });
    
    // Show the desired screen
    if (screens[screenNum]) {
      screens[screenNum].classList.add('active');
    }
    
    currentScreen = screenNum;
  }

  // Button click handlers
  if (slideBtn) {
    slideBtn.addEventListener('click', function() {
      console.log('Slide button clicked');
      showScreen(2);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      console.log('Close button clicked');
      showScreen(2);
    });
  }

  if (lockBtn) {
    lockBtn.addEventListener('click', function() {
      console.log('Lock button clicked');
      showScreen(3);
    });
  }

  /* ================================================================
     CATEGORY FILTERING
     ================================================================ */

  categoryItems.forEach(function(item) {
    item.addEventListener('click', function() {
      // Remove active class from all categories
      categoryItems.forEach(function(cat) {
        cat.classList.remove('active');
      });
      
      // Add active class to clicked category
      item.classList.add('active');
      
      // Get the category name
      const category = item.getAttribute('data-category');
      console.log('Category selected:', category);
      
      // Hide all menu item groups
      menuItemGroups.forEach(function(group) {
        group.classList.add('hidden');
      });
      
      // Show the selected category
      const selectedGroup = document.querySelector('.menu-item-group[data-group="' + category + '"]');
      if (selectedGroup) {
        selectedGroup.classList.remove('hidden');
      }
    });
  });

  /* ================================================================
     KEYBOARD NAVIGATION
     ================================================================ */

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight') {
      if (currentScreen < 3) showScreen(currentScreen + 1);
    }
    if (e.key === 'ArrowLeft') {
      if (currentScreen > 1) showScreen(currentScreen - 1);
    }
    if (e.key === 'Escape') {
      if (currentScreen === 3) showScreen(2);
    }
  });

  /* ================================================================
     TOUCH SWIPE SUPPORT
     ================================================================ */

  let touchStartX = 0;
  let touchEndX = 0;

  document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
  }, false);

  document.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, false);

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swiped left - next screen
        if (currentScreen < 3) showScreen(currentScreen + 1);
      } else {
        // Swiped right - previous screen
        if (currentScreen > 1) showScreen(currentScreen - 1);
      }
    }
  }

  // Initialize - show screen 1
  showScreen(1);
  console.log('Script loaded successfully');

})();
