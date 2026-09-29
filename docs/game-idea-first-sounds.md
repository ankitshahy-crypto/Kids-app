# Game idea: First Sounds (beginning-sound isolation)

- **Status:** IDEA — do NOT build during pilot stabilization. First candidate game after App Store launch.
- **Date captured:** 2026-09-29 (from the owner, inspired by a Beck Goodman phonics reel: https://www.instagram.com/reel/DK14UwuPc9C/)
- **Owner when built:** Claude, with the owner's go-ahead. Full two-review rule applies (independent code review + UI/UX review, every round).

## The game

The child hears a single phoneme (e.g. /m/) and sees **two large pictures**. They pick the
picture whose word starts with that sound. That's the whole round — calm, no timer.

Example: hear /s/ → choose between a picture of the **sun** and a picture of a **dog**.

## Why it fits LittleNest

- It teaches **hearing** the first sound (phonemic isolation), which is the step *before*
  Sounding out teaches blending. The two games ladder naturally: First Sounds → Sounding out.
- It reuses pieces the app already owns: the recorded phoneme audio clips, the star/chime
  celebration system, the calm visual language of LittleNest Words.
- It is the calmest possible game format — matches the brand (no ads, no timers, no pressure).

## Design rules (from the owner's review, 2026-09-29)

1. **Two choices only, never four.** Four options overwhelm the young end of ages 3–7.
2. **Pictures must be unambiguous.** No traps where both pictures start with the same sound
   (e.g. never "cat" vs "kite" for /k/). Every round has exactly one correct answer a
   parent would agree with.
3. **No timer, no score pressure.** Wrong pick → gentle "try again" (effort-based rewards
   ethos, same as the rest of the app). Correct pick → existing celebration pattern.
4. **Reuse, don't rebuild:** play the existing phoneme clips for the prompt; use the
   existing celebration components.
5. **Accessibility per the standing pilot rule:** VoiceOver labels on both pictures and the
   prompt, Switch Control / keyboard operable choice selection, motor-difficulty friendly
   tap targets. A VoiceOver/Switch Control child must be able to complete a round with no
   pointer drag.

## Possible grown-up tie-in (optional, decide at build time)

Results could feed the 'Where to start' placement check — if a child consistently misses
beginning sounds, that signals starting earlier in the letter sequence. Not required for v1.

## Sequencing note

The owner's explicit call: the app is in pre-pilot stabilization. New games wait until after the
App Store launch. When this gets built, it goes through the normal PR process with both
required reviews.
