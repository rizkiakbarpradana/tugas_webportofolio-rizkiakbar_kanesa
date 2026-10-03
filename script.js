document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const yearEl = document.getElementById('currentYear');
  const revealEls = document.querySelectorAll('.reveal');
  const copyEmailButton = document.getElementById('copyEmail');
  const copyEmailFeedback = document.getElementById('copyEmailFeedback');
  const siteLoader = document.getElementById('siteLoader');
  const loadingStartedAt = performance.now();

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

  const savedTheme = localStorage.getItem('portfolio-theme') || 'light';
  root.setAttribute('data-theme', savedTheme);

  if (themeToggle) {
    const updateThemeToggle = (theme) => {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      themeToggle.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
      themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    };

    updateThemeToggle(savedTheme);
    themeToggle.addEventListener('click', () => {
      const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', nextTheme);
      localStorage.setItem('portfolio-theme', nextTheme);
      updateThemeToggle(nextTheme);
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
