if (/Android/i.test(navigator.userAgent)) {
  for (const actions of document.querySelectorAll('.platform-actions')) {
    const [safari, android] = actions.children;
    safari.querySelector('a').classList.remove('primary');
    android.querySelector('a').classList.add('primary');
    actions.prepend(android);
  }
}
