# App Store search: the listing's metadata

What App Store search can find and what the product page then has to say. Written for the 1.0
launch, from the live App Store Connect record on 14 October 2026 and `docs/store-listing.md`.
Apply it in App Store Connect (App Information and the 1.0 version page); nothing here is live yet.

## Where the listing stands

The 1.0 version is in "Prepare for Submission". Only the name is filled in. Empty: subtitle, keywords,
promotional text, description, What's New, support URL, marketing URL, privacy policy URL, the
categories and the Kids age band. Search on the App Store runs on the name, the subtitle, the keyword
field, the in-app purchase names and, less, the category: with those empty the app can be found by
its name alone. The URLs and the category are also required before the version can be submitted.

## The fields, ready to paste

| Field | Limit | Text |
| --- | --- | --- |
| Name | 30 | `LittleNest: Early Learning` (26). Keep: the brand plus a plain phrase. (`LittleNest: Learn to Read`, 25, puts the strongest search phrase in the name instead; pick one, not both.) |
| Subtitle | 30 | `Phonics, Reading & Math 3-5` (27) if the app is for ages 3 to 5. `Learn to Read, Math & Coding` (28) if it stays 3 to 7. The subtitle is indexed: it should carry words the name does not. |
| Keywords | 100 | `preschool,kindergarten,abc,letters,sounds,sight,words,spelling,tracing,toddler,kids,games,offline` (97). Commas, no spaces, no word already in the name or subtitle (Apple indexes those once), no plurals of a word already there, no competitor names. |
| Promotional text | 170 | `Five happy minutes a day. No account, no ads, works offline, and nothing leaves your device. Your child's own animal is the hero of every story.` (144). Not indexed; can change without a new build. |
| Description | 4000 | The description in `docs/store-listing.md`, with its first two sentences changed to lead with the search phrases a parent types: "Learn to read with phonics, then count, tell time, build and code: a calm first app for ages 3 to 5." Only the first three lines show before "more". |
| What's New (1.0) | 4000 | "First release. Letter sounds, blending by sliding a finger, tiny readers starring your child's animal, and first steps in numbers, colors, time and money, building, science and coding. Weeks 1 and 2 of reading are free for good." |
| Support URL | | `https://littlenestlearning.app/support` |
| Marketing URL | | `https://littlenestlearning.app/` |
| Privacy policy URL | | `https://littlenestlearning.app/privacy` |
| Primary category | | Education |
| Secondary category | | Kids (set by choosing a Kids age band under App Information) |
| Kids age band | | "5 and under" if the app is for ages 3 to 5; "6–8" cannot be chosen together with it, so this follows the ages decision. The band decides which Kids shelf the app sits on. |
| In-app purchase display name | 30 | `Full LittleNest: all lessons` (28). In-app purchase names are indexed by search too; today's "Full LittleNest" carries no search word. |
| Age rating | | 4+. |

## The ages decision comes first

The subtitle, the description's first line, the Kids age band and the website all say an age. Today
the app's share message and the store listing say 3 to 7, the website's home page and the book say
3 to 5. Search gives one answer: a parent of a three-year-old types "preschool" and "toddler"; a
parent of a six-year-old types "kindergarten" and "1st grade". One band, named the same everywhere,
is what the listing needs.

## After the text

- **Screenshots.** The store needs the 6.7-inch and 6.5-inch iPhone sets and the 13-inch and
  12.9-inch iPad sets. Captions are not indexed, but the first two screenshots are what converts a
  search result into an install: lead with the slide-to-blend word and a reader starring the child's
  animal, each with a five-word caption ("Slide to read the word", "Stories starring their animal").
- **More English storefronts.** Add en-GB, en-AU and en-CA localizations with the same text. Each
  storefront indexes its own localization; without one, those stores fall back to en-US for the
  product page but search coverage is thinner.
- **Ratings.** Search ranking and conversion both lean on ratings. Asking for a review in the app
  once a child has finished a second week (Apple's review prompt, at most three times a year) is a
  small code change for a later build.
- **The website.** It already has a search title, a description and structured data for the app.
  Once the app is live, add the App Store smart banner (`<meta name="apple-itunes-app"
  content="app-id=6818560678">`) and an App Store badge linking to the product page, so a search on
  the web lands on an install.

## What to tell this assistant

Say which name, which subtitle and which age band, and the fields above can be pushed to App Store
Connect through the API in one go, or pasted by hand; the in-app purchase name is changed under the
product itself. Submitting for review stays a step a person takes.
