 document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const yearEl = document.getElementById('currentYear');
  const revealEls = document.querySelectorAll('.reveal');
  const copyEmailButton = document.getElementById('copyEmail');
  const copyEmailFeedback = document.getElementById('copyEmailFeedback');
  const siteLoader = document.getElementById('siteLoader');
  const photoViewer = document.getElementById('photoViewer');
  const photoViewerImage = document.getElementById('photoViewerImage');
  const loadingStartedAt = performance.now();

  const getStoredTheme = () => {
    try {
      const savedTheme = localStorage.getItem('portfolio-theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
    } catch (error) {
      // Ignore storage errors and fall back to the system preference.
    }

    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const applyTheme = (theme) => {
    root.setAttribute('data-theme', theme);

    if (themeToggle) {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      themeToggle.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
      themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  };

  if (siteLoader) {
    const pageContent = [...document.body.children].filter((element) => element !== siteLoader);
    pageContent.forEach((element) => {
      element.inert = true;
    });
    document.documentElement.classList.add('is-loading');

    const dismissLoader = () => {
      const remainingTime = Math.max(0, 900 - (performance.now() - loadingStartedAt));
      window.setTimeout(() => {
        siteLoader.classList.add('is-hidden');
        siteLoader.setAttribute('aria-hidden', 'true');
        window.setTimeout(() => {
          pageContent.forEach((element) => {
            element.inert = false;
          });
          document.documentElement.classList.remove('is-loading');
          siteLoader.remove();
        }, 600);
      }, remainingTime);
    };

    if (document.readyState === 'complete') {
      dismissLoader();
    } else {
      window.addEventListener('load', dismissLoader, { once: true });
    }
  }

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  document.querySelectorAll('.hero-avatar img, .nav-container img').forEach((image) => {
    const showFallback = () => {
      image.hidden = true;
      image.parentElement.classList.add('image-unavailable');
    };

    image.addEventListener('error', showFallback, { once: true });
    if (image.complete && image.naturalWidth === 0) showFallback();
  });

  if (photoViewer instanceof HTMLDialogElement && photoViewerImage instanceof HTMLImageElement) {
    const openPhotoViewer = (image) => {
      if (!image.naturalWidth) return;
      photoViewerImage.src = image.currentSrc || image.src;
      photoViewer.showModal();
    };

    document.querySelectorAll('.profile-photo-trigger').forEach((image) => {
      image.addEventListener('click', () => openPhotoViewer(image));
      image.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPhotoViewer(image);
        }
      });
    });

    photoViewer.querySelector('.photo-viewer-close')?.addEventListener('click', () => {
      photoViewer.close();
    });

    photoViewer.addEventListener('cancel', (event) => {
      event.preventDefault();
      photoViewer.close();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && photoViewer.open) {
        event.preventDefault();
        photoViewer.close();
      }
    }, true);

    photoViewer.addEventListener('click', (event) => {
      if (event.target === photoViewer) photoViewer.close();
    });
  }

  const heroSection = document.getElementById('top');
  const profileCardCanvas = document.getElementById('lanyardCanvas');
  const profileGreeting = document.getElementById('profileGreeting');
  const profileGreetingText = document.getElementById('profileGreetingText');

  if (
    heroSection instanceof HTMLElement &&
    profileCardCanvas instanceof HTMLCanvasElement &&
    profileGreeting instanceof HTMLElement &&
    profileGreetingText instanceof HTMLElement
  ) {
    const context = profileCardCanvas.getContext('2d');

    if (!context) {
      console.error('Could not initialize the ID card canvas.');
    } else {
      const photo = new Image();
      const card = { x: 0, y: 0, width: 0, height: 0, vx: 0, vy: 0, angle: 0 };
      let viewportWidth = heroSection.clientWidth;
      let viewportHeight = heroSection.clientHeight;
      let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      let anchorX = viewportWidth * 0.72;
      let pointerId = null;
      let pointerOffsetX = 0;
      let pointerOffsetY = 0;
      let pointerStartX = 0;
      let pointerStartY = 0;
      let pointerMoved = false;
      let lastPointerX = 0;
      let lastPointerY = 0;
      let lastFrame = 0;

      const restingCardY = () => (
        viewportWidth >= 861
          ? 200
          : Math.max(180, Math.min(220, viewportHeight * 0.26))
      );

      const updateGreeting = () => {
        const hour = new Date().getHours();
        const greeting = hour < 12
          ? 'Good morning'
          : hour < 17
            ? 'Good afternoon'
            : hour < 21
              ? 'Good evening'
              : 'Good night';

        profileGreetingText.textContent = greeting;
      };

      const roundedRect = (x, y, width, height, radius) => {
        context.beginPath();
        context.roundRect(x, y, width, height, radius);
      };

      const resizeCanvas = () => {
        const previousWidth = viewportWidth;
        viewportWidth = heroSection.clientWidth;
        viewportHeight = heroSection.clientHeight;
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        profileCardCanvas.width = Math.round(viewportWidth * pixelRatio);
        profileCardCanvas.height = Math.round(viewportHeight * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const cardWidth = viewportWidth < 360
          ? Math.min(viewportWidth * 0.72, 230)
          : viewportWidth < 480
            ? Math.min(viewportWidth * 0.72, 270)
            : viewportWidth < 861
              ? Math.min(viewportWidth * 0.37, 320)
              : Math.min(viewportWidth * 0.275, 380);
        card.width = cardWidth;
        card.height = cardWidth * 1.46;
        anchorX = viewportWidth >= 861 ? viewportWidth * 0.72 : viewportWidth / 2;

        if (pointerId === null) {
          card.x = anchorX;
          card.y = restingCardY();
          card.vx = 0;
          card.vy = 0;
        } else if (previousWidth > 0) {
          card.x = (card.x / previousWidth) * viewportWidth;
        }
      };

      const getPointerPosition = (event) => {
        const bounds = heroSection.getBoundingClientRect();
        return {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top
        };
      };

      const drawPhoto = (x, y, width, height) => {
        if (!photo.complete || !photo.naturalWidth) return;

        const sourceRatio = photo.naturalWidth / photo.naturalHeight;
        const destinationRatio = width / height;
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = photo.naturalWidth;
        let sourceHeight = photo.naturalHeight;

        if (sourceRatio > destinationRatio) {
          sourceWidth = photo.naturalHeight * destinationRatio;
          sourceX = (photo.naturalWidth - sourceWidth) / 2;
        } else {
          sourceHeight = photo.naturalWidth / destinationRatio;
          sourceY = (photo.naturalHeight - sourceHeight) / 2;
        }

        context.drawImage(photo, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
      };

      const drawLanyard = () => {
        const startX = anchorX;
        const startY = -8;
        const endX = card.x;
        const endY = card.y + 4;
        const sway = Math.max(-46, Math.min(46, card.vx * 0.18));
        const midY = startY + (endY - startY) * 0.58;
        const control1X = startX + sway;
        const control1Y = startY + midY * 0.42;
        const control2X = endX - sway;
        const control2Y = midY * 1.16;

        context.beginPath();
        context.moveTo(startX, startY);
        context.bezierCurveTo(control1X, control1Y, control2X, control2Y, endX, endY);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = 'rgba(0, 0, 0, 0.22)';
        context.lineWidth = Math.max(16, card.width * 0.052);
        context.stroke();
        context.strokeStyle = '#17202d';
        context.lineWidth = Math.max(13, card.width * 0.042);
        context.stroke();

        const textPosition = 0.68;
        const inversePosition = 1 - textPosition;
        const textX = inversePosition ** 3 * startX
          + 3 * inversePosition ** 2 * textPosition * control1X
          + 3 * inversePosition * textPosition ** 2 * control2X
          + textPosition ** 3 * endX;
        const textY = inversePosition ** 3 * startY
          + 3 * inversePosition ** 2 * textPosition * control1Y
          + 3 * inversePosition * textPosition ** 2 * control2Y
          + textPosition ** 3 * endY;
        const tangentX = 3 * inversePosition ** 2 * (control1X - startX)
          + 6 * inversePosition * textPosition * (control2X - control1X)
          + 3 * textPosition ** 2 * (endX - control2X);
        const tangentY = 3 * inversePosition ** 2 * (control1Y - startY)
          + 6 * inversePosition * textPosition * (control2Y - control1Y)
          + 3 * textPosition ** 2 * (endY - control2Y);

        context.save();
        context.translate(textX, textY);
        context.rotate(Math.atan2(tangentY, tangentX));
        context.fillStyle = '#f8fafc';
        context.font = `700 ${Math.max(6, Math.min(8, card.width * 0.021))}px system-ui, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = 'rgba(0, 0, 0, 0.8)';
        context.shadowBlur = 2;
        context.fillText('RIZKI AKBAR PRADANA', 0, 0, Math.max(80, card.width * 0.58));
        context.restore();

        const clipY = card.y - 8;
        context.fillStyle = '#89919b';
        context.fillRect(card.x - 13, clipY, 26, 12);
        context.fillStyle = '#dce1e7';
        context.fillRect(card.x - 9, clipY + 2, 18, 6);
      };

      const drawCard = () => {
        const left = -card.width / 2;
        const top = -card.height / 2;
        const padding = Math.max(8, card.width * 0.035);
        const labelHeight = Math.max(38, card.height * 0.15);
        const photoHeight = card.height - padding * 2 - labelHeight;

        context.save();
        context.translate(card.x, card.y + card.height / 2);
        context.rotate(card.angle);
        context.shadowColor = 'rgba(10, 18, 30, 0.28)';
        context.shadowBlur = Math.max(12, card.width * 0.08);
        context.shadowOffsetY = 10;
        roundedRect(left, top, card.width, card.height, Math.max(14, card.width * 0.055));
        context.fillStyle = '#f4f5f7';
        context.fill();
        context.shadowColor = 'transparent';
        context.save();
        roundedRect(left + padding, top + padding, card.width - padding * 2, card.height - padding * 2, 10);
        context.clip();
        drawPhoto(
          left + padding,
          top + padding,
          card.width - padding * 2,
          photoHeight
        );
        context.fillStyle = '#111827';
        context.fillRect(left + padding, top + padding + photoHeight, card.width - padding * 2, labelHeight);
        context.fillStyle = '#ffffff';
        context.font = `700 ${Math.max(14, card.width * 0.052)}px system-ui, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('Malang, Indonesia', 0, top + padding + photoHeight + labelHeight / 2);
        context.restore();
        roundedRect(left, top, card.width, card.height, Math.max(14, card.width * 0.055));
        context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        context.lineWidth = 2;
        context.stroke();
        context.restore();
      };

      const drawScene = (timestamp) => {
        const elapsed = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.04) : 0;
        lastFrame = timestamp;

        if (pointerId === null && elapsed) {
          const spring = 8;
          card.vx += (anchorX - card.x) * spring * elapsed;
          card.vy += (restingCardY() - card.y) * spring * elapsed;
          card.vx *= Math.pow(0.97, elapsed * 60);
          card.vy *= Math.pow(0.97, elapsed * 60);
          card.x += card.vx * elapsed;
          card.y += card.vy * elapsed;
          card.angle += (Math.max(-0.12, Math.min(0.12, card.vx * 0.0015)) - card.angle) * Math.min(1, elapsed * 5);
        }

        context.clearRect(0, 0, viewportWidth, viewportHeight);
        drawLanyard();
        drawCard();
        profileGreeting.style.left = `${card.x}px`;
        profileGreeting.style.top = `${Math.max(12, card.y - 12)}px`;
        window.requestAnimationFrame(drawScene);
      };

      const stopPointerEvent = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      };

      const isOverCard = (x, y) => (
        Math.abs(x - card.x) <= card.width / 2 &&
        y >= card.y &&
        y <= card.y + card.height
      );

      window.addEventListener('pointerdown', (event) => {
        const position = getPointerPosition(event);
        if (!event.isPrimary || event.button !== 0 || !isOverCard(position.x, position.y)) return;

        stopPointerEvent(event);
        pointerId = event.pointerId;
        pointerStartX = position.x;
        pointerStartY = position.y;
        pointerOffsetX = position.x - card.x;
        pointerOffsetY = position.y - (card.y + card.height / 2);
        lastPointerX = position.x;
        lastPointerY = position.y;
        pointerMoved = false;
        card.vx = 0;
        card.vy = 0;
        document.body.style.cursor = 'grabbing';
      }, true);

      window.addEventListener('pointermove', (event) => {
        if (pointerId !== event.pointerId) return;

        stopPointerEvent(event);
        const position = getPointerPosition(event);
        pointerMoved ||= Math.hypot(position.x - pointerStartX, position.y - pointerStartY) > 5;
        card.x = position.x - pointerOffsetX;
        card.y = position.y - pointerOffsetY - card.height / 2;
        card.vx = (position.x - lastPointerX) * 12;
        card.vy = (position.y - lastPointerY) * 12;
        lastPointerX = position.x;
        lastPointerY = position.y;
      }, true);

      const finishCardDrag = (event) => {
        if (pointerId !== event.pointerId) return;

        stopPointerEvent(event);
        pointerId = null;
        document.body.style.cursor = '';
        if (!pointerMoved && photo.complete && photo.naturalWidth && photoViewer instanceof HTMLDialogElement && photoViewerImage instanceof HTMLImageElement) {
          photoViewerImage.src = photo.src;
          photoViewer.showModal();
        }
      };

      window.addEventListener('pointerup', finishCardDrag, true);
      window.addEventListener('pointercancel', finishCardDrag, true);

      profileCardCanvas.addEventListener('keydown', (event) => {
        const moves = {
          ArrowUp: [0, -24],
          ArrowDown: [0, 24],
          ArrowLeft: [-24, 0],
          ArrowRight: [24, 0]
        };
        const movement = moves[event.key];
        if (!movement) return;

        event.preventDefault();
        card.x += movement[0];
        card.y += movement[1];
      });

      window.addEventListener('resize', resizeCanvas);
      if ('ResizeObserver' in window) {
        new ResizeObserver(resizeCanvas).observe(heroSection);
      }
      updateGreeting();
      window.setInterval(updateGreeting, 60000);
      photo.onerror = () => console.error('Could not load the profile photo for the ID card.');
      photo.src = 'foto-saya.jpeg';
      resizeCanvas();
      window.requestAnimationFrame(drawScene);
    }
  }

  const savedTheme = getStoredTheme();
  applyTheme(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', nextTheme);
      localStorage.setItem('portfolio-theme', nextTheme);
      applyTheme(nextTheme);
    });
  }

  const heroTicker = document.querySelector('.hero-ticker');
  const tickerTrack = heroTicker?.querySelector('.hero-ticker-track');
  const tickerSource = tickerTrack?.querySelector('.hero-ticker-group');

  if (heroTicker && tickerTrack && tickerSource) {
    let copiesPerCycle = 0;

    const fillHeroTicker = () => {
      const groupWidth = tickerSource.getBoundingClientRect().width;
      if (!groupWidth) return;

      const nextCopiesPerCycle = Math.ceil(heroTicker.clientWidth / groupWidth) + 1;
      if (nextCopiesPerCycle === copiesPerCycle) return;
      copiesPerCycle = nextCopiesPerCycle;

      tickerTrack.replaceChildren(tickerSource);
      for (let copyIndex = 1; copyIndex < copiesPerCycle * 2; copyIndex += 1) {
        const copy = tickerSource.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        tickerTrack.append(copy);
      }
    };

    fillHeroTicker();
    if ('ResizeObserver' in window) {
      new ResizeObserver(fillHeroTicker).observe(heroTicker);
    } else {
      window.addEventListener('resize', fillHeroTicker);
    }
  }

  const showRevealElements = () => {
    revealEls.forEach((el, index) => {
      el.style.transitionDelay = `${Math.min(index * 80, 320)}ms`;
      el.classList.add('active');
    });
  };

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('active', entry.isIntersecting);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    showRevealElements();
  }

  if (copyEmailButton && copyEmailFeedback) {
    copyEmailButton.addEventListener('click', async () => {
      const email = copyEmailButton.dataset.email;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(email);
        } else {
          const emailInput = document.createElement('textarea');
          emailInput.value = email;
          emailInput.style.position = 'fixed';
          emailInput.style.opacity = '0';
          document.body.append(emailInput);
          emailInput.select();
          const copied = document.execCommand('copy');
          emailInput.remove();
          if (!copied) throw new Error('Clipboard copy failed');
        }

        copyEmailFeedback.textContent = 'Email copied';
      } catch {
        copyEmailFeedback.textContent = 'Could not copy email';
      }
    });
  }
});