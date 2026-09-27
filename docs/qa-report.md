# Design and branding check

This note covers the branding and layout pass on `cursor/brand-design-df76`, then the full-stack QA pass on `cursor/final-qa-df76`.

Before shots are the parent branch `cursor/school-roster-df76`, opened in Chromium at iPhone 13 (390×844) and iPad landscape (1024×768). After shots are this branch, from Playwright on the iPhone 13 project and on Chromium at the same iPad size.

Natural-voice audio files are still not in the app. `public/audio` has no recordings, and `npm run generate-audio` was not run.

## What changed

| Check | Result |
| --- | --- |
| Maker credit is “TriageDesk AI LLC” on the start screen, About, privacy line, store copy, and the COPPA draft | Pass |
| Tagline “Made by a parent, for parents” on the start screen, About, and store copy | Pass |
| No personal name and no home address in the app or those docs | Pass |
| Story is a three-page read-along starring the child’s animal. The child’s name is not in the lines | Pass |
| Reading-path Colors step is a pastel tap (Pink / Sky / Butter), not a Soon card | Pass |
| Play library is hidden. Families do not see a Soon tile | Pass |
| Home shows Pilot focus, then the reading path, then Explore with “New - try it!” | Pass |
| Color tiles use soft pastel paints. Patterns stay, with a lighter ink. “Orange” and “diagonal” sit inside the Mix tile | Pass |
| Money play tiles include a picture. Lemonade has a cup, a 44px “Hear it”, and a 56px “Serve” | Pass |
| Clock “Hear it”, “Hour hand”, and “Minute hand” are compact (hand buttons at most 64px tall) | Pass |
| “Save child” uses the primary sage button. The add-child form is at most 440px wide and centered | Pass |
| Grown-ups rows have an icon in the circle, on the cream background | Pass |
| iPad landscape: the reading path and the Numbers tiles sit in the 768px-tall viewport | Pass |
| Letter stroke numbers are at least 12 units apart so “1” and “2” do not read as “21” | Pass |
| Build It “Play” stays inside the iPhone 13 viewport | Pass |

Playwright: `e2e/brand-design.spec.ts`, `e2e/grownups.spec.ts`, `e2e/rewards.spec.ts`, and `e2e/offline.spec.ts` passed on Chromium, Firefox, WebKit, iPhone 13, and Pixel 7 (79 passed, 11 skipped as project-specific). Unit tests: 164 passed.

The Explore row is the home layout only. Per-section error boundaries, namespaced storage, and the reward request API are not part of this change.

## Start screen

iPhone before, “by TriageDesk”:

![Start screen before, iPhone](qa-screenshots/before_start_iphone.png)

iPhone after, tagline and TriageDesk AI LLC:

![Start screen after, iPhone](qa-screenshots/after_start_iphone.png)

iPad before:

![Start screen before, iPad](qa-screenshots/before_start_ipad.png)

iPad after:

![Start screen after, iPad](qa-screenshots/after_start_ipad.png)

## Home

iPhone before, with Play library:

![Home before, iPhone](qa-screenshots/before_today_iphone.png)

iPhone after, reading path first and Explore underneath:

![Home after, iPhone](qa-screenshots/after_today_iphone.png)

iPad landscape before:

![Home before, iPad](qa-screenshots/before_today_ipad.png)

iPad landscape after:

![Home after, iPad](qa-screenshots/after_today_ipad.png)

Numbers on iPad before (tiles split around the shortcut column):

![Numbers before, iPad](qa-screenshots/before_numbers_ipad.png)

Numbers on iPad after (cards and tiles in one column):

![Numbers after, iPad](qa-screenshots/after_numbers_ipad.png)

## Story and color moment

iPhone before, Soon:

![Story before, iPhone](qa-screenshots/before_story_iphone.png)

iPhone after, the fox story:

![Story after, iPhone](qa-screenshots/after_story_iphone.png)

Color moment after:

![Color moment after, iPhone](qa-screenshots/after_moment_iphone.png)

## Colors, money, clock

Colors before:

![Colors before, iPhone](qa-screenshots/before_colors_iphone.png)

Colors after:

![Colors after, iPhone](qa-screenshots/after_colors_iphone.png)

![Colors after, iPad](qa-screenshots/after_colors_ipad.png)

Money play before (text only):

![Money before, iPhone](qa-screenshots/before_money_iphone.png)

