# Round-plush redesign: the animals, their moods, and their motion

The app's animals move from painted plush portraits to a round-plush look: ultra-round, pillow-soft,
a small face (dot eyes, a tiny smile, two blush spots), pastel. Character motion moves from CSS on
still frames to short video clips. The games, their layouts and the calm palette do not change.

This is the working spec. It starts with one animal, the dog, and nothing is batched until the dog
is approved on a phone.

Settled with Ankit (2026-10-09): no sad animal, ever (a wrong answer gets puzzled); sleepy is added,
for Break time; the mood language is the one drawn below; the dog starts with two clips, idle and
cheer, and the other eight come once those have been seen moving on a phone; the HEVC files are
encoded on his Mac from the frames the pipeline writes.

## 1. The mood language

A face this simple cannot carry a mood on its own, so every mood is said three ways at once, and the
renders of all twelve animals have to agree on the three:

| mood | eyes | the one appendage (ears for the dog) | the whole body |
| --- | --- | --- | --- |
| idle | round dots with a shine | down, at rest | at rest; breathes, blinks, looks aside now and then |
| blink | two shut lines, curved down | — | nothing else moves |
| cheer | happy arcs | up | a bounce: squashes wide, springs tall; mouth open |
| think | up and to one side | one lifted (listening) | tilts 8–10°; small "o" mouth; blush faint. Puzzled, never sad: this is what a wrong answer gets |
| wait | up, patient | half up | leans forward a touch; the smile stays |
| sleepy | half-lidded | down | slumps to one side; a yawn. Break time only (new) |

