#!/usr/bin/env python3
"""Optional maintainer audit against the actual Kaikki download (standard library only).
Usage: python3 scripts/audit-source.py /path/to/kaikki.org-dictionary-Arabic.jsonl
The downloaded snapshot is not needed to run, host, or test the application.
"""
import hashlib
import json
from pathlib import Path
import sys

base = Path(__file__).resolve().parent.parent
snapshot = Path(sys.argv[1])
sources = json.loads((base / 'data/sources.json').read_text())
expected = next(s['sha256'] for s in sources if s['id'] == 'enwiktionary')
with snapshot.open('rb') as stream:
    assert hashlib.file_digest(stream, 'sha256').hexdigest() == expected, 'Unexpected source snapshot'
headwords = set()
with snapshot.open() as stream:
    for line in stream:
        entry = json.loads(line)
        if entry.get('lang_code') == 'ar' and entry.get('pos') in ('noun', 'adj', 'verb', 'adv'):
            headwords.add(entry['word'])
count = 0
for filename in ('words', 'words5', 'allowed5'):
    for entry in json.loads((base / f'data/{filename}.json').read_text()):
        if entry.get('source') == 'enwiktionary':
            assert entry['sourceWord'] in headwords, f"Unattested: {entry['word']}"
            count += 1
print(f'Confirmed {count} source references against the downloaded dictionary snapshot.')
