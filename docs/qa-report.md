# Design and branding check

This note covers the branding and layout pass on `cursor/brand-design-df76`. It is the before/after review for that work. The later full-stack QA pass (every section, PIN recovery, a crashed Explore section, and the teacher floor of five families) is still ahead of the preview build.

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
