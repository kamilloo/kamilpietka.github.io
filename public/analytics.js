(() => {
  'use strict';

  const banner = document.getElementById('analytics-consent');
  if (!banner) return;
  const { measurementId, project } = banner.dataset;
  if (!/^G-[A-Z0-9]+$/.test(measurementId)) return;

  const settings = document.getElementById('analytics-settings');
  const title = document.getElementById('analytics-title');
  const accept = banner.querySelector('[data-analytics-choice="granted"]');
  const reject = banner.querySelector('[data-analytics-choice="denied"]');
  const page = new URL(document.querySelector('link[rel="canonical"]').href);
  const storageKey = 'portfolio-analytics-consent-v1';
  const disableKey = 'ga-disable-' + measurementId;
  let choice = null;
  let initialized = false;
  let openedFromSettings = false;

  function gtag() {
    window.dataLayer.push(arguments);
  }

  function startAnalytics() {
    if (initialized) return;
    initialized = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = gtag;
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    gtag('consent', 'update', { analytics_storage: 'granted' });
    const config = {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: page.href,
      page_referrer: ''
    };
    // Apply privacy and page-view settings before the Google tag initializes.
    gtag('set', config);
    gtag('js', new Date());
    gtag('config', measurementId, config);
    gtag('event', 'page_view');
    if (project) gtag('event', 'project_view', { project_slug: project });

    const tag = document.createElement('script');
    tag.async = true;
    tag.referrerPolicy = 'no-referrer';
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.append(tag);
  }

  function clearAnalyticsCookies() {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_[A-Z0-9]+)?$/i.test(name)) continue;
      const expired = name + '=; Max-Age=0; Path=/';
      document.cookie = expired;
      document.cookie = expired + '; Domain=' + page.hostname;
    }
  }

  function showOptions(open) {
    banner.hidden = !open;
    settings.setAttribute('aria-expanded', String(open));
  }

  function closeOptions() {
    const active = document.activeElement;
    const returnFocus = openedFromSettings ||
      (banner.contains(active) && active.matches(':focus-visible'));
    openedFromSettings = false;
    showOptions(false);
    if (returnFocus) settings.focus();
  }

  function applyChoice(value) {
    const previous = choice;
    choice = value === 'granted' || value === 'denied' ? value : null;
    window[disableKey] = choice !== 'granted';
    if (initialized && (previous === 'granted') !== (choice === 'granted')) {
      gtag('consent', 'update', { analytics_storage: choice === 'granted' ? 'granted' : 'denied' });
    }
    if (choice === 'granted') startAnalytics();
    else if (choice === 'denied' || initialized) clearAnalyticsCookies();
    if (choice === null) showOptions(true);
    else closeOptions();
  }

  function restoreChoice() {
    let saved = choice;
    try {
      saved = window.localStorage.getItem(storageKey);
    } catch {
      // Keep the current document's choice when browser storage is unavailable.
    }
    applyChoice(saved);
  }

  function saveChoice(value) {
    try {
      window.localStorage.setItem(storageKey, value);
    } catch {
      // The current document can still honor the choice.
    }
    applyChoice(value);
  }

  function trackLink(event) {
    if (choice !== 'granted' || event.defaultPrevented) return;
    const link = event.target.closest?.('a[href]');
    if (!link) return;

    const url = new URL(link.href);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
    if (url.origin === window.location.origin && url.pathname === '/assets/kamil-pietka-cv.pdf') {
      gtag('event', 'cv_download');
    } else if (['github.com', 'www.github.com'].includes(url.hostname)) {
      gtag('event', 'github_click');
    } else if (['linkedin.com', 'www.linkedin.com'].includes(url.hostname)) {
      gtag('event', 'linkedin_click');
    }
  }

  settings.addEventListener('click', () => {
    if (!banner.hidden) {
      closeOptions();
      return;
    }
    openedFromSettings = true;
    showOptions(true);
    title.focus({ preventScroll: true });
  });
  banner.addEventListener('keydown', event => {
    if (event.key === 'Escape' && openedFromSettings) {
      event.preventDefault();
      closeOptions();
    }
  });
  accept.addEventListener('click', () => saveChoice('granted'));
  reject.addEventListener('click', () => saveChoice('denied'));
  document.addEventListener('click', trackLink);
  document.addEventListener('auxclick', event => {
    if (event.button === 1) trackLink(event);
  });
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) restoreChoice();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) restoreChoice();
  });

  const resizeObserver = new ResizeObserver(() => {
    const clearance = banner.hidden ? 0 : window.innerHeight - banner.getBoundingClientRect().top + 12;
    document.documentElement.style.setProperty('--consent-clearance', clearance + 'px');
  });
  resizeObserver.observe(banner);
  document.addEventListener('focusin', event => {
    if (banner.hidden || banner.contains(event.target)) return;
    const overlap = event.target.getBoundingClientRect().bottom - banner.getBoundingClientRect().top;
    if (overlap > 0) window.scrollBy({ top: overlap + 12, behavior: 'instant' });
  });

  settings.hidden = false;
  restoreChoice();
})();
