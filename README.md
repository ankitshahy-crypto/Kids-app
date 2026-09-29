# LittleNest Learning

LittleNest Learning is a TriageDesk product (by TriageDesk): a calm, offline app for ages 3–5 first (and phonics as children grow toward 6–7). The modules are LittleNest Words, LittleNest Numbers, LittleNest Colors, and LittleNest Time & Money. The child is the hero. It is practice, not therapy. The product direction lives in `docs/PRODUCT.md`.

The planned site is littlenestlearning.app. That domain is not purchased yet. Sharing and the demo stay at the GitHub Pages address below. The repository name and the `/Kids-app/` path stay as they are.

The first activity inside Today's lesson is **Sound it out**.

The word starts as dim letter tiles with a track underneath. The child drags their animal along the track. Each letter lights up and plays once as the drag passes it, then the whole word plays at the end and stays lit. A lit letter can still be tapped to hear it again. **Play sound** replays the word, and the arrows (or a swipe) change words. Until a person records a clip, the phone says an example phrase such as "b, as in ball" rather than a bare syllable.

There are no ads and no school accounts in this version. A child's name, speech, pictures, and progress stay on this device. On the web, the sound clips download in the background once a child exists, on Wi-Fi (not in Low Data Mode or on cellular unless a grown-up taps Download now), and the Offline page says how big that is for the children on the device; that download does not send a name. School sign-in is not in this build. The iPhone app has one in-app purchase: a one-time unlock (`com.triagedesk.littlenest.full`, Family Sharing on) that opens reading weeks 3–26 and the rest of Explore; weeks 1–2 and the first activity of each Explore area stay free, with no timer. Schools and partners get Apple offer codes ("Have a code?" in the unlock page). The website is fully open; set `localStorage["littlenest-paywall-preview-v1"] = "1"` to preview the locked app with a pretend unlock.

## Open the demo on an iPhone

https://ankitshahy-crypto.github.io/Kids-app/

That address is the web build, published by GitHub Actions. Only a push to `main` deploys it. The preview branch does not publish over this site. It can also be started by hand from the Actions tab. Safari loads the app at that address. Refreshing it loads the app again. Any other path under the site uses the same page as a fallback, so a refresh does not stop on a host 404.

The site is served from `/Kids-app/`. The installed iPhone app still builds with relative file paths (`npm run ios:sync`).

The first time, GitHub Pages has to use Actions as its source. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Run in a browser

```bash
npm install
npm run dev
```

Open the address Vite prints. On a phone the layout is a portrait column. On a tablet it stays centered, with a wider column, larger tap targets, and bigger art.

The first screen shows the nest, the LittleNest Learning name, and a card of child avatars. Tap a child to open Today. **Parent** and **Teacher** open a small grown-up check (a number written as a word, or a small sum). A child who cannot read or add does not get through. Cancel closes it.

Phones (and some browsers) will not speak until there has been a tap. Choosing a child, or opening the letter game, is that tap.

## Today

A grown-up taps Parent and answers the check, then adds a child: a first name or a single initial, an age range (3, 4, 5, or 6–7), and one of eight animals. The animal is the profile and the story hero. A single initial uses the animal's name in lessons. Edit and remove are under Children. The app never asks for a last name, birthdate, or school.

Today is a winding path of four stops: a letter, a pencil, a book, and shapes. The letter stop opens Sound it out, using this week's letters when those words exist. The other three stops are marked **Soon** and can be marked done so the path and stars work. The child's animal stands at the current stop. Each finished step adds one effort star for that day. Stars are not removed. Play library and My Nest are on the path for later.

The letter plan is 1–2 new letters a week, plus review, for 14 weeks. Weeks 15 to 26 teach the sound units that come next: digraphs (sh, ch, th, ng, ck), vowel teams (ee, oo, ai, ay, oa, igh, ea, ou, oi), the magic e (a-e, i-e, o-e, u-e), and r-controlled vowels (ar, or, er, ir), each with its own card, sound clip, ladder words and two decodable readers (`src/data/units.ts`, `src/data/readersPhonics.ts`). The calendar holds ages 3 and 4 at the letter weeks; a grown-up can place a child on Phonics from Parent or Teacher. A week is Monday through Sunday on the phone, and the day resets at local midnight. Friday is review day in that time zone: a Review mark on Today, and a short note in the parent view. A daylight-saving change or a trip does not award the same day twice, and it does not erase a day already finished.

## Parent and teacher

The parent view is a calmer dashboard: letters learned, lessons this week, stars, and a From your teacher card. Children (add and edit) and Settings (sound, speech speed, and speaking voice) work now. Join a class, Progress, From Teacher, Home Rewards, and Privacy are placeholders.

Teacher opens a classroom shell with sample data marked Demo: a class switcher, Scan QR, Add class, Pending requests, a class star jar, a roster of animal names and avatars, and a tab bar. Real names are never shown there. The real classroom tools, including joining a class, are filled in later. Approved layout references live in `docs/mockups/`. They are not shown in the app.

## Run on an iPhone

The native project is the `ios/` folder (app id `com.triagedesk.littlenest`, display name LittleNest). It is a universal app: iPhone stays portrait, and iPad supports portrait and landscape. From a Mac with Xcode:

```bash
git clone <this-repo>
cd kids-app
git pull
npm install
npm run ios:sync
npx cap open ios
```

`npm run ios:sync` builds the web app, then runs `npx cap sync ios`, which copies that build into the Xcode project. The native shell uses Swift Package Manager, so there is no CocoaPods step. The first time Xcode opens the project it downloads the Capacitor package. That Mac needs a network connection once, to compile.

In Xcode:

