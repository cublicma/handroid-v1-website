const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const root = document.documentElement;
const header = document.querySelector("[data-header]");
const mobileNavToggle = document.querySelector("[data-mobile-nav-toggle]");
const mobileNavPanel = document.querySelector("[data-mobile-nav-panel]");
const hero = document.querySelector("[data-hero]");
const morph = document.querySelector("[data-morphology]");
const progressBar = document.querySelector("[data-progress-bar]");

let ticking = false;

const easeInOut = (progress) => (
  progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2
);

const sectionProgress = (section) => {
  const rect = section.getBoundingClientRect();
  const travel = Math.max(1, rect.height - window.innerHeight);
  return clamp((0 - rect.top) / travel);
};

const updateHero = () => {
  if (!hero) return;

  const progress = sectionProgress(hero);
  const fade = clamp(progress * 3.1);
  const shadeFade = clamp(progress * 4.8);
  root.style.setProperty("--hero-shade", String(1 - shadeFade * 0.68));
  root.style.setProperty("--title-y", `${-progress * 420}px`);
  root.style.setProperty("--title-opacity", String(1 - fade));
  root.style.setProperty("--cue-opacity", String(clamp(1 - progress * 3.2)));
};

const updateMorph = () => {
  if (!morph) return;

  const progress = sectionProgress(morph);
  const eased = easeInOut(progress);
  const humanoidActive = eased > 0.5;

  root.style.setProperty("--morph-progress", eased.toFixed(4));
  root.style.setProperty("--light-x", `${35 + eased * 42}%`);
  root.style.setProperty("--active-model", humanoidActive ? "1" : "0");
  root.style.setProperty("--dex-pointer", humanoidActive ? "none" : "auto");
  root.style.setProperty("--humanoid-pointer", humanoidActive ? "auto" : "none");
  root.style.setProperty("--dex-z", humanoidActive ? "10" : "20");
  root.style.setProperty("--humanoid-z", humanoidActive ? "20" : "10");

  if (progressBar) {
    progressBar.style.width = `${eased * 100}%`;
  }
};

const updateHeader = () => {
  header?.classList.toggle("is-light", window.scrollY > window.innerHeight * 0.72);
};

const update = () => {
  updateHero();
  updateMorph();
  updateHeader();
  ticking = false;
};

const requestUpdate = () => {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(update);
};

const setMobileNavigationOpen = (open) => {
  if (!mobileNavToggle || !mobileNavPanel) return;
  mobileNavToggle.setAttribute("aria-expanded", String(open));
  mobileNavToggle.setAttribute("aria-label", open ? "Close section navigation" : "Open section navigation");
  mobileNavPanel.hidden = !open;
};

mobileNavToggle?.addEventListener("click", () => {
  setMobileNavigationOpen(mobileNavToggle.getAttribute("aria-expanded") !== "true");
});

mobileNavPanel?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMobileNavigationOpen(false));
});

document.addEventListener("click", (event) => {
  if (!header || !mobileNavPanel || mobileNavPanel.hidden || header.contains(event.target)) return;
  setMobileNavigationOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mobileNavPanel && !mobileNavPanel.hidden) {
    setMobileNavigationOpen(false);
    mobileNavToggle?.focus();
  }
});

const carouselViewport = document.querySelector("[data-carousel]");
const carousel = document.querySelector("[data-carousel-track]");
const carouselRange = document.querySelector("[data-carousel-range]");
const lightbox = document.querySelector("[data-video-lightbox]");
const lightboxDialog = document.querySelector("[data-video-lightbox-dialog]");
const lightboxVideo = document.querySelector("[data-lightbox-video]");
const lightboxCloseButton = lightbox?.querySelector(".video-lightbox-close");
const copyButton = document.querySelector("[data-copy-bibtex]");
const copyLabel = copyButton?.querySelector("[data-copy-label]");
const bibtexCode = document.querySelector(".bibtex code");

let videoObserver;
let activeLightboxSource;
let activeLightboxWasPlaying = false;
let pendingLightboxTime = 0;
let copyResetTimer;

const prepareAutoplayVideo = (video) => {
  if (video.dataset.prepared === "true") return;

  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";
  video.playbackRate = Number(video.dataset.playbackRate || 1);

  video.querySelectorAll("source").forEach((source) => {
    source.dataset.src = source.getAttribute("src") || source.dataset.src;
    source.removeAttribute("src");
  });
  video.dataset.prepared = "true";
  video.load();
};

