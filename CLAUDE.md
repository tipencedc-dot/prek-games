# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Play & Learn" — three voice-guided learning games for a pre-K child, shipped as an installable, offline-capable PWA. Pure vanilla HTML/CSS/JS: no package.json, no build step, no dependencies, no test framework or linter. The audience is a young child on a tablet, so design choices favor forgiveness (no fail states), large touch targets, and spoken guidance over text.

## Running locally

Serve the directory over HTTP (speech synthesis and service workers need http/https, not file://):

```bash
python3 -m http.server 8733
```

Port **8733 is special**: `js/main.js` skips service-worker registration on that port so edits aren't cached during development. Any other port (or a deployed origin) registers `sw.js` and caches aggressively.

## Service worker cache — must bump on every asset change

`sw.js` uses a cache-first strategy keyed on the `CACHE` constant (e.g. `"play-learn-v15"`). When you change **any** file listed in its `ASSETS` array (HTML, CSS, JS, icons, videos), increment the version in `CACHE`, or installed clients will keep serving the stale copy. The `controllerchange` listener in `main.js` reloads the page once when a new worker activates. If you add a new static asset, also add it to `ASSETS`.

## Architecture

No modules or bundler — five scripts are loaded in order by `index.html`, each an IIFE exposing one global:

- `js/shell.js` → `window.Shell` — shared services: text-to-speech (`speak`, `sayLetterSound`, `sayWordSounds`, `speakSequence`), confetti/reward, screen navigation (`Shell.go`), mute state, the 5-minute "wiggle break" timer, RNG helpers, and localStorage progress (`getProgress`/`bumpProgress`/`setProgressMax` under key `pl_progress`).
- `js/wordsnake.js` → `window.WordSnake` — canvas snake game (spell words by eating letters).
- `js/fishing.js` → `window.Fishing` — picture-based math with a number pad and reward/wrong videos.
- `js/spelling.js` → `window.Spelling` — fill-in-the-missing-letter game.
- `js/main.js` — wires it together: calls each game's `init()` on DOMContentLoaded, routes home-card taps to `openGame()`, back buttons to `goHome()`, and pauses/resumes the snake during wiggle breaks via `Shell.onBreakStart`/`onBreakEnd`.

Load order matters: `shell.js` must come first (games call `Shell.*` at init), and `main.js` last.

**Game contract:** each game exposes `init()` (bind DOM once), `start()` (reset + begin), `stop()`. WordSnake additionally has `pause()`/`resume()` for the break overlay. Screens are `<section class="screen">` elements in `index.html` toggled by `Shell.go(id)`; the section `id` doubles as the game key used in `data-game` attributes.

**Cross-game state via localStorage:**
- `pl_progress` — counters driving adaptive difficulty: `snakeWords` unlocks the ADV word pool in Word Snake at 10, `spellWords` unlocks ADV in Spelling at 12, `fishBest` is the best fishing level (a new session resumes one level below it).
- `pl_spelled` — set of words completed in Word Snake; Spider-Man Spelling puts these first in its rotation so games reinforce each other.

**Speech is the primary UI.** All audio goes through `Shell.speak` and friends — don't create `SpeechSynthesisUtterance` directly in games. The first pointer tap "primes" speech for iOS/Safari (see `main.js`). Anything gated on speech `onend` callbacks needs a `setTimeout` safety net so the child is never stuck if speech stalls or is muted (see `guidedCount` in `fishing.js` and `choose._t` in `spelling.js` for the pattern).

## Tuning knobs (from README)

- Word lists: `WORDS`/`ADV` in `js/wordsnake.js`, `BASE`/`ADV` in `js/spelling.js`
- Math difficulty ladder: `plan(lvl)` in `js/fishing.js`
- Snake speed / dragon threshold: `SPEED` / `DRAGON_AT` at the top of `js/wordsnake.js`
- Break frequency (`BREAK_MS`) & spoken phrases: `js/shell.js`

## Design conventions

- Never punish the player: no death states (the snake bumps walls and waits), wrong answers get a gentle spoken hint or a guided teach-back, difficulty steps down after repeated misses.
- Kid-facing text is minimal; instructions are spoken. Emoji serve as game art (plus a few videos/images in `assets/`).
- Difficulty adapts silently via the `pl_progress` counters rather than settings screens.
