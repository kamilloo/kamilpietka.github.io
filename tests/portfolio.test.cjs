// Exercise the unchanged homepage script through its public API and real event handlers.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('focus selection, reordering, history and restoring all projects', () => {
  function element(dataset) {
    return { dataset, classes: new Set(), attributes: {}, events: {},
      classList: { toggle() {} },
      setAttribute(k, v) { this.attributes[k] = v; },
      addEventListener(k, fn) { this.events[k] = fn; } };
  }
  const cards = ['backend', 'cloud', 'ai-systems'].map(s => element({ skills: s }));
  const buttons = ['all', 'backend', 'cloud', 'ai-systems'].map(view => element({ view }));
  const order = [...cards];
  const container = { appendChild(card) { order.splice(order.indexOf(card), 1); order.push(card); } };
  const events = {};
  const heading = {}, description = {};
  let scrolls = 0;
  let scrollBehavior;
  const context = { URL, URLSearchParams, CustomEvent: class { constructor(type, options) { Object.assign(this, {type}, options); } },
    window: { matchMedia() { return {matches: true}; }, location: {search: '', href: 'https://kamilpietka.dev/'}, addEventListener(k, f) {events[k] = f;} },
    history: { pushState(_, __, url) { context.window.location.search = url.search; } },
    document: { querySelectorAll(s) { return s === '[data-skills]' ? cards : buttons; },
      querySelector(s) { return {'[data-project-list]': container, '[data-projects-title]': heading, '[data-projects-description]': description, '#projects': {scrollIntoView(options) {scrolls++; scrollBehavior = options.behavior;}}}[s]; },
      addEventListener(k, f) { events[k] = f; }, dispatchEvent() {} } };
  vm.runInNewContext(fs.readFileSync('public/script.js', 'utf8'), context);
  events.DOMContentLoaded();
  buttons[2].events.click();
  assert.equal(order[0], cards[1]);
  assert.equal(buttons[2].attributes['aria-pressed'], 'true');
  assert.equal(cards[0].dataset.relevance, 'secondary');
  assert.equal(context.window.location.search, '?view=cloud');
  assert.equal(heading.textContent, 'Cloud / AWS');
  assert.equal(scrolls, 1);
  assert.equal(scrollBehavior, "auto");
  buttons[0].events.click();
  assert.deepEqual(order, cards);
  context.window.location.search = '?view=ai-systems';
  events.popstate();
  assert.equal(order[0], cards[2]);
});

function analyticsPage({ id = 'G-TEST123456', project = '', storage = new Map() } = {}) {
  function element() {
    return {
      hidden: true,
      events: {},
      setAttribute(name, value) { this[name] = value; },
      addEventListener(name, handler) { this.events[name] = handler; },
      focus() { this.focused = true; }
    };
  }
  const controls = { ...element(), dataset: { measurementId: id, project } };
  const settings = element();
  const accept = element();
  const reject = element();
  const options = {
    ...element(),
    querySelector(selector) { return selector.includes('granted') ? accept : reject; }
  };
  const origin = 'https://kamilpietka.dev';
  const canonical = project ? origin + '/projects/' + project + '/' : origin + '/';
  const tags = [];
  const cookies = [];
  const document = {
    ...element(),
    getElementById(name) {
      return { 'analytics-consent': controls, 'analytics-settings': settings, 'analytics-options': options }[name];
    },
    querySelector() { return { href: canonical }; },
    head: { append(tag) { tags.push(tag); } },
    createElement() { return {}; },
    get cookie() { return '_ga=1; _ga_TEST123456=2; other=3'; },
    set cookie(value) { cookies.push(value); }
  };
  const window = {
    ...element(),
    location: { origin, href: canonical + '?email=private#fragment' },
    localStorage: {
      getItem(key) { return storage.get(key); },
      setItem(key, value) { storage.set(key, value); }
    }
  };
  vm.runInNewContext(fs.readFileSync('public/analytics.js', 'utf8'), { document, window, URL });
  return {
    controls, settings, accept, reject, options, tags, cookies, canonical, window,
    commands() { return Array.from(window.dataLayer || [], command => [...command]); },
    click(url, { button = 0, defaultPrevented = false } = {}) {
      const target = { closest: () => ({ href: new URL(url, canonical).href }) };
      document.events[button ? 'auxclick' : 'click']({ target, button, defaultPrevented });
    }
  };
}

function analyticsEvents(page) {
  return page.commands().filter(command => command[0] === 'event').map(command => command[1]);
}

test('analytics stays inactive without configuration, on first visit and after rejection', () => {
  const disabled = analyticsPage({ id: '' });
  assert.equal(disabled.controls.hidden, true);
  assert.deepEqual(disabled.tags, []);

  const storage = new Map();
  const page = analyticsPage({ storage });
  assert.equal(page.options.hidden, false);
  page.click('https://github.com/kamilloo');
  assert.deepEqual(page.commands(), []);
  assert.deepEqual(page.tags, []);
  page.reject.events.click();
  assert.equal(page.settings.focused, true);
  const nextPage = analyticsPage({ storage, project: 'vouchers' });
  assert.equal(nextPage.options.hidden, true);
  assert.deepEqual(nextPage.tags, []);
  assert.deepEqual(nextPage.commands(), []);
});

test('analytics sends one page view, records eligible clicks and honors consent changes', () => {
  const storage = new Map();
  const page = analyticsPage({ storage });
  page.accept.events.click();
  assert.equal(page.tags.length, 1);
  assert.equal(page.tags[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-TEST123456');
  assert.deepEqual(page.commands().slice(0, 2).map(command => command[1]), ['default', 'update']);
  const config = page.commands().find(command => command[0] === 'config')[2];
  assert.equal(config.send_page_view, false);
  assert.equal(config.page_location, page.canonical);
  assert.equal(config.page_referrer, '');
  page.click('assets/kamil-pietka-cv.pdf');
  page.click('https://github.com/kamilloo');
  page.click('https://linkedin.com/in/example', { button: 1 });
  page.click('https://github.com.example.test/');
  page.click('https://github.com/kamilloo', { defaultPrevented: true });
  page.click('https://linkedin.com', { button: 2 });
  assert.deepEqual(analyticsEvents(page), ['page_view', 'cv_download', 'github_click', 'linkedin_click']);
  assert.ok(page.commands().filter(command => command[0] === 'event').every(command => command.length === 2));

  const project = analyticsPage({ storage, project: 'vouchers' });
  assert.deepEqual(analyticsEvents(project), ['page_view', 'project_view']);
  assert.equal(project.commands().find(command => command[1] === 'project_view')[2].project_slug, 'vouchers');
  page.settings.events.click();
  assert.equal(page.settings['aria-expanded'], 'true');
  assert.equal(page.accept.focused, true);
  page.reject.events.click();
  assert.equal(page.window['ga-disable-G-TEST123456'], true);
  assert.equal(page.cookies.length, 4);
  project.window.events.pageshow({ persisted: true });
  assert.equal(project.window['ga-disable-G-TEST123456'], true);
  page.click('https://github.com/kamilloo');
  page.settings.events.click();
  page.accept.events.click();
  assert.equal(page.window['ga-disable-G-TEST123456'], false);
  assert.equal(page.tags.length, 1);
  assert.deepEqual(analyticsEvents(page), ['page_view', 'cv_download', 'github_click', 'linkedin_click']);
});