`docs/round-plush/dog-mood-language.png` draws the six. The nose and the mouth barely change; the
blush is the dial for warmth (full on cheer, faint on think). What the app draws itself stays drawn
(the cheer's sparkles, a sleepy "zz"), so a render never carries a symbol.

The app's moods today are `idle`, `wait`, `think`, `cheer`, `walk` (src/game/kit.tsx) and the
`blink` overlay; the fox has `wave` and `silly` besides. There is no sad animal anywhere, on purpose
(scripts/animal-art.py: "a think that frowns is a sad animal on a child's wrong answer"), and this
redesign keeps it that way unless a place for one is named.

The appendage per animal, so the think and the cheer read the same across the set: cat, fox, bunny,
bear, pig, koala — ears; owl — the brow tufts; duck, penguin — the wings; frog — the eyes themselves
(they are on top); lion — the mane's tufts and ears.

## 2. Stills: what the pipeline takes

The still frames stay the shipped art, under the video and in every place the animal is not alive
(the start screen, the sticker book, the Parent page, a tile). They go through `scripts/animal-art.py`:
one render per frame on a flat backdrop, named `...animal-dog-<frame>...` with `<frame>` one of
`idle` (or none), `cheer`, `think`, `wait`, `blink`, `sleepy` (new: shown on Break time).
The script cuts the figure out, lines each mood face up with the idle face, and ships
`public/animals/dog/<frame>-face.webp` at 512px. A round plush is nearly all head, so the "face"
crop is most of the figure, which is what a board tile wants.

Render brief for the dog, as sent. One backdrop for stills and clips alike: a flat, even green,
which is in none of the animals (a cream plush on a cream backdrop cannot be cut out; on green the
figure and its shadow part cleanly). Each file is named with `animal-dog-<frame>` in it.

The dog, the same words every time:

> A round plush toy dog in the Squishmallow style: ultra-round, pillow-soft, one marshmallow body
> with no neck and tiny stub paws, cream fur with a warm brown patch over one eye and two brown
> floppy ears, a tiny face set low: two black dot eyes with a small white shine, a small black nose,
> a tiny stitched smile, two soft pink blush spots. Sitting, facing the camera, centered, the whole
> figure in frame with air around it. Soft studio light, matte fur, gentle glow, pastel and calm.
> Flat even green backdrop (#5aa85a), no props, no text, no watermark. Square.

Stills (one render each; `animal-dog-idle`, `-cheer`, `-think`, `-wait`, `-blink`, `-sleepy`):

- idle: as above.
- cheer: eyes as two happy arcs, mouth open in a wide smile with a tiny tongue, both ears up, the
  body squashed a little wider as if mid-bounce, blush bright.
- think: eyes looking up and to one side, one ear lifted, the body tipped about ten degrees the
  other way, mouth a tiny "o", blush faint. Curious, not sad.
- wait: eyes looking up, ears half up, the body leaning forward a touch, the small smile.
- blink: identical to idle, eyes closed as two gentle downward curves.
- sleepy: eyes half closed, ears down, the body slumped to one side, mouth a small yawn.

Clips (video, 24 fps, square, camera locked, the same dog and backdrop; `animal-dog-idle`,
`animal-dog-cheer`):

- idle, 8 seconds: sitting still, breathing softly (barely visible), blinking twice or three times
  (each blink quick), one slow look to the left and back, one to the right and back, nothing else;
  the first and last frames the same neutral pose, so it loops.
- cheer, 1 second: from the neutral pose, eyes to happy arcs, both ears up, one bounce (the body
  squashes wide, then springs tall, lands), mouth open, blush bright; the last frame back at the
  neutral pose.

One render at a time, so the animal is never quite the same twice: the script's line-up handles small
differences; a frame that cannot be lined up is reported, not shipped.

## 3. Video: idle life and the moves

### Timing, from the reference (`avatar-reference.mp4`, measured frame by frame)

- A blink is about 200 ms: the lids come down in one frame (33 ms), stay shut about 100 ms, and open
  over about 70 ms. Down fast, up slower.
- The reference blinks about once a second (three blinks in 3.8 s), which reads lively. For a calm
  lesson: one blink every 3–5 s, random in that range, with a double blink about one time in six.
- A look-aside: eyes lead, the head follows by a few degrees and a few percent of its width, over
  about 0.8 s, held 0.4 s, back over 0.6 s. One every 4–6 s, alternating sides, never during a blink.
- Breathing is almost invisible in the reference and should stay so: about 1.5% of height, 3.2 s a
  cycle, ease-in-out, never stopping.
- After a cheer the reference narrows its eyes to about three quarters for 0.3 s: the contented look.
  Worth keeping at the end of the cheer clip.

### The clips, per animal

| clip | length | loops | where |
| --- | --- | --- | --- |
| idle | 8 s | yes, seamless | everywhere the animal is alive: the game host, the coding board, the home path, Dress up |
| think-idle | 4 s | yes | a held think (a wrong answer, until the next tap) |
| wait-idle | 4 s | yes | a held wait (no tap for a while) |
| cheer | 1.0 s | once, then idle | a right answer, the end of a game |
| hello | 0.7 s | once | Make a dance: hello |
| walk | 0.7 s | once (in place) | Make a dance: walk; Take me home: each step (the step is 480 ms; the clip plays at 1.45×) |
| jump | 0.7 s | once | Make a dance |
| spin | 0.7 s | once | Make a dance |
| dance | 0.7 s | once | Make a dance |
| sing | 0.7 s | once | Make a dance (the notes stay drawn) |

Make a dance's step is 700 ms (`STEP_MS`) and Take me home's is 480 ms (`--step`): the clips fit the
steps as they are, which the brief asks for. Every clip starts and ends on the idle pose, so any two
cut together without a jump and any one hands back to the idle loop.

Budget: at 512×512, 24 fps, HEVC with alpha, an 8 s loop is about 400 KB and a 0.7 s move about
60 KB, so an animal is about 1.5 MB and the twelve about 18 MB in the app bundle (the web demo
fetches an animal's clips only when that animal is chosen). Animated WebP would need no player at
all, but runs four to six times that size, which rules it out at twelve animals.

### Format

Two encodings of each clip, because no one codec carries transparency everywhere:

- `public/animals/<id>/clips/<clip>.mov` — HEVC with alpha (`hvc1`), what WKWebView and Safari play.
  Encoded on a Mac (`ffmpeg -c:v hevc_videotoolbox -alpha_quality 0.75 -tag:v hvc1`, from the PNG
  sequence); nothing on Linux writes it.
- `public/animals/<id>/clips/<clip>.webm` — VP9 with alpha (`yuva420p`), for Chrome and Firefox on
  the web demo. Encoded here.

The `<video>` lists both sources; the browser takes the one it can play.

### What the video tool is asked for

A clip comes from the video generator on the same flat green as the stills (a colour in none of the
animals; a shadow on it is then keyed out with it, which a grey cannot do), camera locked, the animal centered and whole, no shadow on the ground, no
props, no text, starting and ending in the idle pose. The pipeline (`scripts/animal-clips.py`)
keys the background out frame by frame with the same keying for the whole clip (no flicker), crops
to the figure's box over all frames (so the animal never shifts between clips), writes the PNG
sequence and the WebM, and a small `<clip>.json`: the head's box per frame, for the outfits.

## 4. In the app: the player

- `Avatar` (src/avatars.tsx) keeps the stills as the base of the stack. Alive (a mood is given and
  the animal has clips), it lays a `<video muted autoplay loop playsinline>` of the idle loop over the
  idle face, shown only once it is playing; if it never plays (autoplay refused, no codec, reduced
  motion) the stills and the CSS motion stay as they are today. Nothing is ever blank.
- A mood change swaps the clip: `cheer` plays once and hands back to idle; `think` and `wait` cross
  to their held loops; the games pass moods exactly as now (`data-mood`), so no game changes.
- Moves (Make a dance, Take me home) ask for a clip by name through the same prop the CSS poses use
  (`data-pose`, `data-move`); the hop and walk keyframes stay as the fallback.
- Outfits: a hat, scarf or glasses is an overlay on the head, as now. The idle life barely moves the
  head, so the overlays sit still; during a move the overlay follows the head's box from the clip's
  JSON (requestVideoFrameCallback), so the hat jumps with the dog. The sky colour stays a CSS filter,
  which applies to the video as it does to the stills.
- Reduced motion: the stills, as today.
- Loading: an animal's idle loop is fetched when the child is picked; its moves when a game that uses
  them opens. The offline pack lists the clips of this device's animals like the story lines.

## 5. Order of work

1. Dog stills (six frames) and the dog's idle and cheer clips, from the brief above; `animal-art.py`
   and the clip pipeline run on them; a contact sheet and the two clips on a phone. Review.
   (Done 2026-10-09: the renders came back as briefed; the stills are in, the WebM clips are in,
   the `.mov` files wait on the Mac step. What the renders taught the pipeline: a mood frame's
   body is drawn a little bigger or smaller from one render to the next, so a mood frame keeps its
   own crop and is placed by its lower body (`places` in animalArt.json); a generated idle clip runs
   long and never quite returns to its first pose, so the pipeline closes the loop where the end
   best matches the start and blends the seam; a generated cheer is a ten-second performance, so
   `--take` names the second or two of it that is the move.)
2. The dog in one scene (Hatch the Egg: the field, with the near layer), alive. Review.
3. The dog's moves (nine clips). Make a dance and Take me home with them. Review.
4. The other eleven animals, stills first (one sheet), then clips (one sheet with stills from each
   loop), then the thirteen scenes, then the game props.

Review before merge at every step, on a phone, as with the fit and polish sheets.