1. Select the **App** target, open **Signing & Capabilities**, and choose your **Team** (your Apple ID). Xcode creates the provisioning profile for the phone.
2. Plug in the iPhone or iPad, pick it as the run destination, and press **Run**.

The installed app does not need a network connection. Everything it shows and speaks is bundled or provided by the phone.

### Two schemes: App and App Pilot

- **App** (Release) is the App Store build. It shows the one-time unlock and asks the App Store what the family owns. Submit only this one to App Review.
- **App Pilot** (the Pilot configuration) is for pilot schools on TestFlight. It sets `LN_PILOT_BUILD=YES`, which reaches the app as `LNPilotBuild` in Info.plist, and the app opens everything free with a "Pilot version" note on the unlock page. It never writes an unlock, so the App Store version installed over it starts locked as usual.

Two things must agree before the pilot opens everything: the flag, and StoreKit saying the copy came from TestFlight (`AppTransaction` environment `sandbox`, or `xcode` when run from Xcode; on iOS 15, a sandbox receipt). A pilot archive that reached the App Store by mistake reports `production` and shows the paywall. The environment alone never opens anything, because App Review also runs in Apple's sandbox and its builds have the flag off. A "Check pilot flag" build phase fails any build where a configuration other than Pilot sets the flag, and any Release build without `LN_PILOT_BUILD = NO`. To ship a pilot build, pick the **App Pilot** scheme, then Product › Archive and upload to TestFlight. `src/purchase/pilotBuild.test.ts` checks the flag, the build phase, and the decision (`src/purchase/pilot.ts`).

## Parent settings

A Grown-ups button in the top corner of the start screen and the child screens opens the same grown-up check, then a menu for settings, child profiles, account, help, privacy, and about. Parent and Teacher stay on the start screen and still open after that check. Grown-ups can add, edit, or remove a child, read letters and stars, and set music, effects, and voice separately, including volume and speech speed. Tap sounds and a short buzz can be turned off. The sliders set a Web Audio volume for each channel, so they work on iPhone as well as on Android and desktop. A tap resumes the audio context. If a file cannot be decoded that way, the app plays it with a normal audio element and then with the phone's voice, so a lesson still speaks. The phone's own speaking voice ignores that slider on iOS; the on/off switch still stops it, and Settings says to use the phone's volume buttons. Settings also lists the phone's clearer English voices and can preview one. Profiles and settings stay in `localStorage` on that device. Lessons play a file from `public/audio/` when that file is listed in the audio index, and use the phone's voice otherwise. A few soft effects are made in the app. Music loops are not included yet.

## Add words later

Decks live in `src/data/deck.ts`. A word has letters, a phoneme key for each letter, an illustration name, and optional `audioSrc` / `photoSrc` fields. Spoken lines and file names live in `src/data/audioManifest.json`. A `photoSrc` image is shown instead of the built-in drawing. New drawings go in `src/illustrations.tsx`. List anything you add in `ASSETS.md`.

## Recorded audio

Spoken lines and file names live in `src/data/audioManifest.json`: letter phrases ("m, as in moon"), bare letter sounds ("mmm", played when a word is sounded out), words, sentences, numbers, prompts, colors, and story lines. The app plays the file at each path under `public/audio/` when `src/data/audioAvailable.json` lists it, and the installed app never contacts a voice service.

Clips are made ahead of time, not on the phone. The easiest way is the "Voice clips (Google)" workflow in the Actions tab, which needs the `GOOGLE_TTS_API_KEY` repository secret (an API key restricted to the Cloud Text-to-Speech API). It opens a pull request with the MP3s. The same script runs on any machine with a key:

```bash
export GOOGLE_TTS_API_KEY=...            # or GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
npm run generate-audio -- --voice Aoede  # a Chirp 3 HD voice; --model gemini-2.5-pro-tts for a Gemini voice
```

Letter phrases and bare sounds come from the same voice, but not from SSML phonemes: Google's voices read a `<phoneme>` tag's text rather than its IPA when the IPA has no vowel, so "sss" would come out as "ess, ess, ess". Instead, `SOUND_PLAN` in the generator says each sound as a short syllable through a custom pronunciation ("buh" as /bʌ/, the vowels on their own), as plain text the voice already hums ("mmm"), or by carving the consonant out of a carrier syllable such as "ahs" with `scripts/carve-sound.py` (s, f, x, n, v). Sounds that still end in a short "uh" (l, r, z) are the first to replace with a person's recording. The "Voice samples (Google)" workflow makes one short comparison clip per voice on the `voice-samples` branch, and takes `tries` lines for experiments; its report says what a speech recognizer heard in each clip. Kokoro, a free local model, is the other engine (`scripts/generate-audio-kokoro.py`, the "Voice clips" workflow).

A person's recording can replace any clip: save it at the path in the manifest (for example `public/audio/sounds/m.mp3` or `public/audio/letters/m.mp3`), then refresh the index without calling Google:

```bash
npm run generate-audio -- --index-only
```

`--force` remakes files that are already there, `--only letters,sounds` limits the kinds, and `--dry-run` prints what would be sent. Log each shipped set in `ASSETS.md`.

Until a clip is indexed, device speech says the manifest phrase. Letter sounds use an example such as "b, as in ball". The phone picks an Enhanced, Premium, or Siri-quality en-US voice when it has one, and skips compact and novelty voices. Speech rate stays near 0.9 (0.85 on Slower) and pitch stays at 1. In Safari, the iPhone silent switch can still mute Web Audio. The first tap on an iPhone shows a short note about that switch. The installed app asks iOS to play even when the switch is on.

## Privacy

No analytics, no tracking, and no school accounts. Progress stays on this device. The font is stored in the repo. A grown-up can save lesson files from this app for offline use. See `ASSETS.md` for every image, font, and the audio approach, with source and license.
