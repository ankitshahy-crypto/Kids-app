# Reading redesign, more content, and the other sections

*Written Sunday Oct 4, 2026 (ET). The research uses public sources only (links next to each fact). Anything I could not confirm is marked **(unverified)**. Numbers about our own app come from the code on main as of commit `d778edd`. Numbers marked **estimate** are my rough sizing, not facts.*

**Status:** section 3 (weeks 1–4: letter order, word lists, sliding in lessons and stories, Nest words, shared-reading stories) and the reading Friday Challenge are built on the branch `reading-redesign-weeks-1-4`. Everything marked "proposal" is not built. The short version below describes the app *before* that branch.

**Ground rule for everything below:** other apps are a reference for *what works*, not something to copy. No stories, characters, art, names or exact lesson sequences are taken from them. Where we end up close to them (for example, starting with a handful of very common letters), that is because every phonics program follows the same basic principle, and the doc says so.

---

## The short version

- **Reading.com's slide is different from ours in one big way:** their sliders make **no sound**. The child says each sound out loud while dragging, and a grown-up sits beside them. Our slider says each sound for the child.
- **Reading.com teaches 6 letter sounds before the child reads any word** (lessons 1 to 6), so the first words already have choices: rat, mat, sat, ram, Sam. We ask a child to blend in week 1 with only m and a, so "am" is the only word.
- **Our stories already count every letter learned so far, not just the week's two.** But weeks 1 to 3 are thin. In week 1 only 22% of story words can be sounded out (and those are just "am" and "a"), week 2 is 42%, week 3 is 67%. From week 4 on it is about 80%, which is fine. **The concern is real for the first three weeks**, and those weeks are what a new family sees first.
- **Our story reader reads each page aloud as soon as it opens**, so the child hears every word before trying it. Reading.com hides the picture until the child has read the words, so the child can't guess.
- **Proposal:** 3 to 4 sounds a week from week 1 (with a gentler pace you can pick), any sound-out word can be slid in lessons *and* stories, a small set of "Nest words" for words like *the* and *I*, and stories with a grown-up line plus a short child line, so even week 1 has a real story.
- **Content:** we have 26 weeks of reading and then it repeats. Reading.com has 120 lessons and 84 books. I propose about 78 weeks (1.5 years, up to 2 years at the gentle pace) in 7 phases. That means about **185 new stories, 7,000 to 8,000 voice clips and 600 to 900 drawings** for reading, plus roughly **18 new activity types** for the other sections. You can make that in stages that stay ahead of where families are.
- **Ideas for later (proposals only, not built):** Silly reads (3f), Sing-along with karaoke lyrics (3g), Spell my name (3h), a picture question after each story (3i), Pop the Word (3j), Friday Challenges in every section (5), a pet that grows (6), a higher art bar with full scenes, expressive characters and smooth motion (7), Make my story (8).

---

## 1. What Reading.com does

