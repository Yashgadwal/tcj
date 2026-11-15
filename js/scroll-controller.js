/**
 * TCJ Gourmet Store - Master Cinematic Scroll Controller (GSAP + ScrollTrigger)
 * Controls all 6 cinematic scroll animation chapters across the 9 consolidated sections:
 * Section 2: Chocolate Universe (Dubai Chocolate) & Energy Universe (Prime & Monster)
 * Section 3: Korean Fire Zone (Buldak Spicy Ramen) & Spicy Snack Explosion (Takis Fuego)
 * Section 4: Japanese Soda Lab (Ramune Marble Soda) & Candy Wonderland (Haribo & Skittles)
 */

(function() {
  const TOTAL_DRINKS_FRAMES = 240;
  const TOTAL_SNACKS_FRAMES = 240;
  const TOTAL_CANDY_FRAMES = 240;
  const TOTAL_CHOCO_FRAMES = 210; // Stops at frame 210 to completely eliminate video fade-to-black!
  const TOTAL_SHOP_DESKTOP_FRAMES = 156;
  const TOTAL_SHOP_MOBILE_FRAMES = 125;
  const isMobile = () => window.innerWidth < 768;

  // Preload TCJ Official Logo for Watermark Replacement
  const tcjWatermarkImg = new Image();
  tcjWatermarkImg.src = 'assets/tcj_logo_watermark.png';
  tcjWatermarkImg.onload = () => {
    // Redraw active frames once watermark badge asset is fully cached
    window.dispatchEvent(new Event('resize'));
  };

  function roundRectPath(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawTCJWatermark(ctx, cw, ch, nw, nh, nx, ny, iw, ih) {
    // Exact coordinates of Gemini star watermark:
    // Desktop (1280x720): relX = 1158/1280 (0.9047), relY = 614/720 (0.8528)
    // Mobile (720x1280): relX = 600/720 (0.8333), relY = 1172/1280 (0.9156)
    const isMob = (iw < ih);
    const relX = isMob ? (600 / 720) : (1158 / 1280);
    const relY = isMob ? (1172 / 1280) : (614 / 720);

    const targetX = nx + nw * relX;
    const targetY = ny + nh * relY;

    // Proportionally scale badge size based on drawn frame width
    const baseSize = isMob ? (nw * 0.095) : (nw * 0.052);
    const logoSize = Math.max(isMob ? 56 : 50, Math.min(isMob ? 90 : 80, Math.round(baseSize)));

    const lx = targetX - logoSize / 2;
    const ly = targetY - logoSize / 2;
    const cornerRadius = Math.max(8, Math.round(logoSize * 0.18));

    ctx.save();
    // Shadow for strong separation & luxury look
    ctx.shadowColor = 'rgba(0, 0, 0, 0.88)';
    ctx.shadowBlur = Math.round(logoSize * 0.22);
    ctx.shadowOffsetY = Math.round(logoSize * 0.06);

    // Dark emerald background squircle (covers watermark 100%)
    ctx.fillStyle = '#0b1d16';
    roundRectPath(ctx, lx - 2, ly - 2, logoSize + 4, logoSize + 4, cornerRadius + 2);
    ctx.fill();

    // Clipped TCJ Official Logo
    if (tcjWatermarkImg.complete && tcjWatermarkImg.naturalWidth > 0) {
      ctx.beginPath();
      roundRectPath(ctx, lx, ly, logoSize, logoSize, cornerRadius);
      ctx.clip();
      ctx.drawImage(tcjWatermarkImg, lx, ly, logoSize, logoSize);
    }
    ctx.restore();

    // Subtle luxury gold border
    ctx.save();
    ctx.strokeStyle = 'rgba(214, 166, 91, 0.55)';
    ctx.lineWidth = Math.max(1, Math.round(logoSize * 0.025));
    roundRectPath(ctx, lx, ly, logoSize, logoSize, cornerRadius);
    ctx.stroke();
    ctx.restore();
  }

  function initAllScrollControllers() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('GSAP or ScrollTrigger not loaded');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Section 1 (Hero): TCJ Flagship Shop Front Scrubber
    initShopfrontExperienceScrubber();

    // Section 2: Drinks Special Scrubber
    initDrinksSpecialScrubber();

    // Section 3: Korean Fire & Spicy Snack Zone Scrubber
    initKoreanFireScrubber();
    initSnacksSpecialScrubber();

    // Section 4: Japanese Soda & Candy Wonderland Scrubber
    initJapaneseSodaScrubber();
    initCandySpecialScrubber();

    // Section 5: Dubai Chocolate Experience Scrubber
    initChocolateExperienceScrubber();

    // UI Interactive Reveals
    setupProductRevealAnimations();
    setupDeliveryAnimation();
    setupStoreInfoReveal();

    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 350);

    window.addEventListener('load', () => {
      ScrollTrigger.refresh();
    });
  }

  if (document.readyState !== 'loading') {
    initAllScrollControllers();
  } else {
    document.addEventListener('DOMContentLoaded', initAllScrollControllers);
  }

  /**
   * Helper: Optimize Video Loading (Only loads active device video)
   */
  function optimizeVideoLoading(videoDesktop, videoMobile, initialTime = 0.05) {
    const active = isMobile() ? videoMobile : videoDesktop;
    const inactive = isMobile() ? videoDesktop : videoMobile;

    if (active) {
      active.preload = 'auto';
      active.load();
      const seekInitial = () => {
        try {
          if (active.currentTime < initialTime) {
            active.currentTime = initialTime;
          }
        } catch (e) {}
      };
      active.addEventListener('loadedmetadata', seekInitial);
      active.addEventListener('loadeddata', seekInitial);
      if (active.readyState >= 1) seekInitial();
    }
    if (inactive) {
      inactive.preload = 'none';
      try { inactive.pause(); } catch (e) {}
    }
  }

  /**
   * 1. CHOCOLATE UNIVERSE SCRUBBER (DUBAI CHOCOLATE)
   */
  function initChocolateExperienceScrubber() {
    const container = document.getElementById('chocolate-experience-sub') || document.getElementById('chocolate-experience-section');
    const canvas = document.getElementById('chocolate-scrub-canvas');
    const videoDesktop = document.getElementById('chocolate-video-desktop');
    const videoMobile = document.getElementById('chocolate-video-mobile');

    if (!container) return;

    let ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
    const images = [];
    let currentFrameIndex = 0;
    let isSeeking = false;

    const getActiveVideo = () => isMobile() ? videoMobile : videoDesktop;

    function drawFrame(index) {
      if (!ctx || !canvas) return;
      let img = images[index];
      if (!img || !img.complete) {
        for (let i = index; i >= 0; i--) {
          if (images[i] && images[i].complete) {
            img = images[i];
            break;
          }
        }
      }
      if (!img || !img.complete) img = images[0];
      if (!img || !img.complete) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) return;

      const ratio = Math.max(cw / iw, ch / ih);
      const nw = iw * ratio;
      const nh = ih * ratio;
      const nx = (cw - nw) / 2;
      const ny = (ch - nh) / 2;

      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, iw, ih, nx, ny, nw, nh);
      drawTCJWatermark(ctx, cw, ch, nw, nh, nx, ny, iw, ih);
    }

    const resizeCanvas = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      if (images[currentFrameIndex]) {
        drawFrame(currentFrameIndex);
      }
    };

    if (canvas) {
      resizeCanvas();
      window.addEventListener('resize', debounce(resizeCanvas, 150));
    }

    optimizeVideoLoading(videoDesktop, videoMobile);

    const mobileMode = isMobile();
    const folder = mobileMode ? 'assets/frames_mobile' : 'assets/frames_desktop';

    const firstImg = new Image();
    firstImg.onload = () => {
      images[0] = firstImg;
      drawFrame(0);
    };
    firstImg.src = `${folder}/frame_001.jpg`;
    if (firstImg.complete) {
      images[0] = firstImg;
      drawFrame(0);
    }

    for (let i = 1; i <= TOTAL_CHOCO_FRAMES; i++) {
      const padded = String(i).padStart(3, '0');
      const img = new Image();
      img.src = `${folder}/frame_${padded}.jpg`;
      img.onload = () => {
        images[i - 1] = img;
      };
    }

    const scrubVideo = (progress) => {
      const vid = getActiveVideo();
      if (vid && vid.duration && !isSeeking) {
        const targetTime = Math.min(vid.duration - 0.05, Math.max(0, progress * vid.duration));
        if (Math.abs(vid.currentTime - targetTime) > 0.04) {
          isSeeking = true;
          vid.currentTime = targetTime;
          setTimeout(() => { isSeeking = false; }, 40);
        }
      }
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: '+=2200',
        pin: true,
        scrub: 0.15,
        anticipatePin: 1,
        onUpdate: (self) => {
          const targetIndex = Math.min(
            TOTAL_CHOCO_FRAMES - 1,
            Math.max(0, Math.round(self.progress * (TOTAL_CHOCO_FRAMES - 1)))
          );

          if (targetIndex !== currentFrameIndex) {
            currentFrameIndex = targetIndex;
            drawFrame(targetIndex);
            scrubVideo(self.progress);
          }
        }
      }
    });

    tl.to({}, { duration: 1 });
  }

  /**
   * 2. ENERGY UNIVERSE SCRUBBER (SUB-ZERO DRINKS)
   */
  function initDrinksSpecialScrubber() {
    const container = document.getElementById('drinks-experience-sub') || document.getElementById('drinks-experience-section');
    const canvas = document.getElementById('drinks-scrub-canvas');
    const videoDesktop = document.getElementById('drinks-video-desktop');
    const videoMobile = document.getElementById('drinks-video-mobile');

    if (!container) return;

    let ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
    const images = [];
    let currentFrameIndex = 0;
    let isSeeking = false;

    const getActiveVideo = () => isMobile() ? videoMobile : videoDesktop;

    function drawFrame(index) {
      if (!ctx || !canvas) return;
      let img = images[index];
      if (!img || !img.complete) {
        for (let i = index; i >= 0; i--) {
          if (images[i] && images[i].complete) {
            img = images[i];
            break;
          }
        }
      }
      if (!img || !img.complete) img = images[0];
      if (!img || !img.complete) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) return;

      const ratio = Math.max(cw / iw, ch / ih);
      const nw = iw * ratio;
      const nh = ih * ratio;
      const nx = (cw - nw) / 2;
      const ny = (ch - nh) / 2;

      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, iw, ih, nx, ny, nw, nh);
      drawTCJWatermark(ctx, cw, ch, nw, nh, nx, ny, iw, ih);
    }

    const resizeCanvas = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      if (images[currentFrameIndex]) {
        drawFrame(currentFrameIndex);
      }
    };

    if (canvas) {
      resizeCanvas();
      window.addEventListener('resize', debounce(resizeCanvas, 150));
    }

    optimizeVideoLoading(videoDesktop, videoMobile);

    const mobileMode = isMobile();
    const folder = mobileMode ? 'assets/frames_drinks_mobile' : 'assets/frames_drinks_desktop';
    const firstImg = new Image();
    firstImg.onload = () => {
      images[0] = firstImg;
      drawFrame(0);
    };
    firstImg.src = `${folder}/frame_001.jpg`;
    if (firstImg.complete) {
      images[0] = firstImg;
      drawFrame(0);
    }

    for (let i = 1; i <= TOTAL_DRINKS_FRAMES; i++) {
      const padded = String(i).padStart(3, '0');
      const img = new Image();
      img.src = `${folder}/frame_${padded}.jpg`;
      img.onload = () => {
        images[i - 1] = img;
      };
    }

    const scrubVideo = (progress) => {
      const vid = getActiveVideo();
      if (vid && vid.duration && !isSeeking) {
        const targetTime = Math.min(vid.duration - 0.05, Math.max(0, progress * vid.duration));
        if (Math.abs(vid.currentTime - targetTime) > 0.04) {
          isSeeking = true;
          vid.currentTime = targetTime;
          setTimeout(() => { isSeeking = false; }, 40);
        }
      }
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: '+=2200',
        pin: true,
        scrub: 0.15,
        anticipatePin: 1,
        onUpdate: (self) => {
          const targetIndex = Math.min(
            TOTAL_DRINKS_FRAMES - 1,
            Math.max(0, Math.round(self.progress * (TOTAL_DRINKS_FRAMES - 1)))
          );

          if (targetIndex !== currentFrameIndex) {
            currentFrameIndex = targetIndex;
            drawFrame(targetIndex);
            scrubVideo(self.progress);
          }
        }
      }
    });

    tl.to({}, { duration: 1 });
  }

  /**
   * 3. KOREAN FIRE ZONE SCROLL ANIMATION
   */
  function initKoreanFireScrubber() {
    const container = document.getElementById('korean-fire-sub');
    if (!container) return;

    const heatBar = document.getElementById('korean-heat-bar');
    const heatText = document.getElementById('korean-heat-text');
    const buldakCard = document.getElementById('korean-buldak-pack');
    const steamOverlay = document.getElementById('korean-steam-glow');

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: '+=1800',
        pin: true,
        scrub: 0.2,
        anticipatePin: 1,
        onUpdate: (self) => {
          const p = self.progress;
          if (heatBar) {
            heatBar.style.width = `${Math.round(20 + p * 80)}%`;
          }
          if (heatText) {
            if (p < 0.35) {
              heatText.textContent = 'MILD KIMCHI TINGLE (Level 1)';
              heatText.className = 'text-amber-400 font-bold';
            } else if (p < 0.70) {
              heatText.textContent = 'BULDAK CARBONARA HEAT (Level 3)';
              heatText.className = 'text-orange-500 font-bold';
            } else {
              heatText.textContent = '🔥 2X NUCLEAR FIRE RUSH (Level 5)';
              heatText.className = 'text-rose-500 font-black animate-pulse';
            }
          }
        }
      }
    });

    if (buldakCard) {
      tl.fromTo(buldakCard, 
        { scale: 0.85, rotationY: -18, rotationX: 12 },
        { scale: 1.08, rotationY: 15, rotationX: -8, duration: 1, ease: 'none' }
      );
    }
    if (steamOverlay) {
      tl.fromTo(steamOverlay,
        { opacity: 0.2, scale: 0.9 },
        { opacity: 0.85, scale: 1.15, duration: 1, ease: 'none' },
        0
      );
    }
  }

  /**
   * 4. SPICY SNACK EXPLOSION SCRUBBER (TAKIS & CHIPS)
   */
  function initSnacksSpecialScrubber() {
    const container = document.getElementById('snacks-experience-sub') || document.getElementById('snacks-experience-section');
    const canvas = document.getElementById('snacks-scrub-canvas');
    const videoDesktop = document.getElementById('snacks-video-desktop');
    const videoMobile = document.getElementById('snacks-video-mobile');

    if (!container) return;

    let ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
    const images = [];
    let currentFrameIndex = 0;
    let isSeeking = false;

    const getActiveVideo = () => isMobile() ? videoMobile : videoDesktop;

    function drawFrame(index) {
      if (!ctx || !canvas) return;
      let img = images[index];
      if (!img || !img.complete) {
        for (let i = index; i >= 0; i--) {
          if (images[i] && images[i].complete) {
            img = images[i];
            break;
          }
        }
      }
      if (!img || !img.complete) img = images[0];
      if (!img || !img.complete) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) return;

      const ratio = Math.max(cw / iw, ch / ih);
      const nw = iw * ratio;
      const nh = ih * ratio;
      const nx = (cw - nw) / 2;
      const ny = (ch - nh) / 2;

      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, iw, ih, nx, ny, nw, nh);
      drawTCJWatermark(ctx, cw, ch, nw, nh, nx, ny, iw, ih);
    }

    const resizeCanvas = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      if (images[currentFrameIndex]) {
        drawFrame(currentFrameIndex);
      }
    };

    if (canvas) {
      resizeCanvas();
      window.addEventListener('resize', debounce(resizeCanvas, 150));
    }

    optimizeVideoLoading(videoDesktop, videoMobile);

    const mobileMode = isMobile();
    const folder = mobileMode ? 'assets/frames_snacks_mobile' : 'assets/frames_snacks_desktop';
    const firstImg = new Image();
    firstImg.onload = () => {
      images[0] = firstImg;
      drawFrame(0);
    };
    firstImg.src = `${folder}/frame_001.jpg`;
    if (firstImg.complete) {
      images[0] = firstImg;
      drawFrame(0);
    }

    for (let i = 1; i <= TOTAL_SNACKS_FRAMES; i++) {
      const padded = String(i).padStart(3, '0');
      const img = new Image();
      img.src = `${folder}/frame_${padded}.jpg`;
      img.onload = () => {
        images[i - 1] = img;
      };
    }

    const scrubVideo = (progress) => {
      const vid = getActiveVideo();
      if (vid && vid.duration && !isSeeking) {
        const targetTime = Math.min(vid.duration - 0.05, Math.max(0, progress * vid.duration));
        if (Math.abs(vid.currentTime - targetTime) > 0.04) {
          isSeeking = true;
          vid.currentTime = targetTime;
          setTimeout(() => { isSeeking = false; }, 40);
        }
      }
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: '+=2200',
        pin: true,
        scrub: 0.15,
        anticipatePin: 1,
        onUpdate: (self) => {
          const targetIndex = Math.min(
            TOTAL_SNACKS_FRAMES - 1,
            Math.max(0, Math.round(self.progress * (TOTAL_SNACKS_FRAMES - 1)))
          );

          if (targetIndex !== currentFrameIndex) {
            currentFrameIndex = targetIndex;
            drawFrame(targetIndex);
            scrubVideo(self.progress);
          }
        }
      }
    });

    tl.to({}, { duration: 1 });
  }

  /**
   * 5. JAPANESE SODA LAB SCROLL ANIMATION (RAMUNE MARBLE POP)
   */
  function initJapaneseSodaScrubber() {
    const container = document.getElementById('soda-lab-sub');
    if (!container) return;

    const marble = document.getElementById('soda-marble-ball');
    const bubbles = document.getElementById('soda-bubble-particles');
    const frostGlow = document.getElementById('soda-frost-glow');

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: '+=1800',
        pin: true,
        scrub: 0.2,
        anticipatePin: 1
      }
    });

    if (marble) {
      tl.to(marble, {
        y: 140,
        scale: 0.9,
        duration: 0.45,
        ease: 'bounce.out'
      }, 0.15);
    }

    if (bubbles) {
      tl.fromTo(bubbles,
        { opacity: 0, y: 60, scale: 0.7 },
        { opacity: 1, y: -40, scale: 1.25, duration: 0.75, ease: 'power2.out' },
        0.3
      );
    }

    if (frostGlow) {
      tl.fromTo(frostGlow,
        { opacity: 0.2 },
        { opacity: 0.9, duration: 1, ease: 'none' },
        0
      );
    }
  }

  /**
   * 6. CANDY WONDERLAND SCRUBBER (HARIBO & SWEETS)
   */
  function initCandySpecialScrubber() {
    const container = document.getElementById('candy-experience-sub') || document.getElementById('candy-experience-section');
    const canvas = document.getElementById('candy-scrub-canvas');
    const videoDesktop = document.getElementById('candy-video-desktop');
    const videoMobile = document.getElementById('candy-video-mobile');

    if (!container) return;

    let ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
    const images = [];
    let currentFrameIndex = 0;
    let isSeeking = false;

    const getActiveVideo = () => isMobile() ? videoMobile : videoDesktop;

    function drawFrame(index) {
      if (!ctx || !canvas) return;
      let img = images[index];
      if (!img || !img.complete) {
        for (let i = index; i >= 0; i--) {
          if (images[i] && images[i].complete) {
            img = images[i];
            break;
          }
        }
      }
      if (!img || !img.complete) img = images[0];
      if (!img || !img.complete) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) return;

      const ratio = Math.max(cw / iw, ch / ih);
      const nw = iw * ratio;
      const nh = ih * ratio;
      const nx = (cw - nw) / 2;
      const ny = (ch - nh) / 2;

      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, iw, ih, nx, ny, nw, nh);
      drawTCJWatermark(ctx, cw, ch, nw, nh, nx, ny, iw, ih);
    }

    const resizeCanvas = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      if (images[currentFrameIndex]) {
        drawFrame(currentFrameIndex);
      }
    };

    if (canvas) {
      resizeCanvas();
      window.addEventListener('resize', debounce(resizeCanvas, 150));
    }

    optimizeVideoLoading(videoDesktop, videoMobile);

    const mobileMode = isMobile();
    const folder = mobileMode ? 'assets/frames_candy_mobile' : 'assets/frames_candy_desktop';
    const firstImg = new Image();
    firstImg.onload = () => {
      images[0] = firstImg;
      drawFrame(0);
    };
    firstImg.src = `${folder}/frame_001.jpg`;
    if (firstImg.complete) {
      images[0] = firstImg;
      drawFrame(0);
    }

    for (let i = 1; i <= TOTAL_CANDY_FRAMES; i++) {
      const padded = String(i).padStart(3, '0');
      const img = new Image();
      img.src = `${folder}/frame_${padded}.jpg`;
      img.onload = () => {
        images[i - 1] = img;
      };
    }

    const scrubVideo = (progress) => {
      const vid = getActiveVideo();
      if (vid && vid.duration && !isSeeking) {
        const targetTime = Math.min(vid.duration - 0.05, Math.max(0, progress * vid.duration));
        if (Math.abs(vid.currentTime - targetTime) > 0.04) {
          isSeeking = true;
          vid.currentTime = targetTime;
          setTimeout(() => { isSeeking = false; }, 40);
        }
      }
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: '+=2200',
        pin: true,
        scrub: 0.15,
        anticipatePin: 1,
        onUpdate: (self) => {
          const targetIndex = Math.min(
            TOTAL_CANDY_FRAMES - 1,
            Math.max(0, Math.round(self.progress * (TOTAL_CANDY_FRAMES - 1)))
          );

          if (targetIndex !== currentFrameIndex) {
            currentFrameIndex = targetIndex;
            drawFrame(targetIndex);
            scrubVideo(self.progress);
          }
        }
      }
    });

    tl.to({}, { duration: 1 });
  }

  /**
   * 3D Card Mouse Tilt and Stagger Entrance
   */
  function setupProductRevealAnimations() {
    ScrollTrigger.batch('.product-card-3d', {
      interval: 0.1,
      batchMax: 4,
      onEnter: (batch) => {
        gsap.from(batch, {
          opacity: 0,
          y: 45,
          stagger: 0.08,
          duration: 0.7,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      },
      start: 'top 88%'
    });

    window.attach3DTiltListeners = function() {
      const cards = document.querySelectorAll('.card-3d-wrap');
      cards.forEach(card => {
        const inner = card.querySelector('.card-3d-inner');
        if (!inner) return;

        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = ((y - centerY) / centerY) * -8;
          const rotateY = ((x - centerX) / centerX) * 8;

          inner.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', () => {
          inner.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
        });
      });
    };

    window.attach3DTiltListeners();
  }

  /**
   * Delivery Scooter Animation
   */
  function setupDeliveryAnimation() {
    const scooter = document.getElementById('delivery-scooter-illustration');
    if (!scooter) return;

    gsap.from(scooter, {
      scrollTrigger: {
        trigger: '#delivery-section',
        start: 'top 75%'
      },
      x: -80,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out'
    });
  }

  /**
   * 6. TCJ FLAGSHIP SHOP FRONT SCRUBBER
   */
  function initShopfrontExperienceScrubber() {
    const container = document.getElementById('shopfront-experience-section');
    const canvas = document.getElementById('shopfront-scrub-canvas');
    const videoDesktop = document.getElementById('shopfront-video-desktop');
    const videoMobile = document.getElementById('shopfront-video-mobile');

    if (!container) return;

    let ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
    const images = [];
    let currentFrameIndex = 0;
    let isSeeking = false;

    const getActiveVideo = () => isMobile() ? videoMobile : videoDesktop;
    const getTotalFrames = () => isMobile() ? TOTAL_SHOP_MOBILE_FRAMES : TOTAL_SHOP_DESKTOP_FRAMES;

    function drawFrame(index) {
      if (!ctx || !canvas) return;
      let img = images[index];
      if (!img || !img.complete) {
        for (let i = index; i >= 0; i--) {
          if (images[i] && images[i].complete) {
            img = images[i];
            break;
          }
        }
      }
      if (!img || !img.complete) img = images[0];
      if (!img || !img.complete) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) return;

      const ratio = Math.max(cw / iw, ch / ih);
      const nw = iw * ratio;
      const nh = ih * ratio;
      const nx = (cw - nw) / 2;
      const ny = (ch - nh) / 2;

      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, iw, ih, nx, ny, nw, nh);
      drawTCJWatermark(ctx, cw, ch, nw, nh, nx, ny, iw, ih);
    }

    const resizeCanvas = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      if (images[currentFrameIndex]) {
        drawFrame(currentFrameIndex);
      }
    };

    if (canvas) {
      resizeCanvas();
      window.addEventListener('resize', debounce(resizeCanvas, 150));
    }

    optimizeVideoLoading(videoDesktop, videoMobile);

    const mobileMode = isMobile();
    const folder = mobileMode ? 'assets/frames_shop_mobile' : 'assets/frames_shop_desktop';
    const totalFrames = getTotalFrames();

    const firstImg = new Image();
    firstImg.onload = () => {
      images[0] = firstImg;
      drawFrame(0);
    };
    firstImg.src = `${folder}/frame_001.jpg`;
    if (firstImg.complete) {
      images[0] = firstImg;
      drawFrame(0);
    }

    for (let i = 1; i <= totalFrames; i++) {
      const padded = String(i).padStart(3, '0');
      const img = new Image();
      img.src = `${folder}/frame_${padded}.jpg`;
      img.onload = () => {
        images[i - 1] = img;
      };
    }

    const scrubVideo = (progress) => {
      const vid = getActiveVideo();
      if (vid && vid.duration && !isSeeking) {
        const targetTime = Math.min(vid.duration - 0.05, Math.max(0, progress * vid.duration));
        if (Math.abs(vid.currentTime - targetTime) > 0.04) {
          isSeeking = true;
          vid.currentTime = targetTime;
          setTimeout(() => { isSeeking = false; }, 40);
        }
      }
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: '+=2400',
        pin: true,
        scrub: 0.15,
        anticipatePin: 1,
        onUpdate: (self) => {
          const count = getTotalFrames();
          const targetIndex = Math.min(
            count - 1,
            Math.max(0, Math.round(self.progress * (count - 1)))
          );

          if (targetIndex !== currentFrameIndex) {
            currentFrameIndex = targetIndex;
            drawFrame(targetIndex);
            scrubVideo(self.progress);
          }
        }
      }
    });

    tl.to({}, { duration: 1 });
  }

  /**
   * Store Information Reveal
   */
  function setupStoreInfoReveal() {
    const content = document.getElementById('store-info-content');
    if (!content) return;

    gsap.from(content, {
      scrollTrigger: {
        trigger: '#store-section',
        start: 'top 75%'
      },
      opacity: 0,
      y: 40,
      duration: 0.9,
      ease: 'power3.out'
    });
  }

  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
})();
