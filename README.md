# WordNest

WordNest is a TriageDesk product: a calm, offline reading-practice app for ages 3–5 first (and phonics as children grow toward 6–7). The child is the hero. It is reading practice, not therapy. The product direction lives in `docs/PRODUCT.md`.

The first activity inside Today's lesson is **Sound it out**.

A picture sits in a big rounded card for about a second. The word then builds one letter at a time: each tile glows, and that letter's sound plays from a recorded clip when one is bundled. Until a person records it, the phone says an example phrase such as "b, as in ball" rather than a bare syllable. After the last letter, every tile highlights and the whole word is spoken. Tap a tile to hear that sound again, tap **Play sound** to replay the word, or use the arrows (or swipe) to change words.

There are no ads, scores, timers, accounts, or network calls. Speech, pictures, and profiles stay on the device. Schools will license the app later; there is no payment code yet.

## Run in a browser

```bash
npm install
npm run dev
```

Open the address Vite prints. The layout is a portrait phone screen, centered on a wide window.

The first screen shows the nest, the WordNest name, and a card of child avatars. Tap a child to open Today. **Parent** and **Teacher** are small locked pills and open only after a press-and-hold of about 2 seconds.

Phones (and some browsers) will not speak until there has been a tap. Choosing a child, or opening the letter game, is that tap.

## Today

A grown-up holds Parent for about 2 seconds, then adds a child: a first name or a single initial, an age range (3, 4, 5, or 6–7), and one of eight animals. The animal is the profile and the story hero. A single initial uses the animal's name in lessons. Edit and remove are under Children. The app never asks for a last name, birthdate, or school.

Today is a winding path of four stops: a letter, a pencil, a book, and shapes. The letter stop opens Sound it out, using this week's letters when those words exist. The other three stops are marked **Soon** and can be marked done so the path and stars work. The child's animal stands at the current stop. Each finished step adds one effort star for that day. Stars are not removed. Play library and My Nest are on the path for later.

The letter plan is 1–2 new letters a week, plus review. Friday is review day: a Review mark on Today, and a short note in the parent view.

## Parent and teacher

The parent view is a calmer dashboard: letters learned, lessons this week, stars, and a From your teacher card. Children (add and edit) and Settings (sound, speech speed, and speaking voice) work now. Join a class, Progress, From Teacher, Home Rewards, and Privacy are placeholders.

Teacher opens a classroom shell with sample data marked Demo: a class switcher, Scan QR, Add class, Pending requests, a class star jar, a roster of animal names and avatars, and a tab bar. Real names are never shown there. The real classroom tools, including joining a class, are filled in later. Approved layout references live in `docs/mockups/`. They are not shown in the app.

## Run on an iPhone

The native project is the `ios/` folder (app id `com.triagedesk.wordnest`, display name WordNest). It is portrait-only. From a Mac with Xcode:

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
2. Plug in the iPhone, pick it as the run destination, and press **Run**.

The installed app does not need a network connection. Everything it shows and speaks is bundled or provided by the phone.

## Parent settings

Parent opens from the locked pill on the start screen only after a press-and-hold of about 2 seconds (a mark fills while you hold). A short tap does nothing. Grown-ups can add, edit, or remove a child, read letters and stars, and set music, effects, and voice separately, including volume and speech speed. Settings also lists the phone's clearer English voices and can preview one. Profiles and settings stay in `localStorage` on that device. Lessons play a file from `public/audio/` when that file is listed in the audio index, and use the phone's voice otherwise. A few soft effects are made in the app. Music loops are not included yet.

## Add words later

Decks live in `src/data/deck.ts`. A word has letters, a phoneme key for each letter, an illustration name, and optional `audioSrc` / `photoSrc` fields. Spoken lines and file names live in `src/data/audioManifest.json`. A `photoSrc` image is shown instead of the built-in drawing. New drawings go in `src/illustrations.tsx`. List anything you add in `ASSETS.md`.

## Recorded audio

The 26 letter sounds, plus the extra phoneme ids in the manifest (short vowels and the x sound), should be recorded by a person. Save each clip at the path in the manifest, under `public/audio/` (for example `public/audio/letters/b.mp3`). Do not synthesize those phonemes. Several ids share one file when they are the same sound.

Words and short sentences can be generated ahead of time with a natural neural voice. From a machine that has Google Cloud credentials, not from the app:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# optional: export GOOGLE_TTS_VOICE=en-US-Neural2-F
npm run generate-audio
```

The voice must be an en-US Neural2, Studio, or Chirp HD voice. The script writes MP3s for words and sentences, skips every letter sound, and refreshes `src/data/audioAvailable.json`. After you drop human letter recordings in place, refresh the index without calling Google:

```bash
npm run generate-audio -- --index-only
```

`--force` replaces word and sentence files that are already there. The installed app only plays local files and the phone's own voice. It does not contact Google or any other server. Log each shipped file in `ASSETS.md`.

Until a clip is indexed, device speech says the manifest phrase. Letter sounds use an example such as "b, as in ball". The phone picks an Enhanced, Premium, or Siri-quality en-US voice when it has one, and skips compact and novelty voices. Speech rate stays near 0.9 (0.85 on Slower) and pitch stays at 1. The iPhone silent switch can still mute speech.

## Privacy

No analytics, no accounts, no tracking, and no requests to other servers. The font is stored in the repo. See `ASSETS.md` for every image, font, and the audio approach, with source and license.
