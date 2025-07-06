let isDragging = false;
let dragElement = null;
let dragOffset = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };
let lastPosition = { x: 0, y: 0 };
let lastTime = 0;

// Color palette from CSS variables
const colorPalette = [
  'var(--celestial-blue)',
  'var(--lavender-pink)', 
  'var(--flame)',
  'var(--sgbus-green)',
  'var(--icterine)'
];

function getRandomColor() {
  return colorPalette[Math.floor(Math.random() * colorPalette.length)];
}

// Main click handler
document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', function(event) {
    const element = event.target;
    
    // If clicked element is not interactive, check if parent is
    let targetElement = element;
    while (targetElement && !targetElement.classList.contains('interactive-element')) {
      targetElement = targetElement.parentElement;
    }
    
    if (targetElement && targetElement.classList.contains('interactive-element')) {
      handleElementClick(targetElement);
    }
  });
});

function handleElementClick(element) {
  // Don't process clicks if we're dragging
  if (isDragging) return;
  
  // Initialize if needed
  if (!element.dataset.clickCount) {
    element.dataset.clickCount = "0";
    // Store original source for images
    if (element.tagName === 'IMG') {
      element.dataset.originalSrc = element.src;
    }
  }
  
  let clickCount = parseInt(element.dataset.clickCount);
  clickCount++;
  element.dataset.clickCount = clickCount;
  
  const elementName = element.tagName + (element.className ? '.' + element.className.replace(/\s+/g, '.') : '');
  console.log(`Element clicked ${clickCount} times:`, elementName);
  
  if (clickCount === 1) {
    // Switch to wireframe
    switchToWireframe(element);
  } else if (clickCount === 2) {
    // Make it draggable
    makePhysicsElement(element);
  }
}

function switchToWireframe(element) {
  // Remove all styling - animations, borders, backgrounds, etc.
  element.style.setProperty('animation', 'none', 'important');
  element.style.setProperty('border', 'none', 'important');
  element.style.setProperty('box-shadow', 'none', 'important');
  element.style.setProperty('border-radius', '0', 'important');
  element.style.setProperty('background', 'none', 'important');
  element.style.setProperty('background-color', 'transparent', 'important');
  element.style.setProperty('filter', 'none', 'important');
  element.style.setProperty('transform', 'none', 'important');
  element.style.setProperty('image-rendering', 'auto', 'important');
  element.style.setProperty('clip-path', 'none', 'important');
  
  if (element.tagName === 'IMG') {
    // Use wireframe src for images
    if (element.dataset.wireframeSrc) {
      element.src = element.dataset.wireframeSrc;
      element.style.objectFit = 'fill';
    }
  } else {
    // Store original dimensions before clearing content
    const originalWidth = element.offsetWidth;
    const originalHeight = element.offsetHeight;
    
    // For non-img elements, use wireframe src as background
    if (element.dataset.wireframeSrc) {
      element.innerHTML = '';
      element.style.setProperty('background', `url("${element.dataset.wireframeSrc}")`, 'important');
      element.style.backgroundSize = '100% 100%';
      element.style.backgroundPosition = 'center';
      element.style.width = originalWidth + 'px';
      element.style.height = originalHeight + 'px';
    } else {
      // Fallback to placeholder
      const width = originalWidth || 200;
      const height = originalHeight || 60;
      element.innerHTML = '';
      element.style.setProperty('background', `url("https://placehold.co/${width}x${height}/transparent/white?text=[IMAGE]&font=roboto")`, 'important');
      element.style.backgroundSize = 'cover';
      element.style.width = width + 'px';
      element.style.height = height + 'px';
    }
  }
  console.log('Switched to wireframe');
}

function makePhysicsElement(element) {
  element.classList.add('physics-element');
  makeDraggable(element);
  startGravity(element);
  console.log('Made draggable with gravity');
  checkAllElementsDropped();
}

function makeDraggable(element) {
  element.addEventListener('mousedown', function(e) {
    isDragging = true;
    dragElement = element;
    dragOffset.x = e.clientX - element.offsetLeft;
    dragOffset.y = e.clientY - element.offsetTop;
    element.style.zIndex = '1000';
    
    // Initialize velocity tracking
    lastPosition.x = e.clientX;
    lastPosition.y = e.clientY;
    lastTime = Date.now();
    
    // Prevent the click event from firing
    e.preventDefault();
    e.stopPropagation();
  });
}

