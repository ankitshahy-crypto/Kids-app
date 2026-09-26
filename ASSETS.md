# Asset provenance

Everything visual or audible in Kids App is listed here. There are no analytics scripts, font CDNs, stock photos, or audio files downloaded at runtime.

| Asset | Path | Source | License |
| --- | --- | --- | --- |
| Fredoka Regular (latin, weight 400) | `src/assets/fonts/fredoka-latin-400-normal.woff2` | [Fredoka](https://github.com/hafontia/Fredoka-One), latin subset WOFF2 as published by [@fontsource/fredoka 5.2.8](https://github.com/fontsource/font-files) | SIL Open Font License 1.1 |
| Fredoka SemiBold (latin, weight 600) | `src/assets/fonts/fredoka-latin-600-normal.woff2` | Same as above | SIL Open Font License 1.1 |
| Fredoka Bold (latin, weight 700) | `src/assets/fonts/fredoka-latin-700-normal.woff2` | Same as above | SIL Open Font License 1.1 |
| Fredoka license | `src/assets/fonts/OFL.txt` | Upstream OFL text from [google/fonts ofl/fredoka](https://github.com/google/fonts/tree/main/ofl/fredoka) | SIL Open Font License 1.1 |
| Cat, dog, sun, hat, pig, bus, cup, bed, fox, apple | `src/illustrations.tsx` | Original flat drawings made for this project | Original. No third-party artwork. |
| Gear, speaker, play, and arrow icons | `src/components/icons.tsx` | Original simple SVG icons made for this project | Original. No third-party artwork. |
| Blob background, tiles, buttons | `src/index.css` | Original styling made for this project | Original. |
| Browser tab icon | `public/favicon.svg` | Original simple apple mark made for this project | Original. |
| iOS app icon | `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` | Original apple drawn for this project (flat shapes, not a third-party logo) | Original. |
| iOS launch image | `ios/App/App/Assets.xcassets/Splash.imageset/` | Same original apple on a cream field | Original. |
| Letter and word audio | none shipped | Device Web Speech API (`speechSynthesis`). No audio files are bundled. | Not an asset. System voice, varies by phone. |

Fredoka's Latin letters were designed by Milena Brandão. The project is led by Ben Nathan. Copyright 2016 The Fredoka Project Authors. The full license is in `src/assets/fonts/OFL.txt`. The font files are unmodified subset builds (not renamed, not redrawn).

No artwork, characters, or audio from ABCmouse, Khan Academy Kids, Speech Blubs, Duolingo, Sesame, or other learning products is used or traced.

To replace a spoken sound later, add an audio file under `public/audio/` and set `audioSrc` on that letter or word in `src/data/deck.ts`. To use a parent photo, set `photoSrc` to a local image path. Those files, if you add them, should be listed in this log with their source and license.
