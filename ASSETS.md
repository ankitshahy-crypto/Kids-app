# Asset provenance

Everything visual or audible in WordNest is listed here. There are no analytics scripts, font CDNs, stock photos, or audio files downloaded at runtime.

| Asset | Path | Source | License |
| --- | --- | --- | --- |
| Fredoka Regular (latin, weight 400) | `src/assets/fonts/fredoka-latin-400-normal.woff2` | [Fredoka](https://github.com/hafontia/Fredoka-One), latin subset WOFF2 as published by [@fontsource/fredoka 5.2.8](https://github.com/fontsource/font-files) | SIL Open Font License 1.1 |
| Fredoka SemiBold (latin, weight 600) | `src/assets/fonts/fredoka-latin-600-normal.woff2` | Same as above | SIL Open Font License 1.1 |
| Fredoka Bold (latin, weight 700) | `src/assets/fonts/fredoka-latin-700-normal.woff2` | Same as above | SIL Open Font License 1.1 |
| Fredoka license | `src/assets/fonts/OFL.txt` | Upstream OFL text from [google/fonts ofl/fredoka](https://github.com/google/fonts/tree/main/ofl/fredoka) | SIL Open Font License 1.1 |
| Cat, dog, sun, hat, pig, bus, cup, bed, fox, apple | `src/illustrations.tsx` | Original flat drawings made for this project | Original. No third-party artwork. |
| Gear, speaker, play, arrow, star, and review badge icons | `src/components/icons.tsx` | Original simple SVG icons made for this project | Original. No third-party artwork. |
| Profile animals: cat, dog, fox, bear, bunny, owl, frog, duck | `src/avatars.tsx` | Original flat animal portraits made for this project | Original. No third-party artwork. |
| Draw and color placeholder marks | `src/components/PlaceholderStep.tsx` | Original simple shapes made for this project | Original. No third-party artwork. |
| Blob background, tiles, buttons | `src/index.css` | Original styling made for this project | Original. |
| WordNest nest logo | `src/assets/nest-logo.svg` | Original pastel nest with a small animal peeking out, drawn for this project | Original. No third-party artwork. |
| Path and classroom marks | `src/components/sceneArt.tsx` | Original pencil, book, shapes, toy box, egg nest, hills, star jar, lock, and tab marks | Original. No third-party artwork. |
| Approved screen references | `docs/mockups/` | Layout references supplied for this project. Not drawn into the app. | Reference only. Not runtime artwork. |
| Browser tab icon | `public/favicon.svg` | Same original nest logo on a cream field | Original. |
| iOS app icon | `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` | Same original nest logo on a cream field | Original. |
| iOS launch image | `ios/App/App/Assets.xcassets/Splash.imageset/` | Same original nest logo on a cream field | Original. |
| Device speech (fallback voice) | none | The phone's Web Speech API (`speechSynthesis`). Not a file. | System voice. Varies by phone. Not a bundled asset. |
| Recorded letter, word, and story voice | none yet | Target: a warm voice actor under a work-for-hire or other commercial license. Not bundled. | Log each file here, with source and license, before adding it. |
| Parent-recorded words and name | none yet | Recorded on the device for that child. Never uploaded. | Device-only. Not a bundled asset. |
| Tile pop, star chime, try-again boop, celebration | none | Synthesized in `src/audio/manager.ts` with the Web Audio API. No sample files. | Original. Generated in the app. |
| Page-turn effect | none | Not in step 1. | Log it here if a file is added later. |
| Background music | none | TODO. Not bundled in step 1. Calm for Today and Play, gentle for stories. | Original, or royalty-free with a commercial license. Log the file here before shipping it. |

Fredoka's Latin letters were designed by Milena Brandão. The project is led by Ben Nathan. Copyright 2016 The Fredoka Project Authors. The full license is in `src/assets/fonts/OFL.txt`. The font files are unmodified subset builds (not renamed, not redrawn).

No artwork, characters, or audio from ABCmouse, Khan Academy Kids, Speech Blubs, Duolingo, Sesame, or other learning products is used or traced.

To replace a spoken sound later, add an audio file under `public/audio/` and set `audioSrc` on that letter or word in `src/data/deck.ts`. The player uses that file when it is set, and device speech otherwise. A parent recording stays on the device. To use a parent photo, set `photoSrc` to a local image path. Any file you add should be listed in this log with its source and license.
