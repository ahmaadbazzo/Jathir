# Jathr (جذر)

A mobile-first Arabic root-guessing game built with HTML, CSS and vanilla JavaScript. All gameplay and persistence run in the browser. No backend, dependencies, package installation or build step.

## Run

From this directory, serve the static files:

```sh
python3 -m http.server 8000
```

Open **http://localhost:8000**. Any static web server or static host works. Opening `index.html` directly with `file://` is unsupported because browsers restrict fetching the JSON word list. The server only serves files; it performs no game logic. Tajawal is loaded from Google Fonts, with a sans-serif fallback if unavailable.

## Rules

- Guess the displayed Arabic word's three-letter root in up to six attempts. For example, **مكتبة → ك ت ب**.
- Green means the letter and position match. Yellow means the letter appears elsewhere in the root. Gray means no unused occurrence of that letter remains. Exact matches are allocated first, so duplicate guesses never receive more matches than the root contains.
- The morphological pattern appears after two wrong guesses; a short Arabic meaning appears after four.
- Use the on-screen Arabic keyboard, or a physical keyboard with an Arabic layout. Enter submits and Backspace deletes. There is no text input that invokes a device keyboard.
- أ, إ, آ, ا (and ٱ) compare as ا. Tashkeel, spaces and tatweel are ignored.
- **Daily:** one shared puzzle per UTC date, starting with day 1 on January 1, 2026. Selection cycles through the original 120-entry list; the 25 appended expert entries are practice-only, preserving daily selection and saved indices. Daily attempts resume after refreshing; completed daily rounds cannot be replayed that day.
- **Practice:** random puzzles, unlimited rounds. The next puzzle has a different root from the current one.
- Statistics combine both modes: completed rounds, win percentage, consecutive winning rounds, best streak and winning guess distribution. An unfinished round is not counted. A loss resets the streak. Stats, active rounds and color-blind preference are saved to this browser's `localStorage`.
- Sharing copies the day number, score and 🟩🟨⬜ grid without the word or root. Practice shares are labeled as practice. When clipboard access is unavailable, a selectable text dialog provides manual copying.

The interface is RTL throughout, with Arabic accessible labels, keyboard focus indicators, native dialogs, live feedback and reduced-motion support. Enable **تمييز بالأشكال** to add ● / ▲ / × markers and stripes alongside colors.

## Validate and test

Node.js 18 or later is sufficient; nothing needs to be installed.

```sh
node --test tests/*.test.js
node scripts/validate-words.js
```

Tests cover positional feedback, duplicate letters (including doubled synthetic roots), hamza and diacritic normalization, invalid input, UTC daily selection, round completion and spoiler-free sharing.

Startup tests also parse every browser script and run UI handlers against a minimal DOM adapter, covering loading, retry, invalid data, saved wins, practice, unavailable storage and clipboard fallback. These are not real-browser layout tests. GitHub Actions runs the checks on pushes and pull requests, and Pages deployment runs them before publishing.

The data validator checks all required fields, difficulty 1–4, exactly three Arabic root letters, sound non-doubled roots, root letters occurring in order within each word, and duplicate normalized words. Shared roots are intentional: different derived words can share a root. The data contains the original 120 words plus 25 advanced practice words, with sound triliteral roots. Some advanced words include vowel marks for clarity; comparison ignores these marks.

## Files

```text
index.html                 Arabic game interface
css/style.css              Responsive styles, animation and shape feedback
js/game.js                 Pure game logic; browser global and CommonJS export
js/ui.js                   DOM, input, rounds, hints, statistics and sharing
js/storage.js              Local storage and statistics updates
data/words.json            Fixed word list (keep order stable for daily puzzles)
scripts/validate-words.js   Node data validator
tests/game.test.js          Node test runner tests
```

The same date and dataset produce the same daily puzzle for everyone. Changing the word list or its order changes daily selection. Data is public, so curious players can inspect solutions; there is no server-side anti-cheat. Storage is device-local and does not synchronize across browsers. Blocked or full storage is handled with an Arabic notice while play remains available.


## Arabic experience

The welcome screen opens daily play, practice, or the expert pool. Practice supports all levels or easy, medium, advanced and expert filters. The original daily pool stays unchanged. Sound effects are synthesized locally with Web Audio after user interaction; no audio files or autoplay are required. Mute and motion preferences persist. Reduced-motion system settings are honored. The geometric SVG ornament is local and remains available without Google Fonts.

For real-browser regression checks, install Playwright in your development environment, start the static server above, and run `node tests/browser/experience.cjs`. Set `CHROMIUM_PATH` if Chromium is not at `/usr/bin/chromium`, and `JATHIR_URL` for another server URL. The script checks 320px/390px layouts, expert play, saved preferences and keyboard input.

### Expanded practice lexicon

600 entries: the original 120 objects and their order are immutable; all additions are practice-only. Daily selection uses `words.slice(0, 120)`, never a difficulty filter. New editorial rubric: **1 سهل** common, transparent words with simple patterns (فاعل، مفعول، فعل); **2 متوسط** familiar derived forms (تفعيل، انفعال، مفعلة); **3 متقدم** less frequent/longer derivations (استفعال، تفاعل، مفاعلة); **4 نخبة** literary or less familiar words with less obvious roots. Frequency is a selection aid, not a certified frequency grade. Existing entries retain their historical ratings for compatibility. New meanings are short editorial paraphrases. Attribution and data licensing: [data/LICENSE.md](data/LICENSE.md).
