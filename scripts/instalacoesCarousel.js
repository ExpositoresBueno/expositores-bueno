const carousel = document.getElementById('projects-carousel');
const track = document.getElementById('projects-track');
const emptyState = document.getElementById('projects-carousel-empty');
const lightbox = document.getElementById('projects-lightbox');
const lightboxImage = document.getElementById('projects-lightbox-image');
const lightboxClose = document.getElementById('projects-lightbox-close');

const EXTENSIONS_PRIORITY = ['webp', 'jpg', 'jpeg'];

const imageExists = (src) =>
  new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve(true);
    probe.onerror = () => resolve(false);
    probe.src = src;
  });

const pickExistingSource = async (sources) => {
  for (const src of sources) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await imageExists(src);
    if (exists) return src;
  }
  return null;
};

const createCardElement = (src, index) => {
  const card = document.createElement('button');
  card.className = 'project-card';
  card.type = 'button';
  card.setAttribute('aria-label', `Ampliar obra finalizada ${index}`);

  const image = document.createElement('img');
  image.src = src;
  image.alt = `Obra finalizada ${index}`;

  card.appendChild(image);
  return card;
};

const createCandidateSources = (baseName, maxImages) => {
  const sources = [];

  for (let i = 1; i <= maxImages; i += 1) {
    const fileBase = `../images/${baseName} (${i})`;
    sources.push(EXTENSIONS_PRIORITY.map((ext) => `${fileBase}.${ext}`));
  }

  return sources;
};

const initCarousel = () => {
  const originalCards = Array.from(track.querySelectorAll('.project-card'));
  let animationFrame = null;
  let lastFrameTime = 0;
  const speedPxPerSecond = 42;

  const duplicatedCards = originalCards.map((card) => {
    const clone = card.cloneNode(true);
    clone.dataset.clone = 'true';
    track.appendChild(clone);
    return clone;
  });

  const allCards = [...originalCards, ...duplicatedCards];

  const getLoopPoint = () => track.scrollWidth / 2;

  const stopAutoplay = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  };

  const autoplay = (timestamp) => {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const deltaInSeconds = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    if (!lightbox?.classList.contains('is-open')) {
      carousel.scrollLeft += speedPxPerSecond * deltaInSeconds;
      const loopPoint = getLoopPoint();
      if (carousel.scrollLeft >= loopPoint) {
        carousel.scrollLeft -= loopPoint;
      }
    }

    animationFrame = requestAnimationFrame(autoplay);
  };

  const startAutoplay = () => {
    stopAutoplay();
    lastFrameTime = 0;
    animationFrame = requestAnimationFrame(autoplay);
  };

  const openLightbox = (card) => {
    const image = card.querySelector('img');
    if (!image || !lightbox || !lightboxImage) return;

    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
  };

  allCards.forEach((card) => {
    card.addEventListener('click', () => openLightbox(card));
  });

  lightboxClose?.addEventListener('click', closeLightbox);

  lightbox?.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
  });

  startAutoplay();
};

const bootstrapProjectsGallery = async () => {
  if (!carousel || !track) return;

  const baseName = track.dataset.baseName || 'lojasprontas';
  const maxImages = Number(track.dataset.maxImages || 30);
  const candidates = createCandidateSources(baseName, maxImages);

  const foundSources = [];

  for (const sourceOptions of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const source = await pickExistingSource(sourceOptions);
    if (source) foundSources.push(source);
  }

  if (foundSources.length === 0) {
    carousel.hidden = true;
    emptyState?.removeAttribute('hidden');
    return;
  }

  track.innerHTML = '';
  foundSources.forEach((src, index) => {
    track.appendChild(createCardElement(src, index + 1));
  });

  initCarousel();
};

bootstrapProjectsGallery();
