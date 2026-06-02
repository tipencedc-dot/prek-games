# Play & Learn — Pre-K games

Three voice-guided learning games for a young child, as an installable web app (PWA):

- **🐍 Word Snake** — a slithering snake (that becomes a dragon!) grows by eating
  letters in order to build a word, shown with a picture. Targets letter sounds and blending.
- **🎣 Sasquatch Fishing** — picture-based addition/subtraction with a number pad
  (no guessing); a video plays for right and wrong answers. Difficulty adapts as he improves.
- **🕷️ Spider-Man Spelling** — fill in the missing letter to finish a word; Spider-Man swings in.

Works offline once installed (add to the home screen). Progress is stored only on the device.

## Tuning

- Word lists: `WORDS` in `js/wordsnake.js` and `BASE`/`ADV` in `js/spelling.js`
- Math difficulty ladder: `plan(lvl)` in `js/fishing.js`
- Snake speed / dragon threshold: top of `js/wordsnake.js`
- Break frequency & spoken phrases: `js/shell.js`
