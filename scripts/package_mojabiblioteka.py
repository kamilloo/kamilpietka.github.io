#!/usr/bin/env python3
"""Assemble the independent Moja Biblioteka Caddy document root."""
import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
MARKETING = ROOT / 'mojabiblioteka'
REQUIRED = {
    'index.html', 'entry.css', 'entry.js', 'flutter_bootstrap.js', 'main.dart.js',
    'sqlite3.wasm', 'sqflite_sw.js', 'zxing.min.js', 'zxing-LICENSE.txt',
    'canvaskit/canvaskit.wasm', 'assets/assets/support.json', 'manifest.webmanifest',
    'icons/logo-32.png', 'icons/logo-80.png', 'icons/logo-180.png',
    'icons/logo-192.png', 'icons/logo-512.png',
}


def validate_flutter(web):
    if web.is_symlink() or any(path.is_symlink() for path in web.rglob('*')):
        raise ValueError('Flutter output must contain regular files and directories only.')
    worker = (web / 'offline-worker.js').read_text(encoding='utf-8')
    match = re.search(r'^const build = (\{.+\});$', worker, re.MULTILINE)
    if not match:
        raise ValueError('Run tool/prepare_web.mjs to generate the offline inventory.')
    inventory = json.loads(match[1])
    files = {path.relative_to(web).as_posix() for path in web.rglob('*')
             if path.is_file() and not path.name.startswith('.') and path.suffix != '.map'}
    files -= {'offline-worker.js', 'flutter_service_worker.js'}
    missing = REQUIRED - files
    if missing or set(inventory['files']) != files:
        raise ValueError(f'Incomplete Flutter offline inventory. Missing required files: {sorted(missing)}')
    template = worker[:match.start(1)] + '/* BUILD_INVENTORY */ null' + worker[match.end(1):]
    revision = hashlib.sha256(template.encode())
    for path in sorted(files):
        revision.update(path.encode())
        revision.update((web / path).read_bytes())
    if revision.hexdigest() != inventory['revision']:
        raise ValueError('Flutter files changed after the offline inventory was generated.')
    if '<base href="/app/">' not in (web / 'index.html').read_text(encoding='utf-8'):
        raise ValueError('Build Flutter with --base-href /app/.')
    manifest = json.loads((web / 'manifest.webmanifest').read_text(encoding='utf-8'))
    if (manifest['scope'] != './' or manifest['start_url'] != './?app=1'
            or any(icon['src'] not in files for icon in manifest['icons'])):
        raise ValueError('The web manifest must stay inside the application scope.')
    support = json.loads((web / 'assets/assets/support.json').read_text(encoding='utf-8'))
    if support['url'] != 'https://buycoffee.to/moja-biblioteka':
        raise ValueError('Unexpected Flutter support destination.')
    return inventory['revision']


def package(web, destination, source_commit):
    if not re.fullmatch(r'[0-9a-f]{40}', source_commit):
        raise ValueError('Provide the full Flutter source commit SHA.')
    if destination.exists() or destination.is_symlink():
        raise FileExistsError(f'Choose a new release directory: {destination}')
    if ROOT in destination.parents and destination.relative_to(ROOT).parts[0] in {
        'public', 'mojabiblioteka',
    }:
        raise ValueError('Stage the release outside portfolio and marketing source trees.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix='.mojabiblioteka-', dir=destination.parent) as temporary:
        release = Path(temporary) / 'release'
        shutil.copytree(MARKETING, release)
        app = release / 'app'
        shutil.copytree(web, app, symlinks=True)
        revision = validate_flutter(app)
        for route in ('index.html', 'privacy/index.html', 'terms/index.html', 'returns/index.html'):
            if not (release / route).is_file():
                raise ValueError(f'Missing marketing or legal page: {route}')
        (release / 'release.json').write_text(json.dumps({
            'flutter_source_commit': source_commit,
            'offline_revision': revision,
        }, indent=2) + '\n', encoding='utf-8')
        # Reserve the destination so simultaneous packaging jobs cannot replace each other.
        destination.mkdir()
        release.rename(destination)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--web-build', required=True, type=Path)
    parser.add_argument('--flutter-commit', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    try:
        package(args.web_build.absolute(), args.output.parent.resolve() / args.output.name, args.flutter_commit)
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, f'{error}\n')
