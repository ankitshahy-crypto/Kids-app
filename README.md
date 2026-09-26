# Kids App

A calm, offline phonics app for young children (about ages 2–6). The first activity is **Sound it out**.

A picture sits in a big rounded card for about a second. The word then builds one letter at a time: each tile glows, and that letter's sound plays (a phonics sound such as /k/, not the letter name "see"). After the last letter, every tile highlights and the whole word is spoken. Tap a tile to hear that sound again, tap **Play sound** to replay the word, or use the arrows (or swipe) to change words.

There are no ads, scores, timers, accounts, or network calls. Speech and pictures stay on the device.

## Run in a browser

```bash
npm install
npm run dev
```

Open the address Vite prints. The layout is a portrait phone screen, centered on a wide window.

The first screen is a large **Tap to start** button. Phones (and some browsers) will not speak until there has been a tap.

## Run on an iPhone

The native project is the `ios/` folder (app id `com.fsdvibe.kidsapp`, display name Kids App). It is portrait-only. From a Mac with Xcode:

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

The gear in the top corner opens only after a press-and-hold of about 2 seconds (a ring fills while you hold). Settings can turn sound off and switch speech between slow and slower. The choice is stored in `localStorage` on that device.

## Add words later

Decks live in `src/data/deck.ts`. A word has letters, a phoneme key for each letter, an illustration name, and optional `audioSrc` / `photoSrc` fields. A recorded file at `audioSrc` (for example `public/audio/p.mp3`) is played instead of synthesized speech. A `photoSrc` image is shown instead of the built-in drawing. New drawings go in `src/illustrations.tsx`. List anything you add in `ASSETS.md`.

## Audio limits

Sounds use the browser **Web Speech API**. It cannot make a pure phoneme, so stops are short approximations (`buh`, `kuh`) and vowels are near-misses (`aah` for short a). The same spelling can be a different sound in a longer word: apple's second **p** repeats /p/, and the final **e** is a soft "uh". The **x** in fox is approximated as "kss". Voices differ by phone, and the iPhone silent switch mutes speech. This is a first version, not speech-therapy audio.

## Privacy

No analytics, no accounts, no tracking, and no requests to other servers. The font is stored in the repo. See `ASSETS.md` for every image, font, and the audio approach, with source and license.
