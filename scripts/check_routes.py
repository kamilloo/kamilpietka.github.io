#!/usr/bin/env python3
"""Check a running static preview; pass its base URL as the first argument."""
import json
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen

base = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765'
root = Path(__file__).resolve().parents[1]
for project in json.loads((root / 'content/projects.json').read_text()):
    path = '/projects/' + project['route'] + '/'
    for route in (path, path.rstrip('/')):
        with urlopen(base + route) as response:
            assert response.status == 200
            assert response.geturl() == base + path
            assert project['title'] in response.read().decode()
            print(f'200 {route}')
try:
    urlopen(base + '/projects/nonexistent/')
    raise AssertionError('Unknown project must return 404')
except HTTPError as error:
    assert error.code == 404
    print('404 /projects/nonexistent/')
