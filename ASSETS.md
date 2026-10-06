# Asset provenance

Everything visual or audible in LittleNest Learning is listed here. There are no analytics scripts, font CDNs, stock photos, or audio files downloaded at runtime.

| Asset | Path | Source | License |
| --- | --- | --- | --- |
| Fredoka Regular (latin, weight 400) | `src/assets/fonts/fredoka-latin-400-normal.woff2` | [Fredoka](https://github.com/hafontia/Fredoka-One), latin subset WOFF2 as published by [@fontsource/fredoka 5.2.8](https://github.com/fontsource/font-files) | SIL Open Font License 1.1 |
| Fredoka SemiBold (latin, weight 600) | `src/assets/fonts/fredoka-latin-600-normal.woff2` | Same as above | SIL Open Font License 1.1 |
| Fredoka Bold (latin, weight 700) | `src/assets/fonts/fredoka-latin-700-normal.woff2` | Same as above | SIL Open Font License 1.1 |
| Fredoka license | `src/assets/fonts/OFL.txt` | Upstream OFL text from [google/fonts ofl/fredoka](https://github.com/google/fonts/tree/main/ofl/fredoka) | SIL Open Font License 1.1 |
| Cat, dog, sun, hat, pig, bus, cup, bed, fox, apple | `src/illustrations.tsx` | Original flat drawings made for this project | Original. No third-party artwork. |
| Word-ladder pictures (one apple, child, frog, fish, and the other new words) | `src/wordScenes.tsx` | Original flat drawings made for this project | Original. No third-party artwork. |
| Gear, speaker, play, arrow, star, and review badge icons | `src/components/icons.tsx` | Original simple SVG icons made for this project | Original. No third-party artwork. |
| Profile animals, painted: cat, dog, fox, bear, bunny, owl, frog, duck, pig, penguin, lion, koala | `public/animals/<id>/*-face.webp`, `src/data/animalArt.json` | Plush-style portraits made for this project with an image generator from a style reference, approved by the owner; cut out and cropped to the face by `scripts/animal-art.py` from the source renders (kept outside the repo). Each animal has a `cheer` and a `blink` frame too (the cheer lined up with the idle face; the blink is only the closed eyes of the blink render, laid over the idle face); the fox also has a `wave` and a `silly` frame. | Original to this project. No third-party characters or artwork. |
| Profile animals, drawn: the same twelve | `src/avatars.tsx` | Original flat animal portraits made for this project; shown when an animal has no painted face | Original. No third-party artwork. |
| Game props, painted: two blank coin faces (copper, silver); the garden's bed, seed, sun, watering can, sprout, plant and flower | `public/games/*.webp`, `public/games/garden/*.webp` | Watercolour props made for this project with an image generator, approved by the owner; cut off their paper backdrop by `scripts/game-art.py` (the coins' pressed star painted out, the plant lifted off the bed it was painted in). The coins are pretend: the app draws each one's number and size. Not pictures of real money. | Original to this project. No third-party artwork. |
| Dress-up pieces, painted: leaf hat, paper crown, round glasses, dot scarf, stripe scarf | `public/wardrobe/*.webp`, `src/data/wardrobeArt.json` | Made for this project with an image generator (the fox wearing each piece, in the plush style), approved by the owner; the piece lifted off the fox by `scripts/wardrobe-art.py` (the stripe scarf traced by hand, since it shares the fox's colours). The sky colour is a CSS filter on the animal, one per animal from its fur (`animalArt.json`). | Original to this project. No third-party artwork. |
| Draw and color placeholder marks | `src/components/PlaceholderStep.tsx` | Original simple shapes made for this project | Original. No third-party artwork. |
| Blob background, tiles, buttons | `src/index.css` | Original styling made for this project | Original. |
| LittleNest app icon | `public/icons/icon-512.png`, `ios/App/App/Assets.xcassets/AppIcon.appiconset/` | Approved nest mark: pink bird, woven nest, pink blue and yellow eggs, mint field. Cropped from `logos/main.png` | Original. No third-party artwork. |
| LittleNest Words icon | `public/icons/module-words.png` | Approved Words mark (A block and picture book). Inner field recolored from mint to pastel pink. Cropped from `logos/words.png` | Original. |
| LittleNest Numbers icon | `public/icons/module-numbers.png` | Approved Numbers mark (eggs labeled 1 2 3) on a blue field. Cropped from `logos/numbers.png` | Original. |
| LittleNest Colors icon | `public/icons/module-colors.png` | Approved Colors mark (rainbow egg, brush, paint splashes) on a yellow field. Cropped from `logos/colors.png` | Original. |
| LittleNest Time & Money icon | `public/icons/module-time.svg` | Original nest-style mark: mint and lavender rounded square, an egg clock face, and a plain coin. Not a photograph and not a currency engraving. | Original. No third-party artwork. |
| Path and classroom marks | `src/components/sceneArt.tsx` | Original pencil, book, shapes, toy box, egg nest, hills, star jar, lock, and tab marks | Original. No third-party artwork. |
| Approved screen references | `docs/mockups/` | Layout references supplied for this project. Not drawn into the app. | Reference only. Not runtime artwork. |
| Browser tab icon | `public/favicon.svg` | The LittleNest app icon | Original. |
| Home screen icons | `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` | The LittleNest app icon. The maskable icon keeps the nest inside the center safe area | Original. |
| iOS app icon | `ios/App/App/Assets.xcassets/AppIcon.appiconset/` | The LittleNest app icon at 1024 and the smaller home-screen sizes. Opaque, full-bleed square | Original. |
| iOS launch image | `ios/App/App/Assets.xcassets/Splash.imageset/` | The LittleNest app icon centered on the cream screen | Original. |
| Device speech (fallback voice) | none | The phone's Web Speech API. The app chooses the best en-US voice it can (Enhanced, Premium, or Siri-quality) and avoids compact and novelty voices. Not a file. | System voice. Varies by phone. Not a bundled asset. |
| Spoken clips (letters, sounds, words, sentences, numbers, prompts, colors, stories) | `public/audio/**/*.mp3` | Made offline from the lines in `src/data/audioManifest.json`, either by Google Cloud Text-to-Speech (`scripts/generate-audio.mjs`, the "Voice clips (Google)" workflow; Chirp 3 HD or Gemini voices, letter phrases and bare sounds via SSML phonemes) or by Kokoro (hexgrad/Kokoro-82M, Apache 2.0; `scripts/generate-audio-kokoro.py`, the "Voice clips" workflow). `src/data/audioAvailable.json` lists what shipped. | Synthesized speech generated under the provider's commercial terms. The app never calls a voice service. A person's recording can replace any clip by overwriting its file. |
| Parent-recorded words and name | none yet | Recorded on the device for that child. Never uploaded. | Device-only. Not a bundled asset. |
| Tile pop, star chime, try-again boop, celebration | none | Synthesized in `src/audio/manager.ts` with the Web Audio API. No sample files. | Original. Generated in the app. |
| Page-turn effect | none | Not in step 1. | Log it here if a file is added later. |
| Background music | none | TODO. Not bundled in step 1. Calm for Today and Play, gentle for stories. | Original, or royalty-free with a commercial license. Log the file here before shipping it. |

Fredoka's Latin letters were designed by Milena Brandão. The project is led by Ben Nathan. Copyright 2016 The Fredoka Project Authors. The full license is in `src/assets/fonts/OFL.txt`. The font files are unmodified subset builds (not renamed, not redrawn).

No artwork, characters, or audio from ABCmouse, Khan Academy Kids, Speech Blubs, Duolingo, Sesame, or other learning products is used or traced.

No audio files are shipped yet. The manifest lists where they go. The app plays a file only after `src/data/audioAvailable.json` includes it, so a missing clip is not requested. Device speech then says the manifest line (an example phrase for a letter, the word itself for a word). A parent recording can still override one letter or word with `audioSrc` and stays on the device. To use a parent photo, set `photoSrc` to a local image path. Any file you add should be listed in this log with its source and license.
