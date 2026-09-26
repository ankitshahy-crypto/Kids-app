# Kids App

A calm, offline reading-practice app for ages 3–5 first (and phonics as children grow toward 6–7). The child is the hero. It is reading practice, not therapy. The product direction lives in `docs/PRODUCT.md`.

The first activity inside Today's lesson is **Sound it out**.

A picture sits in a big rounded card for about a second. The word then builds one letter at a time: each tile glows, and that letter's sound plays (a phonics sound such as /k/, not the letter name "see"). After the last letter, every tile highlights and the whole word is spoken. Tap a tile to hear that sound again, tap **Play sound** to replay the word, or use the arrows (or swipe) to change words.

There are no ads, scores, timers, accounts, or network calls. Speech, pictures, and profiles stay on the device. Schools will license the app later; there is no payment code yet.

## Run in a browser

```bash
npm install
npm run dev
```

Open the address Vite prints. The layout is a portrait phone screen, centered on a wide window.

The first screen is a mode switch. **Kid** is the large button and opens with a tap. **Parent** and **Teacher** are smaller and open only after a press-and-hold of about 2 seconds.

Phones (and some browsers) will not speak until there has been a tap. Opening Kid, choosing a child, or opening the letter game is that tap.

## Today

The kid view is picture-first: a profile picker, Today's path, and stars. A grown-up holds Parent (or the gear inside the kid view) for about 2 seconds, then adds a child: a first name or a single initial, an age range (3, 4, 5, or 6–7), and one of eight animals. The animal is the profile and the story hero. A single initial uses the animal's name in lessons. Edit and remove are on that same parent screen. The app never asks for a last name, birthdate, or school.

The child picks a profile from the big animal buttons, then sees **Today**: letters, draw, story, and a color moment. Letters opens Sound it out, using this week's letters when those words exist. The other three steps are marked **Soon** and can be marked done so the path and stars work. Each finished step adds one effort star for that day. Stars are not removed.

The letter plan is 1–2 new letters a week, plus review. Friday is review day: a badge on Today, and a short note in the parent view.

## Parent and teacher

The parent view is a calmer, text-friendly screen: children (add and edit), sound and speech speed, progress notes, a "From your teacher" placeholder, and labeled places for home rewards and class consent. Rewards, consent, and teacher inputs are not built yet.

Teacher opens a classroom placeholder: more than one class, a roster that shows an in-app name and avatar only, goals, a class star jar, and certificates. That dashboard is filled in later. Real names are never shown there.

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

Parent opens from the start screen, or from the gear in the kid view, only after a press-and-hold of about 2 seconds (a mark fills while you hold). A short tap does nothing. Grown-ups can add, edit, or remove a child, read the week's letters and stars, turn sound off, and switch speech between slow and slower. Profiles and settings stay in `localStorage` on that device.

## Add words later

Decks live in `src/data/deck.ts`. A word has letters, a phoneme key for each letter, an illustration name, and optional `audioSrc` / `photoSrc` fields. A recorded file at `audioSrc` (for example `public/audio/p.mp3`) is played instead of synthesized speech. A `photoSrc` image is shown instead of the built-in drawing. New drawings go in `src/illustrations.tsx`. List anything you add in `ASSETS.md`.

## Audio limits

Sounds use the browser **Web Speech API**. It cannot make a pure phoneme, so stops are short approximations (`buh`, `kuh`) and vowels are near-misses (`aah` for short a). The same spelling can be a different sound in a longer word: apple's second **p** repeats /p/, and the final **e** is a soft "uh". The **x** in fox is approximated as "kss". Voices differ by phone, and the iPhone silent switch mutes speech. This is a first version of the letter sounds.

## Privacy

No analytics, no accounts, no tracking, and no requests to other servers. The font is stored in the repo. See `ASSETS.md` for every image, font, and the audio approach, with source and license.