// Mouse move handler
document.addEventListener('mousemove', function(e) {
  if (isDragging && dragElement) {
    dragElement.style.left = (e.clientX - dragOffset.x) + 'px';
    dragElement.style.top = (e.clientY - dragOffset.y) + 'px';
    
    // Track velocity for throwing
    const now = Date.now();
    const dt = now - lastTime;
    
    if (dt > 0) {
      velocity.x = (e.clientX - lastPosition.x) / dt * 10;
      velocity.y = (e.clientY - lastPosition.y) / dt * 10;
    }
    
    lastPosition.x = e.clientX;
    lastPosition.y = e.clientY;
    lastTime = now;
  }
});

// Mouse up handler with throwing
document.addEventListener('mouseup', function() {
  if (isDragging && dragElement) {
    dragElement.style.zIndex = '100';
    
    // If there's enough velocity, start throwing
    if (Math.abs(velocity.x) > 2 || Math.abs(velocity.y) > 2) {
      throwElement(dragElement);
    }
    
    isDragging = false;
    dragElement = null;
  }
});

function startGravity(element) {
  // Store gravity state on the element
  element.gravityActive = true;
  element.gravityVelocity = { x: 0, y: 0 };
  
  function gravityStep() {
    if (!element.gravityActive || isDragging && dragElement === element) {
      requestAnimationFrame(gravityStep);
      return;
    }
    
    const currentLeft = parseFloat(element.style.left) || 0;
    const currentTop = parseFloat(element.style.top) || 0;
    
    // Apply gravity (downward acceleration)
    element.gravityVelocity.y += 0.5;
    
    // Apply air resistance
    element.gravityVelocity.x *= 0.98;
    element.gravityVelocity.y *= 0.995;
    
    // Calculate new position
    const newLeft = currentLeft + element.gravityVelocity.x;
    const newTop = currentTop + element.gravityVelocity.y;
    
    // Bounce off edges
    if (newLeft <= 0 || newLeft >= window.innerWidth - element.offsetWidth) {
      element.gravityVelocity.x *= -0.6;
    } else {
      element.style.left = newLeft + 'px';
    }
    
    // Hit the ground (bottom of browser window)
    const groundLevel = window.innerHeight - element.offsetHeight;
    if (newTop >= groundLevel) {
      element.style.top = groundLevel + 'px';
      element.gravityVelocity.y *= -0.4; // Bounce with energy loss
      element.gravityVelocity.x *= 0.8; // Friction on ground
    } else {
      element.style.top = newTop + 'px';
    }
    
    requestAnimationFrame(gravityStep);
  }
  
  gravityStep();
}

function throwElement(element) {
  // Transfer throw velocity to gravity velocity
  element.gravityVelocity.x = velocity.x;
  element.gravityVelocity.y = velocity.y;
}

// =====================================
// PARTICLE EXPLOSION SYSTEM
// =====================================
// To remove this feature, delete everything between these comment blocks

let particles = [];
let explosionTriggered = false;
let droppedElements = new Set();

class Particle {
  constructor(x, y, color, size = 8) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 30;
    this.vy = (Math.random() - 0.5) * 30 - 12;
    this.life = 1.0;
    this.decay = 0.003 + Math.random() * 0.005;
    this.color = '#FFD700';
    this.size = size;
    this.element = this.createElement();
  }

  createElement() {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.width = this.size + 'px';
    el.style.height = this.size + 'px';
    el.style.backgroundColor = this.color;
    el.style.pointerEvents = 'none';
    el.style.zIndex = '10000';
    el.style.borderRadius = '50%';
    el.style.boxShadow = '0 0 5px #FFD700';
    el.style.willChange = 'transform';
    el.style.transform = 'translateZ(0)';
    document.body.appendChild(el);
    return el;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.3; // gravity
    this.vx *= 0.99; // air resistance
    this.life -= this.decay;
    
    this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    this.element.style.opacity = this.life;
    
    if (this.life <= 0) {
      this.element.remove();
      return false;
    }
    return true;
  }
}

