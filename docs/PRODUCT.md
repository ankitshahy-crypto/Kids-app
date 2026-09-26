# Kids App product spec

This document is the product direction for every later step. Build only what the current step calls for, and keep later steps compatible with the rules here.

## What it is

A pre-reading and early-reading app. Ages 3–5 come first. It grows into phonics for ages 5–7.

Reading is the only subject. The child is the hero of the stories.

Market it as reading practice. Never market it as therapy, and never describe a child in clinical language.

## Pricing

$0.99 once. That purchase unlocks the whole app.

No ads. No subscription. No in-app purchases. No store code is needed yet.

## Learning focus

Reading stays at the center.

- Letters: recognition, sounds, and the letters in the child's name.
- Concepts of print: letters make words, spaces sit between words, and reading moves left to right. Words highlight as they are read. Tap a word to hear it.
- Finger tracing: lines and curves, then letters, then the letters in the name. Free-draw sits beside tracing, with a word label.
- Spoken sentence building: picture tiles the child can arrange and hear read aloud.
- Colors, shapes, and numbers show up inside stories, not as a separate drill app.
- Rhyming and sound games.

## Daily lesson

A day is meant to be about 5–10 minutes. The app does not put a timer on the child.

Order:

1. A letter game.
2. Tracing or free-draw.
3. A personalized story, or sentence tiles.
4. One color, shape, or number moment.

Pace: 1–2 new letters a week, plus review of letters already introduced. Friday is review day. Friday shows a badge and a short parent progress note.

Sound it out is the letter-game step.

## Profile

Collect as little as possible.

- First name, or a single initial. Never a last name.
- Age range only: 3, 4, 5, or 6–7. Never a birthdate.
- Never a school.
- The child picks an animal. That animal is the profile picture and the hero of their stories.
- If the parent enters only an initial, name lessons use the animal's name.
- Family photos are optional, stay on the device, and the app works with none.
- More than one child can have a profile on the same device.

## Rewards

Stars are for effort only.

- Stars are never removed.
- There are no leaderboards.
- Stars cannot be bought.
- Stars unlock in-app cosmetics, such as hats and colors for the animal hero.
- A parent can write real-world home rewards on the device, for example "20 stars = park trip." Those rewards are not a payment system.

## Classroom

This is later (build step 6). Do not add it early.

Option B comes first and is the one to pilot. The home app transfers progress to a classroom tablet with a QR code. No server.

Option A comes after that. A class code is a random picture plus a word, for example "Blue Fox 7." The teacher keeps the list of which code belongs to which child offline, and can print, export, and reissue codes. The server, when one exists, stores only the code, the avatar, the stars, and the letters practiced.

Also later, for the classroom:

- The teacher sets a weekly or monthly effort goal.
- A class view shows who met the goal.
- The school chooses the prizes.
- A certificate is generated on the teacher's device and can be printed. It is not stored on a server.
- The class can share one star-jar goal.

## Privacy

- No health information of any kind. No speech delay, diagnosis, therapy notes, or medical fields.
- COPPA: a parent gives consent, behind the parent gate, before any class linking. They can unlink or delete at any time.
- Photos and first names never go to a server.
- No analytics and no tracking.
- Until a classroom server exists, everything stays on the device (`localStorage`, IndexedDB, or Capacitor Preferences).

The parent gate is a press-and-hold of about 2 seconds on the gear. Children should not be able to open it with a tap.

## Build order

1. Profile and the daily lesson flow. Parent onboarding behind the gate, a profile picker, Today's four-step path, the weekly letter schedule, Friday review, and effort stars.
2. Letter games, tracing, and read-along stories.
3. Sentence tiles, rhyming, and the color, shape, and number moments.
4. Home stars and parent-written rewards on the device. Cosmetic unlocks.
5. Parent progress view.
6. Classroom connection. QR first, picture-word codes later, then goals, certificates, and the class star jar.

Each step should keep the soft pastel look, big tap targets, very little text, original artwork only, and the privacy rules above.
