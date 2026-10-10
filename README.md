# Jathr / جذر

**Arabic-first word games built around language, logic, and careful data engineering.**

Jathr is a mobile-first browser project featuring two Arabic word games: a root-finding challenge based on Arabic morphology and a five-letter guessing game. It is built with plain HTML, CSS, and vanilla JavaScript, with no runtime dependencies or build step.

> **Portfolio highlights:** Arabic text normalization · deterministic daily challenges · persistent game state · accessibility · source-attributed lexical data · automated validation and tests · GitHub Pages deployment

## What’s inside

| Game | Challenge | Content |
| --- | --- | --- |
| **Jathr — جذر** | Infer a displayed word’s three-letter Arabic root in six attempts, with progressive hints. | 600 words across four difficulty levels |
| **Five-letter game** | Guess a hidden five-letter Arabic word in six attempts with duplicate-aware feedback. | 1,000 solutions + 6,872 allowed guesses |

### Engineering highlights

- **Arabic-aware text processing** — NFC normalization, tashkeel/tatweel handling, Alef normalization, and deliberate treatment of Arabic letter variants.
- **Reliable game state** — daily and practice modes, persistent statistics and preferences, migration of legacy saved games, and safe storage fallbacks.
- **Accessible interaction** — RTL layout, Arabic keyboard support, visible focus, reduced-motion support, WCAG AA text contrast, and shape-assisted feedback.
- **Data provenance** — source attribution, recorded dataset fingerprints, licensing documentation, and validation scripts for lexical data.
- **Quality checks** — automated tests for game logic, duplicate letters, normalization, dates, migrations, corrupt storage, attribution, and immutable daily data.

## Run locally

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Any static host works, including GitHub Pages. The project has **no backend, package install, or build step**. Google Fonts are optional; local fallbacks and the local arabesque SVG work offline. `file://` is not supported because the games fetch JSON data.

---

## Technical documentation

## Games and stability

- **Jathr:** infer the displayed word’s 3-letter root in six attempts. Hints reveal the pattern after two wrong guesses and a short meaning after four. 600 words, 150 at each level. Daily uses **only `words.slice(0, 120)`**. Those original objects/order are frozen in `tests/fixtures/original120.json`; never edit or reorder them. All additions are practice-only.
- **Five-letter game:** its display name is defined only by `NAME` in `js/wordgame.js`. Guess a hidden word in six attempts. 1,000 source-attested solutions and 6,872 allowed guesses; invalid guesses do not consume an attempt. Solutions are noun/adjective/verb headwords, excluding explicit proper names and marked rare/archaic forms, ranked using subtitle frequency. This is a corpus-based commonness heuristic, not a certified grade for every speaker. The stored solution order is guarded by `data/words5-order.sha256`; never reorder it after release.
- Both daily schedules use UTC, day 1 = 2026-01-01, and wrap within their fixed pool. Practice picks randomly without immediately repeating the current root (Jathr) or word (five-letter game). The single-item fallback is safe.
- Exact matches consume letters first; yellow matches consume only remaining occurrences. Feedback always has distinct ● / ▲ / × shapes. Sharing contains only game/day, score and colored squares, never the answer. Clipboard failure opens a selectable text dialog.

## Difficulty and persistence

Jathr practice has four persisted segments: **1 سهل** = very common, transparent simple patterns (فاعل، مفعول، فعل); **2 متوسط** = familiar derived forms (تفعيل، انفعال، مفعلة); **3 متقدم** = less frequent or longer patterns (استفعال، تفاعل، مفاعلة); **4 نخبة** = literary/less familiar words and less obvious roots. Ratings and meanings are editorial; historical entries retain their previous ratings. Daily ignores this selector. Legacy `all` migrates to the saved practice word’s level, or level 1 when there is no valid saved word.

Existing `jathr.v1` rounds, stats and preferences remain compatible. The second game uses **`jathr.wordgame.v1`** exclusively, with separate daily/practice rounds and stats. In each game, stats combine its two modes; streak means consecutive completed wins, not calendar days. Unfinished games do not count. Data stays in this browser; there is no cross-device synchronization. Blocked/full storage shows a notice without preventing play. Mute, motion and color-shape preferences remain shared; audio starts only after interaction. Reduced-motion OS settings always take priority.

## Letters and accessibility

Both games normalize NFC, remove tashkeel/tatweel/spaces, and map **أ إ آ ٱ → ا**. **ة ى ء ئ ؤ stay distinct.** A five-letter word means exactly five characters after normalization. Every accepted character is on the on-screen keyboard. Enter submits and Backspace deletes; Arabic physical keyboards work. Dialogs suppress game shortcuts. RTL, Arabic accessible names, visible focus, WCAG AA text contrast, reduced motion and a dedicated source-icon gutter are maintained. Root morphology validation additionally rejects weak/hamzated/doubled roots.

## Sources and licensing

The corner book icon opens a native dialog generated from `data/sources.json`, including authors, license links, changes and per-game counts. New entries preserve `source` and `sourceWord` for their Wiktionary entry URL/history. See [data/LICENSE.md](data/LICENSE.md).

- **Wiktionary via Kaikki**, CC BY-SA 4.0: 455 new root-game entries, 1,000 solutions and 6,872 allowed guesses. Actual snapshot: enwiktionary 2026-09-02, extracted 2026-10-03, downloaded 2026-10-09; SHA-256 recorded. Selected headwords, roots/patterns and short Arabic meanings were editorially reviewed; definitions were not copied verbatim. Inferred roots and language-knowledge curation are identified in `data/jathir-review.json`. Derived lexical data and selection are CC BY-SA 4.0; code licensing is separate.
- **FrequencyWords / OpenSubtitles 2018**, CC BY-SA 4.0 content: used only to rank commonness, not to establish lexical validity. Download and fingerprint are recorded.
- **Legacy 145 entries:** inherited from the linked repository revision, without prior individual dictionary citations or a stated data license. We do not invent retroactive citations or relicense them. To honor the immutable-original requirement, the first 120 source IDs live in `data/legacy-sources.json` rather than altering those objects. This is an explicitly disclosed provenance limitation.

No commercial dictionary was used. An optional maintainer audit, `python3 scripts/audit-source.py /path/to/download.jsonl`, verifies the snapshot fingerprint and every new headword against the actual source (Python 3.11+ standard library only). This is not a runtime/build step.

## Checks

Node 18+; no install required:

```sh
node --test tests/*.test.js
node scripts/validate-words.js
node scripts/validate-words5.js
```

Both CI and Pages run all three commands before publishing. Tests cover feedback, duplicates, normalization, dates, selection, migration, corrupt storage, attribution, immutable daily data and source counts. UI adapter tests supplement pure logic tests.

If Playwright and Chromium are already available, run `JATHIR_URL=http://localhost:8000 node tests/browser/experience.cjs`. Optional `CHROMIUM_PATH` selects Chromium (default `/usr/bin/chromium`). This development-only script checks both games, 320/390/desktop layouts, retries, blocked storage, sharing, preference persistence, midnight rollover and the source gutter; screenshots go to `docs/screenshots/`. The site itself has no Playwright dependency.
