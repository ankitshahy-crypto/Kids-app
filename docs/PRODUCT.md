# WordNest product spec

This document is the product direction for every later step. Build only what the current step calls for, and keep later steps compatible with the rules here.

## What it is

WordNest is a TriageDesk product. It is a pre-reading and early-reading app. Ages 3–5 come first. It grows into phonics for ages 5–7.

Reading is the only subject. The child is the hero of the stories.

Market it as reading practice. Never market it as therapy, and never describe a child in clinical language.

## Three views

The app has three views. They do not look the same.

**Kid view.** Picture-first, with huge tap targets and almost no text. Soft pastel hills and a winding path of four round stops: letters, tracing, story, and a color, shape, or number moment. The child's animal stands at the current stop. Stars sit in the corner. Play library and My Nest are on the path for later.

**Parent view.** Behind a press-and-hold of about 2 seconds. Calmer and text-friendly. The home screen shows letters learned, lessons this week, stars, and a From your teacher card. Rows open Children, Progress, From Teacher, Home Rewards, Settings, and Privacy. Step 1 builds Children (add and edit) and Settings. The other rows are placeholders.

In steps 5 and 6, a parent can monitor that child's progress and see what the teacher sent for them:

- Progress on this device: letters learned, lessons done, stars, and Friday notes.
- Teacher inputs for that child: goals set, goals hit, certificates earned, the class star-jar status, and short teacher notes or encouragement.

Teacher notes are tied to the child's app name only (the animal hero's name, or an initial), never a real name. They must never contain health or diagnosis information. The note field shows a gentle reminder of that.

Step 1 only leaves a "From your teacher" placeholder card in the parent view. The progress detail and the teacher inputs are filled in at steps 5 and 6.

**Teacher view.** A separate teacher profile, also behind a press-and-hold. A classroom shell: a class switcher, Scan QR, a class star jar, a roster of app names and avatars, and tabs for classes, roster, goals, the star jar, certificates, and notes. Step 1 shows that shell with demo data only.

The start screen shows the nest, the WordNest name, and the child avatar buttons. Tapping a child opens the kid view. Parent and Teacher are smaller locked pills and open only after a press-and-hold. A tap does not open them.

Step 1 sets up the shell and routing for all three views, builds the kid view, and builds a basic parent view that can add and edit a child. The teacher view in step 1 is a placeholder dashboard. Step 6 fills it in.

## Pricing

Business model: schools license the app and include it in tuition. Price target: $40 per family per year, the same price no matter how many children. Free for families at partner schools (no in-app charge). The Kids Villa pilot is free for 6 months. No payment code yet; the school-link step will later unlock the app for families.

## Go-to-market

Start with a free pilot at Kids Villa, a preschool in Urbana, MD. Earn the school's and families' trust, then expand to other schools.

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

Pace: 1–2 new letters a week, plus review of letters already introduced. A week is Monday through Sunday in the child's device time zone. The week the profile is created is the first lesson week, and the next Monday starts the next set of letters. Friday is review day in that same zone. Friday shows a badge and a short parent progress note.

The lesson day resets at local midnight. "Today" is the calendar date in the device time zone, read with `Intl.DateTimeFormat().resolvedOptions().timeZone`. Stored instants, such as when a profile was created, are UTC ISO-8601 strings. Progress for a day is stored under that local date. A daylight-saving change does not skip a day or award the same day twice: a short spring day and a long fall day are still one calendar date, and the repeated hour in the fall uses the date already awarded. Travel uses the zone the device is in now. A new local date can be awarded once. Returning to a date that already has progress keeps that progress and does not award it again. Stars are never removed.

In step 6, each school and each class stores its own IANA time zone, for example `America/New_York`. Teacher weekly goals, monthly goals, and certificates use the class time zone. Home progress stays on the child's device zone.

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

## Audio and music

