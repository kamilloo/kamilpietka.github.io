#!/usr/bin/env python3
"""Generate deployable HTML using only the Python standard library."""
import json
import re
from html import escape
from pathlib import Path
from string import Template

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://kamilpietka.dev'

def project_path(project):
    return f"/projects/{project['route']}/"

def links(items, buttons=False):
    css = ' class="button"' if buttons else ''
    return '\n'.join(f'<a{css} href="{escape(item["url"], quote=True)}">{escape(item["label"])}</a>' for item in items)

def build():
    measurement_id = json.loads((ROOT / 'content/analytics.json').read_text())['measurement_id']
    if not isinstance(measurement_id, str) or (measurement_id and not re.fullmatch(r'G-[A-Z0-9]+', measurement_id)):
        raise ValueError('Set measurement_id in content/analytics.json to a GA4 Measurement ID or an empty string.')
    analytics_settings = (ROOT / 'templates/analytics-settings.html').read_text().strip()
    analytics = Template((ROOT / 'templates/analytics.html').read_text())

    projects = json.loads((ROOT / 'content/projects.json').read_text())
    by_slug = {p['slug']: p for p in projects}
    home = (ROOT / 'templates/home.html').read_text()
    for p in projects:
        for key in ('title', 'category', 'summary'):
            home = home.replace('{{' + p['slug'] + '.' + key + '}}', escape(p[key]))
    home = home.replace('{{analytics_settings}}', analytics_settings)
    home = home.replace('{{analytics}}', analytics.substitute(measurement_id=measurement_id, project='').strip())
    (ROOT / 'public/index.html').write_text(home)
    template = Template((ROOT / 'templates/case-study.html').read_text())
    for i, p in enumerate(projects):
        url = BASE + project_path(p)
        graph = [
            {'@type': 'WebPage', '@id': url + '#webpage', 'url': url, 'name': p['seo']['title'], 'description': p['seo']['description'], 'inLanguage': 'en', 'isPartOf': {'@id': BASE + '/#website'}, 'breadcrumb': {'@id': url + '#breadcrumbs'}, 'mainEntity': {'@id': url + '#project'}},
            {'@type': 'BreadcrumbList', '@id': url + '#breadcrumbs', 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE + '/'},
                {'@type': 'ListItem', 'position': 2, 'name': p['title'], 'item': url}]},
            {'@type': 'CreativeWork', '@id': url + '#project', 'name': p['title'], 'description': p['summary'], 'author': {'@id': BASE + '/#person'}, 'mainEntityOfPage': {'@id': url + '#webpage'}}]
        sections = '\n'.join(f'<section aria-labelledby="section-{n}"><h2 id="section-{n}">{escape(s["title"])}</h2>' + ''.join(f'<p>{escape(t)}</p>' for t in s['paragraphs']) + '</section>' for n, s in enumerate(p['sections']) if s['paragraphs'])
        related = ''.join(f'<article class="strength-card"><h3><a href="{project_path(by_slug[slug])}">{escape(by_slug[slug]["title"])}</a></h3><p>{escape(by_slug[slug]["category"])}</p></article>' for slug in p['related'])
        next_p = projects[(i + 1) % len(projects)]
        values = dict(title=escape(p['title']), seo_title=escape(p['seo']['title']), description=escape(p['seo']['description'], quote=True), url=url, category=escape(p['category']), summary=escape(p['summary']), tags=''.join(f'<span>{escape(t)}</span>' for t in p['technologies']), links=links(p['links'], True), sections=sections, sources=links(p['sources']), related=related, next_url=project_path(next_p), next_title=escape(next_p['title']), structured_data=json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False).replace('<', '\\u003c'))
        values['analytics_settings'] = analytics_settings
        values['analytics'] = analytics.substitute(measurement_id=measurement_id, project=escape(p['slug'], quote=True)).strip()
        destination = ROOT / 'public' / project_path(p).strip('/') / 'index.html'
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(template.substitute(values))
    urls = [BASE + '/'] + [BASE + project_path(p) for p in projects]
    (ROOT / 'public/sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>{escape(url)}</loc></url>\n' for url in urls) + '</urlset>\n')
    print(f'Built homepage, {len(projects)} case studies and sitemap.')

if __name__ == '__main__':
    build()