const loadVideo = (video) => {
  if (video.dataset.loaded === "true") return;

  video.querySelectorAll("source").forEach((source) => {
    source.setAttribute("src", source.dataset.src);
  });
  video.dataset.loaded = "true";
  video.load();
};

const playVisibleVideo = (video) => {
  loadVideo(video);
  video.playbackRate = Number(video.dataset.playbackRate || 1);
  const playPromise = video.play();
  if (playPromise) {
    playPromise.catch(() => {});
  }
};

const observeAutoplayVideo = (video) => {
  prepareAutoplayVideo(video);
  if (videoObserver) {
    videoObserver.observe(video);
  } else {
    playVisibleVideo(video);
  }
};

if ("IntersectionObserver" in window) {
  videoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        playVisibleVideo(video);
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.18, rootMargin: "420px 0px" });
}

document.querySelectorAll("video:not([data-lightbox-video])").forEach(observeAutoplayVideo);

document.querySelectorAll("[data-replay-button]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const scope = button.closest("[data-replay-scope]");
    if (!scope) return;

    scope.querySelectorAll("video").forEach((video) => {
      loadVideo(video);
      video.currentTime = 0;
      playVisibleVideo(video);
    });
  });
});

const lightboxSourceUrl = (video) => (
  video.currentSrc
  || video.querySelector("source")?.getAttribute("src")
  || video.querySelector("source")?.dataset.src
);

const videoTitle = (video) => {
  const section = video.closest(".demo-focus, .portrait-demo");
  const heading = section?.querySelector("h2, h3");
  const videos = Array.from(section?.querySelectorAll("video") || []);
  const index = videos.indexOf(video);
  const suffix = videos.length > 1 ? ` ${index + 1}` : "";
  return `${heading?.textContent.trim() || "Demo"}${suffix}`;
};

const updateLightboxAspect = (width = 16, height = 9) => {
  if (!lightboxDialog || !width || !height) return;
  const aspect = width / height;
  lightboxDialog.style.setProperty("--lightbox-aspect", aspect.toFixed(5));
  lightboxDialog.style.setProperty("--lightbox-width-limit", `${(86 * aspect).toFixed(3)}vh`);
  lightboxDialog.style.setProperty("--lightbox-mobile-width-limit", `${(82 * aspect).toFixed(3)}dvh`);
};

const openLightbox = (video) => {
  if (!lightbox || !lightboxVideo || !lightboxDialog) return;

  loadVideo(video);
  const sourceUrl = lightboxSourceUrl(video);
  if (!sourceUrl) return;

  activeLightboxSource = video;
  activeLightboxWasPlaying = !video.paused;
  pendingLightboxTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  video.pause();

  const title = video.dataset.videoTitle || videoTitle(video);
  lightboxDialog.setAttribute("aria-label", `${title} enlarged video player`);
  updateLightboxAspect(video.videoWidth || 16, video.videoHeight || 9);
  lightboxVideo.poster = video.poster;
  lightboxVideo.muted = video.muted;
  lightboxVideo.loop = true;
  lightboxVideo.defaultPlaybackRate = Number(video.dataset.playbackRate || video.playbackRate || 1);
  lightboxVideo.playbackRate = lightboxVideo.defaultPlaybackRate;
  lightboxVideo.src = sourceUrl;
  lightbox.hidden = false;
  document.body.classList.add("video-lightbox-open");
  lightboxVideo.load();
  const playPromise = lightboxVideo.play();
  if (playPromise) {
    playPromise.catch(() => {});
  }
  lightboxCloseButton?.focus({ preventScroll: true });
};

const closeLightbox = () => {
  if (!lightbox || !lightboxVideo || lightbox.hidden) return;

  const sourceVideo = activeLightboxSource;
  const resumeTime = lightboxVideo.currentTime;
  lightboxVideo.pause();
  lightbox.hidden = true;
  document.body.classList.remove("video-lightbox-open");
  lightboxVideo.removeAttribute("src");
  lightboxVideo.removeAttribute("poster");
  lightboxVideo.load();

  if (sourceVideo) {
    if (Number.isFinite(resumeTime) && sourceVideo.readyState > 0) {
      sourceVideo.currentTime = resumeTime;
    }

    const rect = sourceVideo.getBoundingClientRect();
    if (activeLightboxWasPlaying && rect.bottom > 0 && rect.top < window.innerHeight) {
      playVisibleVideo(sourceVideo);
    }
    sourceVideo.focus({ preventScroll: true });
  }

  activeLightboxSource = undefined;
  activeLightboxWasPlaying = false;
};

