const carousel = document.getElementById('history-carousel');
const track = document.getElementById('history-track');
const emptyState = document.getElementById('history-carousel-empty');

const EXTENSIONS_PRIORITY = ['jpeg', 'jpg', 'webp', 'png'];

const HISTORIA_FILES = [
  '6736 (1).jpg',
  '6736 (2).jpg',
  '6736 (3).jpg',
  '6736 (4).jpg',
  'ANTIGAS (2).jpg',
  'boqueirao (1).jpg',
  'boqueirao (2).jpg',
  'feira.jpg',
  'folder.jpg',
  'logo3 (1).jpg',
  'logo3 (2).JPG',
  'loja6584 (1).JPG',
  'loja6584 (1).png',
  'loja6584 (2).jpg',
  'loja6584 (3).jpg',
  'loja6584 (4).jpg',
  'loja6584 (5).jpg',
  'loja6584 (6).jpg',
  'principal.png',
  'silvajardim.png',
  'uniforme.jpg',
];

const lightbox = document.getElementById('history-lightbox');
const lightboxImage = document.getElementById('history-lightbox-image');
const lightboxClose = document.getElementById('history-lightbox-close');
const lightboxNext = document.getElementById('history-lightbox-next');

const createCardElement = (source, index) => {
  if (!source) return null;

  const card = document.createElement('button');
  card.className = 'history-card';
  card.type = 'button';
  card.setAttribute('aria-label', `Ampliar foto histórica ${index}`);

  const image = document.createElement('img');
  image.src = source;
  image.alt = `Foto histórica ${index}`;
  image.loading = index <= 6 ? 'eager' : 'lazy';
  image.decoding = 'async';
  if (index <= 2) {
    image.fetchPriority = 'high';
  }

  card.appendChild(image);
  return card;
};

const createCandidateSources = (baseDir, maxImages) => {
  const explicitSources = HISTORIA_FILES.map((fileName) =>
    `../images/${baseDir}/${encodeURIComponent(fileName).replace(/%2F/g, '/')}`,
  );

  if (explicitSources.length) return explicitSources.map((source) => [source]);

  const sources = [];

  for (let i = 1; i <= maxImages; i += 1) {
    const fileBases = [
      `../images/${baseDir}/(${i})`,
      `../images/${baseDir}/${i}`,
      `../images/${baseDir}/historia-${i}`,
      `../images/${baseDir}/historia (${i})`,
    ];

    const imageSources = fileBases.flatMap((fileBase) =>
      EXTENSIONS_PRIORITY.map((ext) => `${fileBase}.${ext}`),
    );

    sources.push(imageSources);
  }

  return sources;
};

const resolveBestSource = async (sources) => {
  for (const source of sources) {
    const loaded = await new Promise((resolve) => {
      const testImage = new Image();
      testImage.onload = () => resolve(source);
      testImage.onerror = () => resolve(null);
      testImage.src = source;
    });

    if (loaded) return loaded;
  }

  return null;
};

const initCarousel = () => {
  const originalCards = Array.from(track.querySelectorAll('.history-card'));
  if (!originalCards.length) return;

  let animationFrame = null;
  let lastFrameTime = 0;
  const speedPxPerSecond = 160;

  const duplicatedCards = originalCards.map((card) => {
    const clone = card.cloneNode(true);
    clone.dataset.clone = 'true';
    track.appendChild(clone);
    return clone;
  });


  let currentCardIndex = -1;

  const updateLightboxImage = (index) => {
    const card = originalCards[index];
    if (!card || !lightboxImage) return;

    const image = card.querySelector('img');
    if (!image) return;

    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    currentCardIndex = index;
  };

  const openLightbox = (card) => {
    if (!lightbox || !lightboxImage) return;

    const image = card.querySelector('img');
    if (!image) return;

    let cardIndex = originalCards.indexOf(card);
    if (cardIndex < 0) {
      cardIndex = originalCards.findIndex((originalCard) => {
        const originalImage = originalCard.querySelector('img');
        return originalImage?.src === image.src;
      });
    }

    if (cardIndex < 0) return;

    updateLightboxImage(cardIndex);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
  };

  const showNextImage = () => {
    if (!originalCards.length) return;

    const nextIndex = currentCardIndex < 0
      ? 0
      : (currentCardIndex + 1) % originalCards.length;

    updateLightboxImage(nextIndex);
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
  };

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
    }
    const loopPoint = getLoopPoint();
    if (carousel.scrollLeft >= loopPoint) {
      carousel.scrollLeft -= loopPoint;
    }

    animationFrame = requestAnimationFrame(autoplay);
  };

  const startAutoplay = () => {
    stopAutoplay();
    lastFrameTime = 0;
    animationFrame = requestAnimationFrame(autoplay);
  };

  startAutoplay();

  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);

  const allCards = [...originalCards, ...duplicatedCards];
  allCards.forEach((card) => {
    card.addEventListener('click', () => openLightbox(card));
    card.addEventListener('focusin', stopAutoplay);
    card.addEventListener('focusout', startAutoplay);
  });

  lightboxClose?.addEventListener('click', closeLightbox);
  lightboxNext?.addEventListener('click', showNextImage);

  lightbox?.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();

    if (event.key === 'ArrowRight' && lightbox?.classList.contains('is-open')) {
      showNextImage();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoplay();
      return;
    }

    startAutoplay();
  });
};

const bootstrapHistoryGallery = async () => {
  if (!carousel || !track) return;

  const baseDir = track.dataset.baseDir || 'HISTORIA';
  const maxImages = Number(track.dataset.maxImages || 20);

  const explicitSources = HISTORIA_FILES
    .map((fileName) => `../images/${baseDir}/${encodeURIComponent(fileName).replace(/%2F/g, '/')}`)
    .reverse();

  if (explicitSources.length) {
    track.innerHTML = '';
    explicitSources.forEach((source, index) => {
      const card = createCardElement(source, index + 1);
      if (card) track.appendChild(card);
    });

    if (!track.querySelector('.history-card')) {
      carousel.hidden = true;
      emptyState?.removeAttribute('hidden');
      return;
    }

    initCarousel();
    return;
  }

  const candidates = createCandidateSources(baseDir, maxImages);

  track.innerHTML = '';

  let consecutiveMisses = 0;
  const maxConsecutiveMisses = HISTORIA_FILES.length ? Number.POSITIVE_INFINITY : 6;

  for (let index = 0; index < candidates.length; index += 1) {
    const source = await resolveBestSource(candidates[index]);

    if (!source) {
      consecutiveMisses += 1;
      if (consecutiveMisses >= maxConsecutiveMisses) break;
      continue;
    }

    consecutiveMisses = 0;
    const card = createCardElement(source, index + 1);
    if (card) track.appendChild(card);
  }

  if (!track.querySelector('.history-card')) {
    carousel.hidden = true;
    emptyState?.removeAttribute('hidden');
    return;
  }

  initCarousel();
};

bootstrapHistoryGallery();
