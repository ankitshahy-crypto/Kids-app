# LittleNest narration — Merry Seesaw voice test render

**For: Grok** — check against the script, swap into the separate INTERNAL TestFlight
build, push for Ankit to listen. **Build 17 (in App Store review) stays untouched.**
**Evaluation only.** The Oct 18 production decision stands: Jessa remains the app
voice unless this test wins AND the commercial-use question for the Meta TTS voice
is resolved or Ankit makes a new explicit risk call. Do not ship this audio in a
production build.

## Contents
- `public/audio/**` — 3,625 MP3s, same paths/filenames as the app uses now.
- `render-manifest.csv` — every row: filename, original CSV text, exact text rendered,
  and any rule applied. This is the check sheet.
- `fixes-applied.csv` — the 22 lines the TTS backend choked on, and what was done.
- `alternates/` — second-choice renders for 3 respelled words (ate, toy, debit);
  swap in if the primary sounds wrong.

## Render settings
- Voice: Merry Seesaw, Meta Shortwave TTS, ID `avocado_v2:qvd_03627`
- MP3, speed 100, English defaults — same settings as the Oct 18 A/B samples.
- Verified: all 3,625 files probed with ffprobe — valid MP3, non-zero duration.
  Total 80.6 MB.

## Rules applied while rendering (all logged per-row in the manifest)
1. `[whispers]` tags stripped (17 files: letters, sounds, and pair- prompts for
   c, ck, h, k, p, t). It's an ElevenLabs stage direction; the words after it were
   rendered normally.
2. `[PHONEME?]` placeholders resolved (44 files: 22 in `letters/`, 22 in `sounds/`).
   The CSV recorded no chosen take, so the FIRST candidate in each row's notes was
   used (ay., ar., chuh., ee., er., eye., nggg., oh., oy., oo., or., ow., shhhh.,
   thhhh., you., wuh.). **Check these first** — especially ng ("nggg."), sh, th.
3. Unspoken `previous_text` lead-ins (e.g. "Say it with me.", "The letter") were
   NOT rendered — only `spoken_text`, per the CSV's own notes.
4. Everything else rendered word for word, including source quirks, preserved
   deliberately so the script check still lines up:
   - `letters/e.mp3` + `prompts/pair-e.mp3`: "eh... as in egg as in egg."
   - `letters/i.mp3` + `prompts/pair-i.mp3`: "ih... as in igloo as in igloo."
   - `sounds/e.mp3` / `sounds/i.mp3`: no final period in source.
   - `stories/w01-i-am/p2-owl.mp3`: "I am a owl."
   - `prompts/cents-110.mp3`: lowercase start in source (no audible effect).

## The 22 backend failures (see fixes-applied.csv)
The TTS backend deterministically returned empty audio for 22 specific lines
(e.g. "Ate.", "Toy.", the repeated chant "Dig, dig, dig.") while thousands of
near-identical lines rendered fine. Workarounds, spoken words unchanged:
- 12 files rendered from a text variant (ellipsis, elongated phonics spelling, or
  a homophone respell like "Eight." for "Ate."). **Listen to these closely** —
  toy ("Toyy."), wake ("Wayk."), and debit ("Deb-it.") carry the most
  pronunciation risk; alternates for ate/toy/debit are in `alternates/`.
- 10 story files assembled sentence-wise and concatenated (0.3s between
  sentences, chant beats at 0.15s) — the same assembly style the Jessa originals
  used. One flag: the dog page's head was rendered as "Dog digs..." because the
  plain line failed too.