Money play after:

![Money after, iPhone](qa-screenshots/after_money_iphone.png)

Lemonade before:

![Lemonade before, iPhone](qa-screenshots/before_lemonade_iphone.png)

Lemonade after:

![Lemonade after, iPhone](qa-screenshots/after_lemonade_iphone.png)

Clock before:

![Clock before, iPhone](qa-screenshots/before_clock_iphone.png)

Clock after, iPhone and iPad:

![Clock after, iPhone](qa-screenshots/after_clock_iphone.png)

![Clock after, iPad](qa-screenshots/after_clock_ipad.png)

## Add a child and Grown-ups

Add-child before, wide panel:

![Add child before, iPad](qa-screenshots/before_add_child_ipad.png)

Add-child after, iPhone and iPad:

![Add child after, iPhone](qa-screenshots/after_add_child_iphone.png)

![Add child after, iPad](qa-screenshots/after_add_child_ipad.png)

Grown-ups before (empty circles):

![Grown-ups before, iPhone](qa-screenshots/before_grownups_iphone.png)

Grown-ups after:

![Grown-ups after, iPhone](qa-screenshots/after_grownups_iphone.png)

![Grown-ups after, iPad](qa-screenshots/after_grownups_ipad.png)

## Tracing and Build It

Tracing before:

![Tracing before, iPhone](qa-screenshots/before_trace_iphone.png)

Tracing after:

![Tracing after, iPhone](qa-screenshots/after_trace_iphone.png)

Build It before (Play below the blocks):

![Build It before, iPhone](qa-screenshots/before_build_iphone.png)

Build It after (Play on screen):

![Build It after, iPhone](qa-screenshots/after_build_iphone.png)

## Full-stack QA

Checked again after the lesson-week, Hatch, and home-dock fixes.

| Check | Result |
| --- | --- |
| Product name LittleNest Learning, bundle id `com.triagedesk.littlenest`, storage keys `littlenest-*-v1` | Pass |
| Pastel tokens in `src/palette.ts` and `:root` | Pass |
| Store name “LittleNest Learning: Ages 3-7” and subtitle “Read, math, science & coding” | Pass |
| App icon name band from the earlier icon pass | Pass. Not regenerated |
| Natural-voice recordings | Not generated. `npm run generate-audio` exits until `GOOGLE_APPLICATION_CREDENTIALS` points at a Google Cloud Text-to-Speech service account. Letter sounds stay human-recorded and are not synthesized. `public/audio` has no mp3 files |
| Unit tests | 183 passed |
| Playwright on Chromium, Firefox, WebKit, iPhone 13, and Pixel 7 | 553 passed, 0 failed, 22 skipped (14.5m) |
| Playwright on iPad (gen 7) | 109 passed, 0 failed, 6 skipped |

Blend, tracing, star, cheer, tip, and learning-path specs seed reading week 0 (M and A) in `e2e/pinLesson.ts`, so a new letter of the week does not change them. The last letter match waits until the draw screen moves on. Hatch level 2 leaves the first letter showing when every letter in the word was taught. On a phone, and on a short tablet, the home dock stays inside the viewport with Science selected. That layout is also checked at iPhone 13 (390×664), iPad portrait (768×1024), and iPad landscape (1024×768).

PIN recovery, the five-family metrics floor, Explore crash isolation, and class QR specs passed inside this run.

### Preview deploy

The combined site is published from the branch named `preview` by the workflow **Preview and demo**. The main demo is `/Kids-app/` and the stack is `/Kids-app/preview/`.

GitHub Pages will not deploy that branch until `preview` is allowed on the `github-pages` environment (Settings → Environments → github-pages → Deployment branches). After it is allowed, re-run **Preview and demo** on the branch `preview` from Actions → Preview and demo → Run workflow. A later push to `preview` runs the same workflow.

A separate, unmerged change to the main Pages workflow builds the `preview` branch into `/Kids-app/preview/` on a future push to `main`, so that publish does not drop the preview site.

Home during this pass:

![Home, iPhone](qa-screenshots/qa_home_iphone.png)

![Home, iPad landscape WebKit](qa-screenshots/qa_home_ipad.png)

![Home, iPad portrait](qa-screenshots/qa_home_ipad_portrait.png)

![Home, Android](qa-screenshots/qa_home_android.png)

![Home, desktop](qa-screenshots/qa_home_desktop.png)