### How the program works
- **A grown-up teaches, following a script on screen.** The white box shows what to say, blue text says what to do, and there are tips and letter-sound buttons for the grown-up. ([support: how to use lessons](https://support.reading.com/en/articles/8774977))
- **Lessons take 15 to 20 minutes, 3 to 5 a week.** Lessons can't be skipped, but a placement check before lesson 4 lets a child start later. ([support: why can't I skip](https://support.reading.com/en/articles/8775425))
- **Size.** The App Store listing says **120 lessons, 84 decodable books, 42 videos, 5 games**, up to 3 profiles, ages 3 to 8, reaching "a late 1st grade level". ([App Store](https://apps.apple.com/us/app/learn-to-read-reading-com/id1534938305)) An older support page says 99 lessons, 60 books (14 co-read), 4 games. ([support: what is Reading.com](https://support.reading.com/en/articles/8773185)) The current curriculum PDF runs to lesson 120, so 120 looks current.
- **Paid by subscription.** It's a 7-day free trial, then "$0.23/day" on one of their landing pages. ([reading.com/momattorney](https://www.reading.com/momattorney))

### Letter order and pacing (from their curriculum PDF)
Source: [parent scope and sequence PDF](https://www.reading.com/uploads/parent_scope_and_sequence.pdf) (18 pages, image-only; I read the pages directly).

| Lesson | New sound | Words in that lesson | Book |
|---|---|---|---|
| 1–6 | m, a, s, t, r, i (one per lesson) | none yet | |
| 7 | review | | |
| 8 | review | rat, mat, sat, ram, Sam | |
| 9 | review | sit | |
| 10 | review | | first book (co-read) |
| 11, 13, 15, 17 | n, d, f, o | e.g. lesson 13: it, sad, mad, and | one book per lesson from here on |
| 20 to 40 | p, c, h, e, g, l, b, u, w, k, roughly every other lesson | review lessons mix in older letters (lesson 27: pan, ham, trip, tent, camp, Dad, men, *are*, ten…) | |
| 42 on | long e, j, v, long a, y, q, long o… later th, soft g, oo, wh, ou/ow | | |

What stands out:
- **Six sounds before the first word, then words from all of them.** At their suggested 3 to 5 lessons a week, lesson 8 comes in about 2 to 3 weeks (my arithmetic).
- **Every other lesson is review.** New letters come about every second lesson, and the review lessons use words with both old and new letters. Their support page says unlisted lessons are review lessons. ([support: scope & sequence](https://support.reading.com/en/articles/8773121))
- **Words with 4 or more letters come early.** "sand", "fast", "raft" and "stop" are all in the first 22 lessons.
- **Tricky words are added a few at a time inside the word lists:** "a" (lesson 14), "the" (18), "to" (21), "are" (27), "come, some" (28), "of" (47), "says" (52), "was, you" (53). Long vowels, digraphs and "irregular sight words" become a focus from lesson 42. ([PDF](https://www.reading.com/uploads/parent_scope_and_sequence.pdf), [homepage](https://www.reading.com/)) How tricky words *look* in the app (colour, icon) is **(unverified)**.

### The sound sliders
From [support: Sound Sliders](https://support.reading.com/en/articles/8775489):
- "The sliders in the app **do not make sounds themselves**." The child is meant to remember and say the sound while dragging. A grown-up can drag to show how.
- **Slow sounds** (sounds you can stretch, like mmm) get a **long blue slider**, and the child stretches the sound for about 3 seconds. **Fast sounds** (like t) get a **short red slider**.
- Blending words with the sliders starts in **lesson 4**.
- Their stated reason: apps work best when an adult uses them with the child.
- The support page links a video of their CEO showing the sliders with his daughter. **I did not watch it** (I only used text sources).

### Books
From [support: Interactive Books](https://support.reading.com/en/articles/8775617) and the [PDF overview](https://www.reading.com/uploads/parent_scope_and_sequence.pdf):
- **Practise the hard words first.** Before a book, the child sounds out new words from it.
- **Co-read books:** each page has grown-up text on top and child text below. The grown-up reads their part, then the child finishes the page.
- **The child taps their text to get sound sliders** for those words.
- **Pictures stay hidden until the child has read the words.** The child "scratches" to reveal them, so they can't guess from the picture.
- **After the book:** comprehension questions, putting story pictures in order, and finding words on a page.
- **The first book the child reads alone (not co-read) is at lesson 35.** Even then, the grown-up is asked to sit with them.

### Games
Hungry Cloud (letters and first sounds), Space Trace (tracing and spelling), Party Time (first, last and middle sounds), Word Piñatas (sight words). There are also printables: Sound Bingo, Dragon Tower, Color-by-Word and others. ([PDF p.4–5](https://www.reading.com/uploads/parent_scope_and_sequence.pdf))

### For contrast: Teach Your Monster to Read (free, Usborne Foundation)
- **Game 1 order:** s a t p, then i n m d, o g c k, ck e u r, h b f, l ll ss, j qu v w, x y z zz. That is the UK "Letters and Sounds" order. The game has **8 islands of about 4 sounds each**, and the child has to show they know them to move on. Sounds a child struggles with come up more often. ([game guide PDF](https://www.teachyourmonster.org/wp-content/uploads/2025/12/TYMTR1-gameguide-2025_KL_01.pdf), [help: what it covers](https://help.teachyourmonster.org/en/articles/5586062-what-areas-does-teach-your-monster-to-read-cover))
- **Blending:** after a mini-game, the child blends some of the letters they collected into a word. There is a separate **segmenting** game (Climb), which breaks a word into its sounds. ([game guide](https://www.teachyourmonster.org/wp-content/uploads/2025/12/TYMTR1-gameguide-2025_KL_01.pdf)) What the blend screen looks like exactly is **(unverified)**.
- **Tricky words:** game 1 has "the first 6" ([site](https://www.teachyourmonster.org/teach-your-monster-to-read/)); the game guide says 8. Game 2 adds sh, ch, th, ng, ai, ee, igh… and 30 tricky words, with sentences. Game 3 covers other spellings of sounds and short books. The site says the three games "cover the first two years of learning to read".

### For contrast: HOMER
- It uses "synthetic phonics": learn letter sounds, then blend them into words, then split words into sounds for spelling. The first important tasks are blending, segmenting and first sounds. ([HOMER research PDF](https://www.beginlearning.com/wp-content/uploads/2025/02/HOMER_The-Research-Behind-HOMER_-Our-Approach-to-Teaching-Literacy.pdf))
- It claims "over 1,000 research-backed lessons, games, and stories" for ages 2 to 6, with a path set by age, interests and level. ([beginlearning.com/homer](https://www.beginlearning.com/homer/pdp)) Its Learn-to-Read pathway has 22 levels. ([pk1kids review](https://pk1kids.com/teach-phonics-reading-online-app-at-home/))
- A parent's App Store review says each section brings in two sounds, starting with a vowel and a consonant. **(Unverified: one user's review.)** A 2026 review blog called HOMER's blending practice "minimal", but **that blog sells a rival app**, so treat it as biased. ([teachyourkidtoread.org](https://teachyourkidtoread.org/blog/best-phonics-app-for-a-4-year-old-5-tested-compared-2026))
- The exact blending screen is **(unverified)**.

**What all three share:** they teach several sounds before (or just as) blending starts, they keep reviewing older sounds, they bring in tricky words a few at a time, and there is always a grown-up or a game that makes the child produce the sound, not just hear it.

---

### Other references (from screen recordings; ideas only, never copied)
- **Duolingo ABC (free):** the child spells their own name with letter tiles, and short illustrated stories end with a comprehension question with picture choices that are read aloud. Behind sections 3h and 3i.
- **Khan Academy Kids:** a cast of distinct, expressive characters with outlines and soft shading, full and seasonal scenes, warm read-aloud books, a shelf-style word-building game. Behind section 7.
- **Reading.com:** clean letter screens with lively tap feedback, bursts and meters. Behind the motion specs in section 7.

## 2. Where LittleNest differs today

| | Reading.com | LittleNest now (code on main) |
|---|---|---|
| Sounds before first blending | 6 (m a s t r i), first words at lesson 8 | **2** (m, a), and blending is asked in week 1 with "am" only (`src/data/schedule.ts`) |
| Pace | New sound about every other lesson; moves on when lessons are done | **2 new sounds per calendar week**, then the week changes whatever happened (with placement as an override) |
| Review | Review lessons with mixed old and new words | Friday review day; word lists are about two-thirds this week's letters and one-third older (`src/data/ladder.ts`) |
| The slide | Silent; the child says the sound; slow and fast sounds look different | **The app says each sound** as the finger passes, then the word. A grown-up setting ("Sounding out: child") makes it silent. All tiles are the same length. |
| Stories: sliding | Tap the child text to get sliders | **No slider in stories.** Tapping a sound-out word makes the app play its sounds, then the word (`StoryReader.tsx`). |
| Stories: reading aloud | The child reads their text | **The narrator reads each page as soon as it opens**, with the words lighting up, before the child tries |
| Pictures | Hidden until the words are read | Shown from the start |
| Co-read | Grown-up text plus child text on every early page | An optional tip line for the grown-up; the whole page is one text |
| Tricky words | Added a few at a time inside lessons; later a focus | A fixed list the app reads whole (`STORY_READ`), lesson list "i a the is see" |
| Amount | 120 lessons, 84 books | **26 weeks, then it repeats**; 76 stories (45 weekly + 7 themed in weeks 1–14, 24 in weeks 15–26) |

**How much of each week's stories a child can actually sound out** (I measured this with the app's own rules):

| Week | New sounds | Share of story words a child can sound out | Words they can sound out |
|---|---|---|---|
| 1 | m a | **22%** | am, a |
| 2 | s t | **42%** | mat, sat, Sam, Tam, at, a |
| 3 | p i | 67% | map, sip, tip, sit, pat… |
| 4 | n d | 87% | sand, pan, dip, nap… |
| 5–26 | | 73–88% | |

So "stories only use the two letters" isn't quite what is happening: from week 2 the stories use every letter learned so far. But **weeks 1 and 2 are mostly read *to* the child**, and that is the first thing a parent sees.

**Two smaller problems I found while checking:**
1. **"I" and "a" are treated as sound-out words in stories.** Once the letter i is taught (week 3), tapping "I" plays the short /i/ sound and then "I", which is the same mistake the old I card made. "a" plays /a/ (as in apple), but in a sentence we say "uh". Both should be Nest words that are read whole. (Small: "is", "has" and "his" sound out with an s, but you say a z. Reading.com also teaches "is" early, so this is a judgement call.)
2. **The narrator reads the page first**, so a child can repeat what they heard instead of decoding it.

---

## 3. Redesign proposal: slider and stories

Plain idea: **teach more sounds sooner, let every word the child *can* read be slid, keep tricky words separate and few, and write stories where the grown-up carries the plot and the child reads a short line made only from what they know.**

### 3a. Letter order for weeks 1–4 (our own grouping)
The same few letters open almost every phonics program because they make the most words: a, m, s, t, i, p, n. Ours uses them too, but the weekly groups and the word lists are our own.

| Week | New sounds (3–4 a week) | All sounds known | Words a child can slide (sample, all checked against the letters) |
|---|---|---|---|
| 1 | **a, m, t, s** | a m t s | am, at, mat, sat, Sam, Tam |
| 2 | **i, p, n** | + i p n | it, in, sit, sip, tip, tap, pat, pit, pin, pan, nap, man, map, tin, Tim, Pam |
| 3 | **o, d, c** | + o d c | on, not, dot, pot, top, mop, cot, nod, pod, dad, mad, sad, pad, did, dip, cat, can, cap |
| 4 | **u, g, h** | + u g h | up, sun, nut, cut, cup, pup, mud, dug, hug, hum, hut, hat, hop, hot, hid, hit, dog, dig, pig, gum |

- Weeks 5 to 8 finish the alphabet at the same speed (b, e, r; f, l, k; j, w, v; y, z, x, q), then **week 9 is a review week** with no new sounds.
- **Gentle pace setting (for 3-year-olds):** the same order, split so each "week" takes two calendar weeks. That is about the speed we have today. Grown-ups pick it; placement can suggest it.
- **Week 1 always ends with a real word to slide that isn't just "am"**: mat, sat or Sam.
- Moving on: keep the calendar, but **don't move on if the child hasn't finished most of the week**. Instead, repeat the week with new stories. (This needs a small rule change in `schedule.ts`/placement, and it's the closest we get to Reading.com's "finish lessons to move on".)

### 3b. Cumulative word lists
- Each week's lesson list uses **every sound learned so far**: about two-thirds of the words use this week's new sounds, taken in turn so each new sound is in the day's list, and one-third are older words. (Built: a letter card's own picture word, like "bus" on the B card, goes to the back of the list so it isn't read again straight away.)
- **Words of 4 letters arrive by week 3 to 4** (sand, stop, pond, mint). Reading.com shows children manage this early.
- The week's new sounds get **a small coloured dot** under the letter in lessons and stories, so a parent can see the week's focus. That is a marker only; every sound-out word still works.

### 3c. Sliding any word, in lessons and in stories
1. **Lessons:** keep today's slider, with two changes:
   - **Stretchy and quick sounds look different.** Sounds you can hold (m, s, a, f, n…) get a longer tile, and the sound holds while the finger stays on it. Quick sounds (t, p, d…) get a short tile and play once. This is a general phonics idea (continuous and stop sounds), drawn our own way. Holding a sound needs new "held" clips for the stretchy sounds, about 20 clips (estimate).
   - **Hear first, then say.** For the first slides of a new word, the app says each sound (as today). Once the child has slid a word twice with the app, it switches to child-says: the slide is silent, the app says the whole word at the end so the child can check, and a tap on a tile still plays its sound as help. The grown-up setting stays as an override. This copies the *teaching idea* (the child does the sounds), not anyone's screen.
2. **Stories:** **any word the child can sound out can be slid.** Tapping it opens our same slider strip under the line, with the child's animal on it. Words they can't sound out yet (and Nest words) are read whole on tap. This puts the lesson skill straight into the story.
3. **The narrator stops reading the child's line first.** On a page, the narrator reads the *grown-up line* only (or the grown-up reads it). The child line waits. The child slides or reads it, then taps "hear it" to check, or after about 8 seconds a soft hint offers to read it.
4. **The picture gives the payoff, not the answer.** The page's picture shows the scene, but the funny or surprising moment (the cat falls off, the balloon pops) **plays after the child line is read**. That is different from scratch-to-reveal, but it keeps the "no guessing from the picture" benefit.

### 3d. Nest words (sight and tricky words)
- **A short, growing list**, about 2 to 3 new words a week, never more than 3 in a week. Week 1: *I, a, the*. Week 2: *is, to*. Week 3: *go, no, he*. Week 4: *we, my, see*.
- **They look different:** a small feather under the word. Tapping it reads the word whole. In a weekly mini-game (find the Nest word on the page), the app shows which part is tricky. For example, in "the", the "th" is coming later.
- **A Nest word becomes a sound-out word once its sounds are taught** (as the code already does for most words). *I*, *a* and *the* stay Nest words for good.
- Fix the "I" and "a" problem above as part of this.

### 3e. Story rules (each one must pass before it ships)
1. **Two kinds of line:**
   - The **grown-up line** can use any words. It tells the story.
   - The **child line** has only sound-out words for that week, Nest words already taught, and the child's animal's name.
2. **Child line length:** week 1 is 2 to 4 words ("Sam sat."). It grows to one full sentence by week 4 and 2 to 3 sentences by phase 2.
3. **Share of words a child can sound out:** at least 75% of the *child line* in weeks 1–2, and at least 85% from week 3. Checked automatically, like `stories.test.ts` does today.
4. **A real plot in 5 to 8 pages:** someone wants something, tries, something goes wrong or surprises, and it ends. Once the child has read it, the "after" question has a real answer.
5. **No near-copies.** No two stories in a phase share the same plot shape and setting. Ideas come from our own cast (the child's animal and our friends: Sam the duck, Tam the cat…), never from another app's books.
6. **The picture matches the words.** Every thing a page names is in its drawing (we had a plum showing grapes, a sheep showing a hen). This is checked on a phone screenshot.
7. **Voice:** every clip passes the speech checker, and any it doubts goes on your listen list.
8. **Read with a real child** (3–5) or by you before it goes in the build.

**What week 1 could look like (a sample, not final text):**
> *Grown-up:* Fox finds a little mat in the sun. Who will sit on it?
> *Child:* **Sam sat.**
> *Grown-up:* Then Tam the cat comes along.
> *Child:* **Tam sat.**
> *Grown-up:* The mat is full! Where can Fox sit?
> *Child:* **I sat!** *(Fox sits on top, and the pile topples, which plays after the child reads it)*

### 3f. "Silly reads": jokes and riddles a child can read (proposal, not built)
A short strand of **jokes and riddles that unlock each week** and stay on a shelf to reread. Same shared-reading shape as the stories: **the grown-up reads the setup** (any words), and **the child reads the punchline**. The punchline uses only that week's sounds so far, Nest words already taught, and our cast's names. When the child has read it, the **punchline picture appears** (a calm pop, no scratch-off), so the joke lands as a reward for reading, not before.

Rules: the same checks as the stories (child line decodable for its week, the picture matches every thing it names, no near-copies, every clip passes the speech checker). Humour for 3–5 year olds: silly pictures, mix-ups, animals doing people things. No teasing, no toilet humour, no scary twists. 2–3 a week, built from existing drawings first.

**Sample set for weeks 1–4.** Each child line was run through the app's own decodability rules (`storyTokens`) with that week's sounds and Nest words; ✓ means every word is a sound-out word or a Nest word.

| Week | Grown-up reads | Child reads | Picture punchline |
|---|---|---|---|
| 1 (a m t s; I, a, the) | "I am flat. You wipe your feet on me. What am I?" | **A mat!** ✓ | A mat with a face, giggling, covered in muddy paw prints |
| 1 | "Tam the cat has a comfy mat. Who sat on it first?" | **Sam sat!** ✓ | Sam the duck squeezed onto the tiny mat, Tam glaring |
| 1 | "Knock knock. Who's there?" | **Tam! I am Tam!** ✓ | Tam peeking round a door in a party hat |
| 2 (+ i p n; is, to) | "Pip the pig is so sleepy. Where does she nap?" | **Pip naps in a pan!** ✓ | Pip asleep in a big frying pan like a bed, with a pillow |
| 2 | "Round and round I go, until I fall down. What do I do?" | **I spin!** ✓ | A spinning top, and the child's animal dizzy beside it |
| 2 | "Tam wants to show where she hid her toys. What does she stick on the map?" | **A pin! Tap, tap!** ✓ | Tam tapping pins into a treasure map |
| 3 (+ o d c; go, no, he) | "What do you call a cat with a mop on her head?" | **A mop cat!** ✓ | Tam with a mop for hair, very proud |
| 3 | "The pup is tired. Where does he nap?" | **On a cot! Not a pot!** ✓ | The pup stuck in a cooking pot, a cosy cot beside him |
| 3 | "Can a fish nod its head?" | **No! A cod can not nod!** ✓ | A fish trying very hard to nod and flopping over |
| 4 (+ u g h; we, my, see) | "The dog sat in the sun all day long. What is he now?" | **A hot dog!** ✓ | The pup in sunglasses on a bun-shaped float, fanning himself |
| 4 | "I am up in the sky. I am hot. What am I?" | **The sun!** ✓ | A smiling sun wearing sunglasses |
| 4 | "What is a puppy's favourite thing to drink from?" | **A pup cup!** ✓ | The pup with a tiny cup balanced on his head |

(Checked and dropped: "A mop dog!" in week 3, because g isn't taught until week 4.)

### 3g. "Sing-along": songs with karaoke lyrics (proposal, not built)
Songs are one of the easiest ways to get a 3–5 year old to look at words again and again. Each song shows its lyrics on screen, one line at a time, **karaoke-style: each word lights up in time with our own recording.**

- **Timing:** reuse the story word-timing pipeline (the one that makes `storyTimings.json`). Each song line is recorded (sung or rhythmically spoken), the pipeline finds where every word starts and ends, and the highlight follows those times. A check fails the build if any word has no timing or a line drifts more than 150 ms from the recording.
- **Words the child can decode** (only this week's sounds and earlier) are drawn as reading words: after the song, or when paused, a tap opens the slider on that word, as in the stories. Every other word can be tapped to hear it. Nest words show their feather and are read whole.
- **"Sing it again, slower":** a second button plays the same song at about 75% speed (time-stretched so the pitch stays the same), and the highlight times are scaled to match, so a child can follow each word. Then, optionally, a third time with the voice dropped out on the decodable words for the child to sing them.
- **Look and motion:** the line being sung is large in the middle, with the next line faded below; the lit word gets a soft colour change and a small lift (transform only, 60 fps), and the child's animal bobs to the beat. With reduced motion, only the colour changes.
- **Songs:** our own simple tunes or public-domain ones (for example nursery rhymes no longer under copyright), with lyrics rewritten where needed so most words come from the sounds taught so far. One song per pack of weeks to start, about 8 in the first year.
- **Grown-up view:** the lyrics with the decodable words marked, to sing together away from the screen.

### 3h. "Spell my name" (proposal, not built)
A child's own name is the first word most children want to read and write. Early on (from week 1, and again whenever a grown-up asks for it), the child builds their name from big letter tiles.
- The name's letters (plus 1–2 spare letters) sit in a row; the slots show the name faded. Each tile says its **letter name** when tapped ("M"), since names often use letters not taught yet, and lands in its slot with a soft pop. A wrong slot just slides the tile back with a wiggle.
- When the name is done, the narrator says it and the child's animal cheers; then the letters already taught light up ("You know the sound of m!").
- Uses the name typed by the grown-up; a pronunciation check in the grown-up screen (hear the device voice say it, with a "sounds wrong" option to type it as it sounds) keeps the spoken name right. Names with spaces, hyphens or accents keep them; capitals are shown as typed.
- Later versions: the names of family members and of the cast animals.

### 3i. A gentle picture question after each story (proposal, not built)
After the last page, 1–2 questions about the story, with **picture answers** and every choice read aloud when tapped (for example "What did Tam sit on?" with a mat, a hat and a cup). No score and no "wrong" sound.
- Questions are about what happened or what something is (who, what, where), answerable from the pictures and the words the child read, not from general knowledge.
- A miss says the tapped picture's word, then turns back to the page that has the answer for a moment ("Let's look again"), then asks once more. The second try always ends on the right answer, with the story's characters cheering.
- Each story's questions sit in the story data, and a check makes sure every answer is on one of the pages and every choice has a drawing.
- Grown-ups see only "talked about the story" in their view, plus a suggested question to ask at bedtime.

### 3j. "Pop the Word": a fluency game idea (our own design, proposal, not built)
A word-finding game for speed and confidence. It is our own design, not modelled on any other app's sight-word game.
- **How it plays:** the narrator says a word the child has learned ("mat"). Words float in a calm scene: **eggs wobbling in the nest**, or **bubbles drifting at the pond**. The child taps the one that matches. A right tap hatches the egg or pops the bubble softly, and a **meter** (feathers filling the nest) goes up one.
- **Misses are gentle:** the tapped word says itself, the right one glows softly, and the meter never goes down.
- **Full meter:** a calm burst. The child's animal does its cheer, and feathers and petals drift down for about 2 seconds (with reduced motion: a still glow). No timer, and no score shown.
- **Which words:** only words the child has met (sound-out words and Nest words through their week), with **spaced review**: mostly this week's, plus a few older ones, weighted toward words they missed or haven't seen lately (the same rule as the Friday Challenge in section 5).
- **Harder over time:** more items, look-alike words (mat, map, man), then short phrases. It gets easier again when the child is struggling.

---

## 4. How much content: competitors, and a 1–2 year plan

### What others offer

| App | Size (their own words) | Years covered | Price model |
|---|---|---|---|
| Reading.com | 120 lessons, 84 books, 42 videos, 5 games ([App Store](https://apps.apple.com/us/app/learn-to-read-reading-com/id1534938305)) | Ages 3–8, to "late 1st grade". At 3–5 lessons a week, 120 lessons is about 24–40 weeks (my arithmetic) | Subscription |
| HOMER | "Over 1,000" lessons, games and stories; 22 reading levels ([Begin](https://www.beginlearning.com/homer/pdp), [pk1kids](https://pk1kids.com/teach-phonics-reading-online-app-at-home/)) | Ages 2–6 (App Store says 2–8) | Subscription |
| Khan Academy Kids | "5,000+ learning games, books, and videos" ([App Store](https://apps.apple.com/us/app/khan-academy-kids/id1378467217)); "more than 400" books ([blog](https://blog.khanacademy.org/khan-kids-free-books-for-kids/); an older help page says 300+) | Ages 2–8, preschool to 2nd grade | Free (non-profit) |
| Teach Your Monster to Read | 3 games | "The first two years of learning to read" ([site](https://www.teachyourmonster.org/teach-your-monster-to-read/)) | Free on the web (charity); app pricing **(unverified)** |
| Todo Math | "2,000+" activities ([App Store](https://apps.apple.com/us/app/todo-math/id666465255)) | Ages 3–8, Pre-K to 2nd | **(unverified)** |
| **LittleNest now** | 26 reading weeks then repeat; 76 stories; about 3,570 clips; maths: count to 10, numbers 0–9, 6 shapes, adding to 5 | About 6 months, then repeats | **One-time fee** |

**What this means for a one-time fee:** we can't match HOMER or Khan in sheer numbers, and we shouldn't try. Families pay once, so the content has to be **deep enough to last 1.5 to 2 years**, and **cheap enough to make well**. That means fewer, better stories that get reread, and game *types* that create endless fresh rounds from the same drawings (the game kit already does this).

**A useful fact about our app:** progress is gated by calendar week. A family that starts today can't reach week 30 before about 30 weeks have passed, except through placement. So **content only has to stay about 10 weeks ahead of the furthest family**. Packs can be released in stages without anyone hitting a wall. (Placed children start later, so each pack should land well before families need it.)

### Proposed reading curriculum (about 78 weeks at the normal pace; about 2 years at the gentle pace)

| Phase | Weeks | What's taught | Stories per week |
|---|---|---|---|
| 0. Sound play (optional, age 3) | 4 | Rhymes, first sounds, clapping word parts. No letters yet | 2 picture stories read *to* the child |
| 1. Letter sounds + first blending | 1–9 | All single letters at 3–4 a week (3a above), CVC words, first 10–12 Nest words; week 9 review | 3 |
| 2. Smooth CVC reading | 10–16 | Words with 4 letters (sand, milk), -s endings, ss/ff/ll/ck, simple sentences; Nest words to about 25 | 3 |
| 3. Digraphs | 17–24 | sh, ch, th, wh, ng, nk, qu; review week at 24 | 3 |
| 4. Blends | 25–32 | st, sp, fl, tr, gr, -nd, -mp, -st (frog, stamp, crisp) | 3 |
| 5. Long vowels | 33–52 | Magic e (a-e, i-e, o-e, u-e), then ee/ea, ai/ay, oa/ow, igh/y, oo; a review week every 5th week | 3 |
| 6. Other vowel sounds | 53–62 | ar, or, er/ir/ur, ou/ow, oi/oy, aw, soft c/g | 3 |
| 7. Early fluency | 63–78 | Two-syllable words, -ed/-ing, compound words; 2–3 part stories, simple non-fiction, rereading for speed; Nest words to about 100 | 2 new + rereads |

- **Every 5th week is review** with no new sounds, using stories that mix everything so far.
- **Reading goal at the end:** roughly the same end point as Reading.com and TYM (late 1st grade). This is a goal, not a promise.
- **About 100 Nest words in total.** The exact list will be our own pick of common English words (for example from free public word-frequency lists); which list to use is still to be decided.

### Size of the reading job (estimates)

| Item | How I got the number | Estimate |
|---|---|---|
| Stories | 78 weeks × about 3 = about 234, minus about 50 current stories worth keeping after a rewrite | **about 185 new** |
| Story clips | Today, 76 stories have 2,315 clips (about 30 each, because every line naming the child's animal is recorded once per animal) | **about 5,500**, or **about 2,000** if the animal's name is recorded once and joined in (recommended) |
| Word clips | About 25 new words a week × 78 = about 1,950, minus 686 we already have | **about 1,300** |
| Instructions, Nest words, held sounds | | **about 300** |
| **Clips total** | | **about 7,000–8,000** (or **about 3,500–4,000** with the name change) |
| Drawings | About 3 new props or scenes per story, after reuse, plus about 150 word pictures | **about 600–900** |

### How to make it sustainably
- **Release in packs of about 8 weeks** (Phase 1 first, which also fixes the week-1 problem), each one finished before families reach it.
- **One art style that can be reused:** a fixed cast, about 10 scene backgrounds, and a library of props. New stories reuse scenes, and only new things get drawn.
- **Automatic checks do the boring work:** the decodability check, the picture-matches-noun check (each prop tagged with the word it shows), the speech check on every clip, and a near-copy check that compares plots and words across stories.
- **People do the parts that need judgement:** one adult read-through and one listen per story, and a child test per pack.

### The long-term model in three layers (the week data is built for this)
The weeks 1–4 build already lays out the week data so this plan can grow without rework.

**Layer 1: one path of about 78 weeks in 7 phases, released in 8-week packs.**
- `src/data/curriculum.ts` names the 7 phases (plus the optional phase 0) with their target weeks, and sets `PLANNED_WEEKS = 78` and `PACK_WEEKS = 8`.
- `src/data/schedule.ts` holds the weeks as **`READING_PACKS`**. Each pack is a list of weeks, and each week has its new sounds, review sounds, Nest words, phase and kind (letters, review or practice). The calendar path is just the packs one after another, so **a new 8-week pack slots in at the end** (or a pack can be rewritten) without touching the rest. A check at load time fails if the week numbers don't run on in order.
- Pack 1 (weeks 1–8) is the whole alphabet at 3–4 sounds a week, with Nest words. Pack 2 (weeks 9–16) is a review week, then practice weeks on letters that are easily mixed up, then sh/ch and th/ng. Packs 3–4 are the weeks we already had, moved later. Gentle pace (`readingPace: "gentle"`, a grown-up setting) shows each week for two calendar weeks.

**Layer 2: things a child comes back to, not just the next week.**
- **A rereadable book library:** every story the child has met stays on a shelf, by week and by phase. The cover shelf already offers the week's other stories. Rereading is where fluency comes from. (Follow-up: a "My books" shelf screen.)
- **Game difficulty that adapts:** the word ladder already moves a child up after blended words and stops at what their sounds can spell. Each game gets the same idea: more choices and look-alike words when a child is doing well, and fewer choices with more picture help when they're not. The child never sees it as a level.
- **Explore anytime:** the Explore sections (Numbers, Colors, Time & Money, Science, Build, Coding) stay open any day, outside the reading path, with their own weekly topics (section 5).

**Layer 3: more than one child on one purchase. This already exists.**
- The app already keeps several child profiles on one device (`useProfiles` and the profile picker), each with their own week, ladder step, stars, nest and settings. The unlock is for the device, not for each child (`useUnlock`, `access.ts`), so **one purchase covers every child on it**. The new settings for each child (sounding out, reading pace, words slid with the app) are stored on their own profile. Nothing new needs building here.

---

## 5. The other sections: what to teach, over 1–2 years, and activities worth building

**What's here now** (from the code): Numbers covers counting to 10, numbers 0–9, 6 shapes and adding to 5. Colors covers hearing a colour, mixing and painting. Time & Money has rebuilt round games (the clock, coins). Science has 6 topics (life, homes, body, weather, senses, float). Build has 5 machines (bridge, tower, ramp, simple machines, balance). Coding has 4 logic games, dance and song blocks, and "Read the code". Each was rebuilt on the game kit after the TestFlight build, but each is still only a few weeks deep.

**The standards I used as a guide:**
- **Head Start ELOF, preschool maths** has goals P-MATH 1–10: counting, small sets, number and quantity, comparing, numerals up to 5, adding to and taking away, simple patterns, measuring, shapes, and position in space. ([HeadStart.gov](https://www.headstart.gov/school-readiness/article/math-preschool))
- **ELOF science** has goals P-SCI 1–6: observe, talk about it, compare and sort, ask and predict, investigate, and draw conclusions. ([ELOF PDF](https://www.famconn.org/_files/ugd/4cfb9a_ddfe4676ecde416fa9a1ccd9beb20422.pdf))
- **Common Core kindergarten maths:** count to 100 by ones and tens, count up to 20 objects, add and subtract within 10 (quickly within 5), split numbers up to 10, compare, sort into groups, and shapes. ([corestandards.org K.CC](https://thecorestandards.org/Math/Content/K/CC/))
- **Clocks and money come later in Common Core:** time to the hour and half hour is **grade 1** (1.MD.B.3), and coins and dollars are **grade 2** (2.MD.C.8). ([corestandards.org MD](https://www.thecorestandards.org/Math/Content/MD/))
- **NGSS kindergarten science:** pushes and pulls (K-PS2), sunlight warms the ground (K-PS3), what plants and animals need (K-LS1), weather patterns (K-ESS2), and needs and where things live (K-ESS3). Engineering for K–2 includes "how the shape of an object helps it work" and "compare two designs". ([NGSS K](https://www.nextgenscience.org/sites/default/files/K%20combined%20DCI%20standardsf.pdf), [K topic model](https://www.nextgenscience.org/sites/default/files/K%20Topics%20Model%20Summary%20and%20Flowchart.pdf))

**Apps I used as a reference (for the general idea only):**
- **ScratchJr** is free, for ages 5–7: children snap picture blocks together to make their own stories and games. ([scratchjr.org](https://scratchjr.org/about))
- **codeSpark** is word-free coding puzzles for ages 3–10. ([codespark.com](https://codespark.com/how-it-works))
- **Khan Academy Kids** covers maths, logic and books, levelled from preschool to grade 2. ([help](https://khankids.zendesk.com/hc/en-us/articles/360014856151))
- **Todo Math** has 2,000+ activities, Pre-K to 2nd. ([App Store](https://apps.apple.com/us/app/todo-math/id666465255))
- **Not researched for this doc:** Toca Boca, Sago Mini, PBS Kids, Lingokids and Montessori apps. They're known for open-ended pretend play, but I'm not making claims about their content.

**One finding to act on now:** our money game asks which coin pays (dime, nickel). That is a grade 2 skill, and it is too hard for ages 3 to 5. Clock times are grade 1. **Keep coin values and clock times for ages 5 to 7**, and give 3 to 5 year olds the earlier ideas (one coin buys one thing; morning, then lunch, then night).

### Numbers
**Teach:** counting and "how many", recognising small sets at a glance, comparing, numerals, adding and taking away, patterns, measuring, shapes.

| Stage | About when | Goals |
|---|---|---|
| A | Months 1–4 | Count to 10, one tap per thing, "the last number is how many", numerals 1–5 |
| B | Months 5–9 | Count to 20, numerals to 10, more/fewer/same, add to and take away within 5 |
| C | Months 10–15 | Ten-frames, splitting numbers up to 10, add and subtract within 10, measuring with blocks |
| D | Months 16–24 | Count to 100 by 1s and 10s, make 10, shapes that build other shapes (age 5–7) |

**Activity ideas (ours):**
1. **Nest Bakery.** An animal customer asks out loud "Four berries, please!" and shows four dots. The child drops berries on a tray, and the customer counts them back one by one as they're eaten. Teaches counting out a number and "how many". It scales to 20 with a 10-slot tray. Fun part: the customer reacts (too few makes a sad face, too many makes it giggle).
2. **Peek-a-boo Barn.** Five chicks run behind a haystack, and two peek out. "How many are hiding?" Teaches taking away and splitting numbers. It grows to 10, and the hay can blow away to check the answer.
3. **Tall, Long, Heavy.** Compare two things on a seesaw or with a stack of blocks: "How many blocks tall is the giraffe?" Teaches measuring with things like blocks.

### Colors (and art, sorting, patterns)
**Teach:** colour names, then sorting by one feature and then two, AB/ABB/ABC patterns, mixing colours with a guess first. Colour names aren't a separate standard. Sorting and patterns match ELOF P-MATH 7, P-SCI 3 and K.MD.B.3.

| Stage | Goals |
|---|---|
| A | Name 8 colours; sort by colour |
| B | Primary mixing (guess first, then mix); AB patterns; light and dark |
| C | Sort by colour *and* shape; ABB/ABC patterns; make your own picture |

**Activity ideas:**
1. **Mix Kitchen.** The child picks two paint pots. The animal asks "What will it make?" and shows three choices, then they pour and stir. Teaches guessing before testing.
2. **Laundry Day.** Socks blow off the washing line, and the child sorts them into baskets by colour, then by colour and stripes. Teaches sorting.
3. **Parade Flags.** A string of flags goes red, blue, red, blue… and the child picks what comes next. Later patterns get harder (ABB, ABC). The parade marches off when the pattern is right.

### Time & Money
**Teach (ages 3–5):** order of the day, before/after, day and night, one coin for one thing, needs and wants with pictures. **Ages 5–7:** o'clock, then half past, then coin names and values.

**Activity ideas:**
1. **My Day.** Drawn pictures of the child's animal's day (wake, breakfast, play, bath, bed). The child puts them in order, and a row fills in with the pictures as they go. That fixes the old word-only version.
2. **Market Stall.** Early level: each fruit costs one coin, so the child puts one coin by each thing (counting one-to-one). Next: prices of 1 to 5 pennies, counted out loud. Ages 5–7: real coin names and values, said and shown.
3. **Sun Clock Garden** (ages 3–5). The sun moves across the garden, and the child picks what the animal does at that time (sunrise is wake up, high sun is lunch, moon is sleep). For ages 5–7 the same garden adds a clock face that teaches the two hands first, as you asked.

#### Calendar learning: days, months, seasons and years (proposal)
As a guide by age: **the days and their order for ages 3–5**, **months and seasons for ages 4–6**, and **reading a calendar for ages 5–7** (Head Start ELOF and Common Core ideas about order and time; reading a calendar goes with grade 1 time work).
- **A "Today is…" moment (daily, about 30 seconds):** the child's animal says the day ("Today is Tuesday!"), picks today's weather with the child, and names the season in a matching scene. It sits at the start of the day's path.
- **Songs and chants:** short **original** songs for the days and the months, recorded in our narrator's voice. No existing songs or tunes are copied.
- **Ordering games:** yesterday, today and tomorrow with picture cards; **the Week Train** (seven carriages to put in order, and the train goes when they're right); **the Year Wheel** (12 months round a wheel, coloured by season, with the child's birthday month marked by a cake).
- **"How many years old?":** count the candles on the animal's cake ("last year I was 3, now I am 4"), and a birthday countdown by months for ages 5–7.
- **Calendar words get read, not just heard:**
  - When a calendar word, or part of one, can be sounded out with the child's sounds so far, it can be **slid** like any other word ("sun" in Sunday; "hot" and "sun" when talking about summer).
  - Names that can't be sounded out yet (Monday, March) are treated as **Nest words** and read whole on a tap. **The parts that can be sounded out light up** as the child learns more sounds ("Sun" in Sunday from week 4), so the child sees a name becoming readable.
- **Friday Challenge:** "Help the animal pack for the week": put tomorrow's picture after today's. Like the others, it brings back earlier weeks too.

### Science
**Teach:** observe, guess, test, say what happened, using topics from NGSS K: pushes and pulls, sunlight, what living things need, weather, homes.

| Stage | Goals |
|---|---|
| A | Look and notice: senses, animals and their homes, weather words |
| B | Needs: plants need water and light, animals need food; weather patterns over a week |
| C | Pushes and pulls, sunlight warms things, shade; guess, then test |

**Activity ideas:**
1. **Grow a Seed (over several days).** The child plants a seed, gives it water and sun, and checks it each day: sprout, leaves, flower. Too little water makes it droop. Teaches what plants need, and gives a reason to come back.
2. **Weather Window.** Each day the child picks today's weather and dresses their animal for it. After a week, a picture chart shows the pattern ("3 sunny days!").
3. **Push Park.** A soft push or a big push on a swing or cart. The child guesses first how far it will go, then sees.

#### A weekly science lesson tied to a Friday Challenge (proposal)
Each week has **one topic**, one short lesson and a few activities, and ends with a Friday Challenge in the same style as reading's.
- **The lesson (2–3 minutes, on open):** spoken and picture-led, with the child's animal as the curious one ("Where did the puddle go?"). It has 4–6 picture steps, a guess before the answer, and one **hands-on prompt for home** shown to the grown-up ("Put one ice cube in the sun and one in the shade. Which melts first?").
- **Practice (2–3 activities through the week):** sort, match, and guess-then-test games built on the game kit, with new rounds each time.
- **Friday Challenge:** 4–5 picture questions in a little adventure (see the Friday Challenge spec below): **mostly this week's topic, plus 1–2 questions from earlier topics**.

| Week | Topic | Standard it leans on | Hands-on prompt (sample) |
|---|---|---|---|
| 1 | My senses | ELOF P-SCI 1 (observe) | Feely bag: guess by touch |
| 2 | Living or not living | K-LS1 | Find 3 living things outside |
| 3 | What animals need | K-LS1, K-ESS3 | Fill a bird's water dish |
| 4 | What plants need | K-LS1 | Plant a bean in a cup |
| 5 | Animal homes | K-ESS3 | Spot a nest or a burrow on a walk |
| 6 | Weather words | K-ESS2 | A weather picture each morning |
| 7 | Weather over a week | K-ESS2 | Make a week's weather chart |
| 8 | Review week | | Retell a favourite experiment |
| 9 | The sun warms things | K-PS3 | Ice cube in the sun and in the shade |
| 10 | Shade and shelter | K-PS3 (design a shade) | Build a shade for a toy |
| 11 | Pushes and pulls | K-PS2 | Push a toy car softly, then hard |
| 12 | Bumps and changing direction | K-PS2 | Roll a ball into a wall |
| 13 | Sink or float | ELOF P-SCI 4–5 (predict, test) | Bath-time guesses |
| 14 | Seasons | K-ESS2 | Collect leaves or flowers |
| 15 | Day and night sky | ELOF P-SCI 1–2 | Spot the moon at bedtime |
| 16 | Review week | | Show and tell an experiment |

(The standards are the Head Start ELOF P-SCI 1–6 and NGSS K goals listed above. Later topics follow the same pattern: water, rocks and soil, life cycles, my body, recycling.)

### Build (engineering)
**Teach:** a problem, an idea, a test, fixing it, comparing two designs (NGSS K–2 engineering).

**Activity ideas:**
1. **Help a Friend Across.** The ducklings can't cross the stream. The child picks parts (log, plank, stones), tests them, sees what fails (the plank is too short and gets wet), and tries again. Over time the problems get harder.
2. **Rain Roof.** Build a shelter from leaves, paper or wood, then the rain comes. Which one kept the animal dry? Compare two at once.
3. **Ramp Lab.** Raise or lower the ramp and guess where the ball stops. Ties into pushes and pulls.

### Coding
**Teach:** a sequence of steps, then repeat (loops), then fixing a mistake (debugging), then "when this happens" (events) and if/then. ScratchJr (ages 5–7) shows that making something creative works. codeSpark shows that word-free puzzles work from age 3. There is no Common Core kindergarten standard for coding. CSTA K–2 standards exist, but **I didn't check them for this doc**.

| Stage | Goals |
|---|---|
| A (3–4) | 2–4 step paths, first/then, patterns |
| B (4–5) | Repeat blocks, finding the one wrong step |
| C (5–7) | When tapped, if/then, numbers on blocks (move 3); make your own dance, song or story |

**Activity ideas:**
1. **Find the Oops.** The animal's path program has one wrong arrow, and it bumps into a bush. The child finds and swaps the wrong block. Teaches debugging.
2. **Recipe Robot.** Put picture steps in order to make a sandwich, then press Play and the robot follows them, getting messy if they're wrong. Later levels add "repeat 3 times".
3. **Make a Show** (free play). Use the blocks the child has learned to make their animal dance, sing and move across a stage, then play it back for the grown-up.

### Size of the job for the other sections (estimates)
About 3 new activity types per section, 6 sections, so **about 18 activity types**. Each needs about 30 to 60 drawings and 100 to 250 clips, so about **500 to 900 drawings and 1,500 to 3,000 clips** overall. Each activity type then makes fresh rounds from those pieces, so it lasts months without more art.

### Friday Challenges in every section: spaced review that feels like a game (spec)
It's called the **Friday Challenge**, both on the child's screens and in the grown-up view. (Reading's challenge for weeks 1–4 already works this way in the current PR.)

**What goes in (review that builds up week by week):**
1. **Mostly this week:** 3 of 5 items (or every item in week 1, when there's nothing earlier).
2. **A few from earlier weeks:** at least 2 items, more when the week has few new ones. Earlier items are picked in this order: first ones **missed on their last try**, then ones **never tried in a challenge**, then the **least sure** (fewest right on the first try out of the times asked), then the ones **tried longest ago**. With no history, the most recently taught come first.
3. When a week has more new items than fit, the least sure of them are kept.
4. The result for each item (right on the first try or not, the date, times asked, times right) is saved on the child's profile. Only the grown-up view shows them.

In the code (reading): `checkInSounds(weekLetters, introduced, limit, soundChecks)` in `src/data/progress.ts`, tested in `progress.test.ts`. The other sections use the same rule on their own items (topics, shapes, days).

**How it feels: a little adventure, never a test.**
- Each challenge is a small story with the child's animal: **feed your animal** (reading, built), **build the nest** (one twig per answer), or **a treasure path** (one step per answer).
- **No test words** on the child's screens ("check", "quiz", "score", "wrong" are never used), and **no score is shown**. A row of berries or twigs fills up for every item, whatever happened.
- **Gentle help on a miss:** nothing is marked wrong. The sound or question plays again and the right answer glows softly. Every item still ends with the reward.
- It ends with a calm cheer from the animal and a star for playing.
- **The grown-up view** shows what was practised and what to come back to ("Still practising: d, o"), plus the suggestion about who says the sounds.

### The bar every new game must meet before it ships
1. **One clear skill**, named in plain words and tied to one standard above.
2. **Spoken instruction on open**, a pointing hand for the first move, and a speaker button to hear it again. No reading needed.
3. **Every choice is a picture** that says its name when tapped.
4. **A right answer pays off:** a chime, the animal cheers, and the answer is named.
5. **A wrong answer is gentle:** a wiggle, and help after 2 to 3 tries.
6. **At least 3 rounds**, new each play, with the right answer in a different place each time. Checked by a test.
7. **It happens in a drawn scene** with the child's animal, and it has an ending.
8. **It works at phone and iPad sizes**, with a screenshot check of every round type.
9. **Every clip passes the speech check**, and any doubtful clips go on your listen list.
10. **Tried by a real child aged 3 to 5** (or by you) before it goes in a build.

---

## 6. A pet that grows with reading (proposal)
The child's chosen animal becomes a pet that **hatches and grows** as the child reads. It builds on what's there already: the hatch levels, My Nest, the closet and the stickers.
- **Hatch and grow:** it starts as an egg in week 1 and hatches after the first few lessons. It grows through 4–5 stages over the first months (tiny, small, big, grown-up), based on reading done, not on calendar days.
- **Earns things by reading:** finished lessons, stories and Friday Challenges earn **food** (berries, seeds), **toys** (a ball, a kite) and **nest items** (a blanket, a lamp, a swing) to put in the nest scene.
- **In the stories:** the pet is already the hero by name. Its stage and outfit show in the pictures, and later stories can mention things the child gave it.
- **Kind by design:** it **never gets sad, sick, hungry or hurt**, never loses anything and never runs away. A skipped day or week changes nothing. When the child comes back, the pet is happy to see them ("You're back! I saved you a berry."). No streaks to break, and nothing to buy with real money.
- **Calm care play:** feed, brush, tuck in. Each takes a few seconds, has no timer and can be skipped. It's a reward, not a chore.
- **The grown-up view:** what the pet earned and why ("3 stories read this week").

## 7. Art and animation plan, in our pastel colours (proposal)
Keep the pastel theme (sage, butter, peach, sky blue, cream), and make the drawings and the movement more polished and more consistent. **The bar is motion as smooth and lively as Reading.com's** (crisp tap feedback, bursts, meters that fill, bouncy character reactions), in our own calmer style.

### Where our art is now, and the new bar
Most of our pictures today are single flat icons on a plain card (a cup, a hat, a fox head). That works for a word picture, but it doesn't feel like a book. **The new bar is full scenes with expressive characters**, as in the best apps for this age: Khan Academy Kids has a cast of distinct characters with outlines and soft shading in rich scenes, seasonal scenes (a winter snowman), and warm read-aloud picture books (kindness, sharing). Reading.com keeps its letter screens clean, with lively tap feedback. We take the idea of each, never the drawings: **our own cast, our own scenes, in our pastel palette.**

- **Story pages:** every story page becomes a full scene (background, ground, the characters doing the action, 2–4 props), not one icon. The child's animal and two or three recurring friends appear across stories, so the books feel like one world.
- **Word pictures** (lesson tiles, game cards) stay simple single objects, because a child must know what the picture is at a glance. They get the same outline and shade rules so they match the scenes.
- **Letter screens** stay clean (like Reading.com): big letter, plenty of space, the life comes from motion and sound, not clutter.
- **Seasons:** each background has a winter, spring, summer and autumn version (snow and a snowman, blossoms, sun and sand, falling leaves), switched by the calendar, which also links to the Time strand (section 5).
- **Warm themes:** the shared-reading stories lean towards kindness, sharing, helping, and trying again, told through what the characters do, not a moral at the end.

### Illustration style guide (one page, used for every new drawing)
- **Colours:** the existing colour tokens only (sage, butter, peach, sky, cream, plus ink for details), with up to 2 tints of each for shading. No pure black, no neon.
- **Shapes:** round, soft and chunky, with rounded corners, flat fills and **one soft shade** on the side away from the light (always top-left light). No textures.
- **Lines:** **one soft outline** in a darker tint of the fill colour (not black), about 2.5 px at phone size, slightly thicker on characters than on props, so characters stand out from the scene.
- **Characters:** a named cast of 6–8 distinct animals with different silhouettes (tall, round, long-eared, winged), so a child can tell them apart from the shape alone. Big heads, eyes with one highlight, and **expressive faces**: each one has at least happy, surprised, sad, thinking and silly faces, plus 4 poses (stand, walk, reach, jump). The child's animal is recognisable from the front, from the side and in a mask.
- **Scenes:** about 10 backgrounds to reuse (meadow, pond, beach, room, farm, sky, hill, night, market, garden), each with a fixed horizon and sky colour, a soft foreground/background depth (the back layer paler), and props drawn to one scale. Each has 4 seasonal versions.
- **Every prop is tagged** with the word it shows, so the check that pictures match the words can run.
- **Cost:** this is the biggest art job in the plan (roughly 8 characters × 5 faces × 4 poses, 40 backgrounds with seasons, 300+ props). Do it in order: the cast first, then the 10 backgrounds, then redraw the weeks 1–4 stories as full scenes, then the rest as each pack ships.

### A word-building game idea (proposal, our own design)
**"Word Shelf":** colourful letter tiles sit on a little wooden shelf; the narrator says a word ("map"), and the child drags letters onto the shelf in order. Each letter says its sound as it lands, then the whole word slides together (our slider motion) and the picture pops out of a box on the shelf. Only letters taught so far appear, with 1–2 spare letters. A miss just slides the tile back with a soft wiggle. It practises spelling (the other half of reading) with the same sounds as the week.

### Motion specs
| What | Spec |
|---|---|
| Frame rate | **60 fps** on a 2018 iPad and an iPhone 11. Animate only `transform` and `opacity` (no layout, no blur filters while moving). No dropped frames in the Safari timeline on the screenshot pages. |
| Easing curves | Enter: `cubic-bezier(0.2, 0.8, 0.2, 1)` (fast out, soft land). Exit: `cubic-bezier(0.4, 0, 1, 1)`. Bouncy reactions: `cubic-bezier(0.34, 1.56, 0.64, 1)` (a small overshoot). Never linear except for drifting particles. |
| Timing | Tap press 80 ms down, 160 ms back up · right-answer burst 600–700 ms · character cheer 700 ms · meter fill 400 ms per step · screen change 200–250 ms · nothing that matters takes longer than 1 s. |
| Squash and stretch on taps | A pressed tile goes to `scale(1.04, 0.92)` (squash) in 80 ms, then back with a small overshoot `scale(0.98, 1.03)` → `1` (stretch) over 160 ms. The character's cheer hop: squash `scale(1.08, 0.9)` at take-off, stretch `scale(0.94, 1.08)` at the top, squash again on landing. |
| Particle bursts | 10–14 small shapes (petals, feathers, little stars in the palette colours) from the answer's centre. Each takes a random angle and a distance of 40–90 px, falls a little under "gravity", spins up to 180°, fades out by 650 ms. A full meter or finished lesson: 18–24 pieces and a slower drift of about 1.5 s. Never full-screen confetti. |
| Meter fills | Each step fills with the bouncy curve and a soft pop. The last step gives a small glow pulse plus the burst and the cheer. |
| Sound sync | The sound effect starts on the same frame as the visual (both started from one function call). The chime at the burst's start, the pop on the press-down (not on release). Spoken words never wait for an animation, and an animation never covers the narrator. |
| Reduced motion | With `prefers-reduced-motion` or the in-app calm mode: no particles, no squash, no hop. A tap shows a colour change, a right answer a still soft glow plus the chime, and a screen change is a 120 ms fade. Nothing loops faster than once a second, and nothing flashes, in any mode. |

### Character states (the child's animal and the cast)
- **Idle:** a slow breath (scale 1 → 1.02 over 3 s) and a blink every 4–6 s.
- **Cheer:** the squash-and-stretch hop above, with ears or wings up.
- **Think:** a head tilt (6°) with a small "…" bubble (used when it's the child's turn, as on the slider).
- **Wiggle:** a ±8° shake for a silly moment or a gentle "try again".
- Later states for the pet: sleep, eat, wave.

### Which tools: CSS/SVG or Lottie/Rive
| Option | Good | Not so good |
|---|---|---|
| **CSS + SVG (+ the Web Animations API for particles)** | Nothing extra to download, works offline, crisp at every size, reuses our SVG characters and colour tokens, easy to switch off for reduced motion, and the tests can see it | Character rigs with many moving parts are fiddly by hand |
| **Lottie** (JSON from After Effects) | Designers can make rich one-off animations | A player library to add (about 60 KB or more), large JSON files, hard to restyle with our colours, playback only (no interaction states) |
| **Rive** | Real-time state machines (idle, cheer, think, wiggle) made for interactive characters, small files | A runtime to add (about 150 KB WASM), a new tool to learn, and the characters would need redrawing in Rive |

**Recommendation:** use **CSS + SVG and the Web Animations API now** for all tap feedback, bursts, meters, screen changes and the four character states. It meets the 60 fps bar, adds no runtime, and keeps the art we have. **Look at Rive later, only for the pet** (section 6), when it has more states (eat, sleep, grow) than CSS can handle cleanly. Skip Lottie.

**Prototype in this PR:** the Friday Challenge's right answer now plays a particle burst from the tapped letter and a squash-and-stretch cheer from the child's animal, in sync with the chime, with the reduced-motion fallback. It is screenshot-checked at phone and iPad sizes.

## 8. "Make my story" (proposal)
The child makes their own little book.
1. **Pick from pictures:** a **hero** (their pet, or a friend from the cast), a **place** (one of our backgrounds) and a **problem** (a lost hat, a rainy day, hungry, stuck up a tree). Each choice is a picture card that says its name.
2. **Build each page from sentence frames, not loose word tiles.** Each page is a frame with slots, and **each slot only takes words that fit it**, so every sentence is correct and makes sense. Never a jumble of words.
   - Sample frames: **[who] [does what].** ("Sam sat.") · **[who] [does what] on the [thing].** ("Tam sat on the mat.") · **[who] has a [thing].** · **[who] can [do what]!** · **The [thing] is [describing word].**
   - Slots are coloured and shaped by job: **who** (round), **does what** (wavy), **where / which thing** (square), **describing** (star). A tile only snaps into a slot of its own kind.
   - The tiles offered are **only words the child can sound out with their sounds so far, plus Nest words they know**. They are also filtered to fit the chosen hero, place and problem, so a page can never say "the sun sat on the cup".
   - **The picture shows what was built:** Sam the duck appears on the mat; the hat lands on the cat. Only combinations we have pictures for are offered.
3. **Slide to read:** when a page is done, the child slides under each word (the same slider) and reads the sentence, and then the narrator reads it back.
4. **Save to "My books":** finished books (3–6 pages) go on a **My books** shelf on the device, and can be read back any time in the narrator's voice. (Every word already has its own clip. A sentence is the word clips joined with a short pause.)
5. **Picture-only mode for younger children (3–4):** the child fills each slot by picking a picture (who, does what, where). The app shows the words under the pictures and reads them aloud. No reading is needed to make a book.
6. **Grown-up view:** see and delete books. Nothing leaves the device.

## What I didn't verify
- How Reading.com's tricky words look in the app, and anything shown only in their videos (I didn't watch videos).
- The exact blending screens in HOMER and Teach Your Monster to Read.
- Teach Your Monster to Read's app price and Todo Math's price.
- Toca Boca, Sago Mini, PBS Kids, Lingokids and Montessori apps (not researched).
- The CSTA K–2 coding standards (not checked).
- Every number marked "estimate" is my rough sizing.