lightboxVideo?.addEventListener("loadedmetadata", () => {
  updateLightboxAspect(lightboxVideo.videoWidth, lightboxVideo.videoHeight);
  if (!Number.isFinite(lightboxVideo.duration)) return;
  lightboxVideo.currentTime = Math.min(pendingLightboxTime, Math.max(0, lightboxVideo.duration - 0.05));
});

document.querySelectorAll(".demo-focus video, .demo-carousel video").forEach((video) => {
  const title = videoTitle(video);
  video.dataset.videoExpand = "true";
  video.dataset.videoTitle = title;
  video.tabIndex = 0;
  video.setAttribute("role", "button");
  video.setAttribute("aria-label", `Enlarge ${title} video`);

  video.addEventListener("click", () => {
    if (carouselViewport?.dataset.suppressClick === "true") return;
    openLightbox(video);
  });

  video.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openLightbox(video);
  });
});

lightbox?.querySelectorAll("[data-video-lightbox-close]").forEach((control) => {
  control.addEventListener("click", closeLightbox);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox && !lightbox.hidden) {
    closeLightbox();
  }
});

const fallbackCopy = (text) => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) {
    throw new Error("Copy command failed");
  }
};

const showCopyResult = (copied) => {
  if (!copyButton || !copyLabel) return;
  if (copied) {
    copyButton.dataset.state = "copied";
    copyLabel.textContent = "Copied";
  } else {
    copyLabel.textContent = "Copy failed";
  }

  window.clearTimeout(copyResetTimer);
  copyResetTimer = window.setTimeout(() => {
    delete copyButton.dataset.state;
    copyLabel.textContent = "Copy";
  }, 1800);
};

copyButton?.addEventListener("click", () => {
  if (!bibtexCode || !copyLabel) return;

  const text = bibtexCode.textContent.trim();
  try {
    fallbackCopy(text);
    showCopyResult(true);
  } catch {
    if (!navigator.clipboard || !window.isSecureContext) {
      showCopyResult(false);
      return;
    }

    navigator.clipboard.writeText(text)
      .then(() => showCopyResult(true))
      .catch(() => showCopyResult(false));
  }
});