The app stays quiet unless a sound is doing a job. No constant noise, and no loud or flashing rewards. The animal hero can cheer the child by name. That cheer uses the lesson name (the first name, or the animal's name when the profile is only an initial).

Voice:

- The pipeline is built around pre-recorded files. `src/data/audioManifest.json` maps each letter sound, word, and sentence id to a file under `public/audio/`. The app plays that file when `src/data/audioAvailable.json` lists it.
- Device speech is only the fallback, and it must not sound robotic. It picks the best en-US voice on the phone (Enhanced, Premium, or Siri-quality by name or quality; local when possible) and skips compact and novelty voices. Rate stays near a natural pace (about 0.9, or 0.85 on the slower setting). Pitch stays at 1.0. A parent can preview and choose the voice in Settings.
- Letter sounds do not use isolated syllables such as "buh". Play the recorded clip when it exists. Otherwise say an example phrase, such as "b, as in ball".
- The 26 letter sounds, plus the extra phoneme ids in the manifest, are recorded by a person. They are not synthesized.
- Words and short sentences may be pre-generated offline with `npm run generate-audio`. That Node script calls Google Cloud Text-to-Speech (Neural2, Studio, or Chirp HD en-US) using `GOOGLE_APPLICATION_CREDENTIALS`, writes MP3s into `public/audio/`, and refreshes the available-file index. The developer runs it. The app makes no network calls.
- A parent may record their own voice for words and for the child's name. Those recordings stay on the device and are never uploaded. An `audioSrc` on a letter or word overrides the manifest file.
- A warm voice actor, under a work-for-hire or other commercial license, remains the target for story narration and for replacing generated word clips.

Music:

- Soft background loops, one mood per area. Calm on Today and Play. Gentle during stories.
- Original music, or royalty-free music that allows commercial use.
- Music lowers itself whenever a voice or a letter sound plays.
- Music stops during tracing, so the child can focus.
- Step 1 does not ship a music file. The manager already ducks and can stop for tracing. Adding a loop later means logging it in `ASSETS.md` first.

Sound effects, all short and gentle:

- A tile pop.
- A star chime.
- A page turn.
- A soft "try again" boop. Never a harsh buzzer.
- A small celebration when the day's lesson is finished.

Step 1 synthesizes the pop, the chime, the boop, and the celebration in the browser. No effect files are bundled. The page turn waits for the story step.

Parent controls, in Settings:

- Music, effects, and voice each have their own on/off switch and volume.
- Speech speed stays slow or slower, both near a natural pace.
- Speaking voice: Best available, or a voice the parent picks, with a Preview button.

Every audio file that is added later is logged in `ASSETS.md` with its source and license.

## Classroom

The connection, goals, certificates, and class star jar are later (build step 6). Step 1 only reserves the teacher view as a placeholder dashboard.

Option B comes first and is the one to pilot. The home app transfers progress to a classroom tablet with a QR code. No server. Teacher inputs travel back to the home app the same way, in reverse: another QR code, still with no server.

Option A comes after that. A class code is a random picture plus a word, for example "Blue Fox 7." The teacher keeps the list of which code belongs to which child offline, and can print, export, and reissue codes. With class codes, progress and teacher inputs go through the minimal server. The server stores only the code, the avatar, the stars, the letters practiced, and the teacher inputs for that child (goals set, goals hit, certificates, class star-jar status, and short notes). It never stores a real name, a photo, or health information.

Teacher notes are short encouragement tied to the child's app name only. The note field shows a gentle reminder: do not write health or diagnosis information.

Teacher profile: the classroom teacher has a separate teacher profile, behind a parent or teacher gate, that can hold multiple classrooms. Each class roster shows children only by their in-app profile name (the animal hero's name, or an initial) and avatar, never real names. Any mapping to real names stays with the teacher offline, on their own printed or exported list, and never in the app data synced anywhere.

Also later, for the classroom:

- The teacher sets a weekly or monthly effort goal. The week is Monday–Sunday and the month is the calendar month, both in the class time zone.
- A class view shows who met the goal.
- The school chooses the prizes.
- A certificate is generated on the teacher's device and can be printed. It is not stored on a server. Its week or month follows the class time zone.
- The class can share one star-jar goal.

## Class assignment process

This is built in step 6. Step 1 only leaves placeholders: a Join a class row in the parent view, and Add class plus Pending requests in the teacher view. Children never join, approve, move, or leave a class themselves.

Roles:

- The school admin (the director) sets up the school and adds teachers.
- The teacher creates classes and approves students.
- The parent is the only one who can link a child. That link is the consent.

Flow:

1. The admin creates the school and invites teachers. For the pilot, the director can simply be a teacher too.
2. The teacher creates a class, for example "Sunflower Class." The app shows a class QR code and a join code.
3. The parent opens the parent view, then Join a class, and reads a plain-language consent screen. It lists exactly what is shared: the app name, the avatar, the stars, and the letters practiced. Never a real name, and never photos. The parent agrees, then scans the class QR at drop-off or from a printed sheet.
4. The request appears on the teacher's Pending list with the animal avatar and the app name. The teacher approves it, and can note the real name on their own offline list.
5. Moving classes: the teacher can transfer a child to another class in the same school. Parents are notified.
6. Unlink: the parent can unlink or delete at any time, and the teacher can remove a child from a roster.

At the end of the year, the teacher archives the class.

## Privacy

- No health information of any kind. No speech delay, diagnosis, therapy notes, or medical fields. Teacher notes must never contain health or diagnosis information, and the note field shows a gentle reminder.
- COPPA: a parent gives consent, behind the parent gate, before any class linking. They can unlink or delete at any time.
- Photos and first names never go to a server.
- No analytics and no tracking.
- Until a classroom server exists, everything stays on the device (`localStorage`, IndexedDB, or Capacitor Preferences).

Parent and Teacher open only after a press-and-hold of about 2 seconds on the start screen. A tap does not open them.

## Build order

1. The app shell and routing for the kid, parent, and teacher views, with the start-screen mode switch. Kid view: profile picker, Today's four-step path, the weekly letter schedule, Friday review, and effort stars. Parent view, behind the hold gate: add and edit a child, sound settings (music, effects, voice, speech speed, and a voice preview), and progress notes, with places for home rewards and consent or delete, a "From your teacher" card, and a Join a class row. The audio manager prefers a recorded file from the manifest and otherwise uses the best device voice, ducks music while a voice plays, and plays a few soft synthesized effects. Letter sounds fall back to an example phrase, never a bare syllable. Words and sentences can be generated offline; the app does not call out to the network. Music files are not bundled yet. Teacher view: a placeholder classroom dashboard, including Add class and Pending requests, filled in at step 6.
2. Letter games, tracing, and read-along stories.
3. Sentence tiles, rhyming, and the color, shape, and number moments.
4. Home stars and parent-written rewards on the device. Cosmetic unlocks.
5. Parent progress view: letters learned, lessons done, stars, and Friday notes.
6. Classroom connection, in the teacher view, including the class assignment process. QR first, picture-word codes later, then goals, certificates, and the class star jar. Each school and class stores an IANA time zone, and weekly or monthly goals and certificates use that zone. Teacher inputs travel back to the parent view by QR when there is no server, and through the minimal server once class codes exist.

Each step should keep the soft pastel look, big tap targets, very little text, original artwork only, and the privacy rules above.
