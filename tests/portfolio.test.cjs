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
