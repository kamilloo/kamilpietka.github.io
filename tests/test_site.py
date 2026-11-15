"""Checks the actual generated deployment files; no third-party dependencies."""
import json
import re
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
BASE = 'https://kamilpietka.dev'
PROJECTS = json.loads((ROOT / 'content/projects.json').read_text())

class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

    def find(self, tag, **attrs):
        return [a for t, a in self.tags if t == tag and all(a.get(k) == v for k, v in attrs.items())]

class SiteTests(unittest.TestCase):
    def test_pages_metadata_and_schema(self):
        titles, descriptions = set(), set()
        for project in PROJECTS:
            with self.subTest(project=project['slug']):
                path = '/projects/' + project['route'] + '/'
                text = (PUBLIC / path.strip('/') / 'index.html').read_text()
                doc = Document(text)
                self.assertEqual(len(doc.find('h1')), 1)
                self.assertEqual(doc.find('html')[0]['lang'], 'en')
                title = re.findall(r'<title>(.*?)</title>', text)
                description = doc.find('meta', name='description')
                self.assertEqual(len(title), 1)
                self.assertEqual(len(description), 1)
                self.assertNotIn(title[0], titles)
                self.assertNotIn(description[0]['content'], descriptions)
                titles.add(title[0]); descriptions.add(description[0]['content'])
                self.assertEqual(doc.find('link', rel='canonical'), [{'rel':'canonical', 'href': BASE + path}])
                self.assertEqual(doc.find('meta', property='og:url')[0]['content'], BASE + path)
                for key in ('og:title', 'og:description', 'og:type'):
                    self.assertEqual(len(doc.find('meta', property=key)), 1)
                for key in ('twitter:title', 'twitter:description', 'twitter:card'):
                    self.assertEqual(len(doc.find('meta', name=key)), 1)
                self.assertNotIn('noindex', text.lower())
                schema = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', text, re.S)[1])
                graph = schema['@graph']
                self.assertEqual({e['@type'] for e in graph}, {'WebPage', 'BreadcrumbList', 'CreativeWork'})
                self.assertEqual(len({e['@id'] for e in graph}), 3)
                self.assertEqual(graph[0]['url'], BASE + path)
                self.assertEqual(graph[0]['isPartOf']['@id'], BASE + '/#website')
                self.assertEqual(graph[2]['author']['@id'], BASE + '/#person')
                self.assertTrue(doc.find('main')); self.assertTrue(doc.find('article'))
                self.assertGreaterEqual(len(doc.find('h2')), 7)

    def test_sitemap_and_home_discovery(self):
        urls = [e.text for e in ET.parse(PUBLIC / 'sitemap.xml').findall('.//{*}loc')]
        expected = [BASE + '/'] + [BASE + '/projects/' + p['route'] + '/' for p in PROJECTS]
        self.assertCountEqual(urls, expected)
        self.assertEqual(len(urls), len(set(urls)))
        home = Document((PUBLIC / 'index.html').read_text())
        for url in expected[1:]:
            path = urlsplit(url).path
            self.assertTrue(any(urlsplit(a['href']).path.lstrip('/') == path.lstrip('/') for a in home.find('a') if 'href' in a))
        self.assertNotIn('Disallow: /', (PUBLIC / 'robots.txt').read_text())

    def test_all_internal_links_and_fragments(self):
        for source in PUBLIC.rglob('*.html'):
            doc = Document(source.read_text())
            for tag, attrs in doc.tags:
                if tag not in ('a', 'link', 'script', 'source', 'video'):
                    continue
                value = attrs.get('href') or attrs.get('src') or attrs.get('poster')
                if not value or urlsplit(value).scheme or value.startswith('//'):
                    continue
                url = urlsplit(value)
                path = unquote(url.path)
                target = PUBLIC / path.lstrip('/') if path.startswith('/') else source.parent / path
                if not path:
                    target = source
                if target.is_dir():
                    target /= 'index.html'
                self.assertTrue(target.is_file(), f'{source}: {value}')
                if url.fragment and target.suffix == '.html':
                    target_doc = Document(target.read_text())
                    self.assertTrue(any(a.get('id') == url.fragment for _, a in target_doc.tags), f'Missing fragment: {value}')

    def test_existing_home_links_preserved(self):
        # Frozen public destinations and interaction hooks from the original homepage.
        text = (PUBLIC / 'index.html').read_text()
        for value in ['https://api-vouchers.kamilpietka.dev/', 'https://github.com/kamilloo/vouchers-app', 'https://mojabiblioteka.app/', 'assets/ai-job-hunter-demo-en.mp4', 'data-project-list', 'data-view="ai-systems"', 'Backend &amp; Cloud Software Engineer', 'Skills are claims. Projects are proof.']:
            self.assertIn(value, text)
        self.assertEqual(len(Document(text).find('article', **{'data-project': 'ai-job-hunter'})), 1)
        self.assertNotIn('{{', text)

if __name__ == '__main__':
    unittest.main()