if (carousel && carouselViewport && carouselRange) {
  let carouselLastFrame = performance.now();
  let carouselHover = false;
  let carouselDragging = false;
  let carouselDidDrag = false;
  let carouselRangeActive = false;
  let carouselRangeFrame = 0;
  let carouselAnimationFrame = 0;
  let carouselDirection = 1;
  let carouselScrollLimit = 1;
  let carouselStartX = 0;
  let carouselStartScroll = 0;
  const carouselSpeed = 48;
  const carouselFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const carouselAutoEnabled = () => carouselFinePointer.matches && window.innerWidth > 720;

  const measureCarouselMaxScroll = () => {
    const nativeMax = Math.max(0, carouselViewport.scrollWidth - carouselViewport.clientWidth);
    const lastCard = carousel.lastElementChild;
    if (!lastCard) {
      carouselScrollLimit = Math.max(1, nativeMax);
    } else {
      const trackRect = carousel.getBoundingClientRect();
      const lastCardRect = lastCard.getBoundingClientRect();
      const endPadding = Number.parseFloat(getComputedStyle(carousel).paddingRight) || 0;
      const contentMax = lastCardRect.right - trackRect.left + endPadding - carouselViewport.clientWidth;
      carouselScrollLimit = Math.max(1, Math.min(nativeMax, Math.ceil(contentMax)));
    }

    carouselRange.max = String(carouselScrollLimit);
  };

  const carouselMaxScroll = () => carouselScrollLimit;

  const updateCarouselRange = () => {
    carouselRangeFrame = 0;
    const nextValue = String(Math.round(Math.min(carouselMaxScroll(), Math.max(0, carouselViewport.scrollLeft))));
    if (carouselRange.value !== nextValue) {
      carouselRange.value = nextValue;
    }
  };

  const scheduleCarouselRangeUpdate = () => {
    if (carouselRangeFrame) return;
    carouselRangeFrame = window.requestAnimationFrame(updateCarouselRange);
  };

  const animateCarousel = (time) => {
    carouselAnimationFrame = 0;
    if (!carouselAutoEnabled()) return;

    const deltaSeconds = Math.min(0.05, (time - carouselLastFrame) / 1000);
    carouselLastFrame = time;

    if (!carouselHover && !carouselDragging && !carouselRangeActive) {
      const maxScroll = carouselMaxScroll();
      const nextScroll = carouselViewport.scrollLeft + deltaSeconds * carouselSpeed * carouselDirection;
      if (nextScroll >= maxScroll) {
        carouselViewport.scrollLeft = maxScroll;
        carouselDirection = -1;
      } else if (nextScroll <= 0) {
        carouselViewport.scrollLeft = 0;
        carouselDirection = 1;
      } else {
        carouselViewport.scrollLeft = nextScroll;
      }
      scheduleCarouselRangeUpdate();
    }

    carouselAnimationFrame = window.requestAnimationFrame(animateCarousel);
  };

  const updateCarouselAutoMode = () => {
    if (!carouselAutoEnabled()) {
      if (carouselAnimationFrame) {
        window.cancelAnimationFrame(carouselAnimationFrame);
        carouselAnimationFrame = 0;
      }
      return;
    }

    if (!carouselAnimationFrame) {
      carouselLastFrame = performance.now();
      carouselAnimationFrame = window.requestAnimationFrame(animateCarousel);
    }
  };

  carouselViewport.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    carouselHover = true;
  });

  carouselViewport.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "mouse") return;
    carouselHover = false;
  });

  carouselViewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") return;
    carouselDragging = true;
    carouselDidDrag = false;
    carouselStartX = event.clientX;
    carouselStartScroll = carouselViewport.scrollLeft;
    carouselViewport.classList.add("is-dragging");
    carouselViewport.setPointerCapture(event.pointerId);
  });

  carouselViewport.addEventListener("pointermove", (event) => {
    if (!carouselDragging || event.pointerType !== "mouse") return;
    const distance = event.clientX - carouselStartX;
    carouselDidDrag ||= Math.abs(distance) > 6;
    carouselViewport.scrollLeft = carouselStartScroll - distance;
    scheduleCarouselRangeUpdate();
  });

  const stopCarouselDrag = (event) => {
    if (!carouselDragging) return;
    carouselDragging = false;
    carouselViewport.classList.remove("is-dragging");
    if (carouselDidDrag) {
      carouselViewport.dataset.suppressClick = "true";
      window.setTimeout(() => {
        delete carouselViewport.dataset.suppressClick;
      }, 0);
    }
    if (carouselViewport.hasPointerCapture(event.pointerId)) {
      carouselViewport.releasePointerCapture(event.pointerId);
    }
    carouselLastFrame = performance.now();
  };

  carouselViewport.addEventListener("pointerup", stopCarouselDrag);
  carouselViewport.addEventListener("pointercancel", stopCarouselDrag);

  carouselRange.addEventListener("pointerdown", () => {
    carouselRangeActive = true;
  });

  const stopCarouselRangeInteraction = () => {
    carouselRangeActive = false;
    carouselLastFrame = performance.now();
  };

  carouselRange.addEventListener("pointerup", stopCarouselRangeInteraction);
  carouselRange.addEventListener("pointercancel", stopCarouselRangeInteraction);
  carouselRange.addEventListener("change", stopCarouselRangeInteraction);
  carouselRange.addEventListener("blur", stopCarouselRangeInteraction);

  carouselRange.addEventListener("input", () => {
    carouselViewport.scrollLeft = Math.min(carouselMaxScroll(), Math.max(0, Number(carouselRange.value)));
    scheduleCarouselRangeUpdate();
  });

  carouselViewport.addEventListener("scroll", scheduleCarouselRangeUpdate, { passive: true });
  const syncCarouselMetrics = () => {
    measureCarouselMaxScroll();
    scheduleCarouselRangeUpdate();
  };

  window.addEventListener("resize", () => {
    syncCarouselMetrics();
    updateCarouselAutoMode();
  });
  window.addEventListener("load", syncCarouselMetrics);
  document.fonts?.ready.then(syncCarouselMetrics);
  if ("ResizeObserver" in window) {
    const carouselResizeObserver = new ResizeObserver(syncCarouselMetrics);
    carouselResizeObserver.observe(carouselViewport);
    carouselResizeObserver.observe(carousel);
  }
  if (typeof carouselFinePointer.addEventListener === "function") {
    carouselFinePointer.addEventListener("change", updateCarouselAutoMode);
  } else {
    carouselFinePointer.addListener(updateCarouselAutoMode);
  }
  measureCarouselMaxScroll();
  updateCarouselRange();
  updateCarouselAutoMode();
}

window.addEventListener("scroll", requestUpdate, { passive: true });
window.addEventListener("resize", () => {
  if (window.innerWidth > 720) {
    setMobileNavigationOpen(false);
  }
  requestUpdate();
});
window.addEventListener("load", update);
update();