function createParticlesFromElement(element) {
  const rect = element.getBoundingClientRect();
  const particleCount = Math.min(60, Math.max(15, (rect.width * rect.height) / 800));
  
  for (let i = 0; i < particleCount; i++) {
    const x = rect.left + Math.random() * rect.width;
    const y = rect.top + Math.random() * rect.height;
    const color = '#FFD700';
    particles.push(new Particle(x, y, color, 4 + Math.random() * 6));
  }
  
  element.style.display = 'none';
}

function createBackgroundParticles() {
  const particleCount = 250;
  for (let i = 0; i < particleCount; i++) {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const color = '#FFD700';
    particles.push(new Particle(x, y, color, 3 + Math.random() * 4));
  }
  
  document.body.style.background = 'black';
}

function checkElementDropped(element) {
  if (element.classList.contains('physics-element')) {
    const elementBottom = parseFloat(element.style.top) + element.offsetHeight;
    const groundLevel = window.innerHeight - 10;
    
    if (elementBottom >= groundLevel && Math.abs(element.gravityVelocity.y) < 2) {
      droppedElements.add(element);
      checkAllElementsDropped();
    }
  }
}

function checkAllElementsDropped() {
  const totalInteractiveElements = document.querySelectorAll('.interactive-element').length;
  const totalPhysicsElements = document.querySelectorAll('.physics-element').length;
  const elementsLeft = totalInteractiveElements - totalPhysicsElements;
  
  console.log(`Interactive elements left to make draggable: ${elementsLeft} (${totalPhysicsElements}/${totalInteractiveElements})`);
  console.log('All interactive elements:', Array.from(document.querySelectorAll('.interactive-element')).map(el => el.tagName + '.' + el.className));
  
  if (totalPhysicsElements === totalInteractiveElements && totalInteractiveElements > 0 && !explosionTriggered) {
    explosionTriggered = true;
    console.log('All elements are now draggable! Starting explosion...');
    setTimeout(startExplosion, 1000);
  }
}

function startExplosion() {
  const elementsToExplode = Array.from(document.querySelectorAll('.interactive-element'));
  let elementIndex = 0;
  
  // Start background explosion immediately
  createBackgroundParticlesStaggered();
  
  function explodeNextElement() {
    if (elementIndex < elementsToExplode.length) {
      createParticlesFromElement(elementsToExplode[elementIndex]);
      elementIndex++;
      setTimeout(explodeNextElement, 250); // 150ms between individual elements
    }
  }
  
  explodeNextElement();
  animateParticles();
}

function createBackgroundParticlesStaggered() {
  const totalParticles = 250;
  const batchSize = 25;
  let created = 0;
  
  // Create starry sky background immediately
  createStarrySky();
  
  function createBatch() {
    for (let i = 0; i < batchSize && created < totalParticles; i++) {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      const color = '#FFD700';
      particles.push(new Particle(x, y, color, 3 + Math.random() * 4));
      created++;
    }
    
    if (created < totalParticles) {
      setTimeout(createBatch, 30);
    }
  }
  
  createBatch();
}

function createStarrySky() {
  const starCount = 200;
  const starContainer = document.createElement('div');
  starContainer.style.position = 'fixed';
  starContainer.style.top = '0';
  starContainer.style.left = '0';
  starContainer.style.width = '100%';
  starContainer.style.height = '100%';
  starContainer.style.zIndex = '-1';
  starContainer.style.background = 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)';
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.style.position = 'absolute';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.width = Math.random() * 3 + 1 + 'px';
    star.style.height = star.style.width;
    star.style.backgroundColor = '#FFF';
    star.style.borderRadius = '50%';
    star.style.opacity = Math.random() * 0.8 + 0.2;
    star.style.animation = `twinkle ${Math.random() * 3 + 2}s infinite`;
    starContainer.appendChild(star);
  }
  
  document.body.appendChild(starContainer);
  document.body.style.background = 'transparent';
}

function animateParticles() {
  particles = particles.filter(particle => particle.update());
  
  if (particles.length > 0) {
    requestAnimationFrame(animateParticles);
  }
}

// =====================================
// END PARTICLE EXPLOSION SYSTEM
// =====================================