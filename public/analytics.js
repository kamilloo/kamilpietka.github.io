(() => {
  'use strict';

  const controls = document.getElementById('analytics-consent');
  if (!controls) return;
  const { measurementId, project } = controls.dataset;
  if (!/^G-[A-Z0-9]+$/.test(measurementId)) return;

  const settings = document.getElementById('analytics-settings');
  const options = document.getElementById('analytics-options');
  const accept = options.querySelector('[data-analytics-choice="granted"]');
  const reject = options.querySelector('[data-analytics-choice="denied"]');
  const page = new URL(document.querySelector('link[rel="canonical"]').href);
  const storageKey = 'portfolio-analytics-consent-v1';
  const disableKey = 'ga-disable-' + measurementId;
  let choice = null;
  let initialized = false;

  function gtag() {
    window.dataLayer.push(arguments);
  }

  function startAnalytics() {
    window[disableKey] = false;
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
    gtag('js', new Date());
    gtag('config', measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: page.href,
      page_referrer: ''
    });
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
    options.hidden = !open;
    settings.setAttribute('aria-expanded', String(open));
  }

  function applyChoice(value) {
    choice = value === 'granted' || value === 'denied' ? value : null;
    window[disableKey] = choice !== 'granted';
    if (choice === 'granted') startAnalytics();
    else if (choice === 'denied' || initialized) clearAnalyticsCookies();
    showOptions(choice === null);
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
    settings.focus();
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
    showOptions(options.hidden);
    if (!options.hidden) accept.focus();
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

  restoreChoice();
  controls.hidden = false;
})();
