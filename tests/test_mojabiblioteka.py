import hashlib
import json
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path

from scripts.package_mojabiblioteka import MARKETING, REQUIRED, ROOT, package

PLAY = 'https://play.google.com/store/apps/details?id=com.kamilloo.mylibrary'
SUPPORT = 'https://buycoffee.to/moja-biblioteka'
COMMIT = 'a' * 40


class Elements(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = {}
        self.feed(html)

    def handle_starttag(self, tag, attributes):
        self.tags.setdefault(tag, []).append(dict(attributes))


class MojaBibliotekaTest(unittest.TestCase):
    def test_marketing_links_and_branding(self):
        html = (MARKETING / 'index.html').read_text()
        elements = Elements(html).tags
        self.assertIn('Użyj w przeglądarce', html)
        self.assertIn('Zainstaluj na Androidzie', html)
        links = {element['href']: element for element in elements['a']}
        for destination in ('/app/', PLAY, './privacy/', './terms/', './returns/'):
            self.assertIn(destination, links)
        self.assertEqual(links[SUPPORT]['target'], '_blank')
        self.assertEqual(set(links[SUPPORT]['rel'].split()), {'noopener', 'noreferrer'})
        logo = next(image for image in elements['img'] if image['class'] == 'brand-mark')
        self.assertEqual(logo['src'], 'assets/logo-80.png')
        self.assertLess((MARKETING / logo['src']).stat().st_size, 20_000)
        for route in ('privacy', 'terms', 'returns'):
            self.assertTrue((MARKETING / route / 'index.html').is_file())

    def make_flutter_fixture(self, web):
        for name in REQUIRED:
            path = web / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(name)
        (web / 'index.html').write_text('<base href="/app/">')
        (web / 'assets/assets/support.json').write_text(json.dumps({'url': SUPPORT}))
        (web / 'manifest.webmanifest').write_text(json.dumps({
            'scope': './', 'start_url': './?app=1', 'icons': [{'src': 'icons/logo-192.png'}],
        }))
        worker = 'const build = /* BUILD_INVENTORY */ null;\n'
        revision = hashlib.sha256(worker.encode())
        for name in sorted(REQUIRED):
            revision.update(name.encode())
            revision.update((web / name).read_bytes())
        inventory = {'files': sorted(REQUIRED), 'revision': revision.hexdigest()}
        (web / 'offline-worker.js').write_text(worker.replace(
            '/* BUILD_INVENTORY */ null', json.dumps(inventory)))

    def test_complete_package_and_preservation(self):
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            web = parent / 'web'
            self.make_flutter_fixture(web)
            unrelated = parent / 'unrelated'
            unrelated.write_text('preserve me')
            release = parent / 'release'
            portfolio = ROOT / 'public'
            before = {path.relative_to(portfolio): path.stat().st_mtime_ns
                      for path in portfolio.rglob('*') if path.is_file()}

            package(web, release, COMMIT)
            for name in REQUIRED | {'offline-worker.js'}:
                self.assertEqual((release / 'app' / name).read_bytes(), (web / name).read_bytes())
            for route in ('index.html', 'privacy/index.html', 'terms/index.html', 'returns/index.html'):
                self.assertEqual((release / route).read_bytes(), (MARKETING / route).read_bytes())
            self.assertEqual(json.loads((release / 'release.json').read_text())['flutter_source_commit'], COMMIT)
            self.assertEqual(unrelated.read_text(), 'preserve me')
            self.assertEqual(before, {path.relative_to(portfolio): path.stat().st_mtime_ns
                                      for path in portfolio.rglob('*') if path.is_file()})
            self.assertIn(Path('index.html'), before)
            self.assertIn(Path('projects/mojabiblioteka/index.html'), before)
            with self.assertRaises(FileExistsError):
                package(web, release, COMMIT)

    def test_rejects_incomplete_or_changed_flutter_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            web = parent / 'web'
            release = parent / 'release'
            self.make_flutter_fixture(web)
            (web / 'main.dart.js').write_text('new content')
            with self.assertRaisesRegex(ValueError, 'changed after'):
                package(web, release, COMMIT)
            (web / 'sqlite3.wasm').unlink()
            with self.assertRaisesRegex(ValueError, 'sqlite3.wasm'):
                package(web, release, COMMIT)
            self.assertFalse(release.exists())


if __name__ == '__main__':
    unittest.main()
