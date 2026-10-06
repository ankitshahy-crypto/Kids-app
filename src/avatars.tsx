import { useState, type CSSProperties, type JSX } from "react";
import type { AnimalId } from "./data/animals";
import art from "./data/animalArt.json";
import type { Mood } from "./game/kit";

const INK = "#2C3A4F";

/**
 * The painted animals (public/animals/<id>/, made by scripts/animal-art.py): which frames each has
 * and where its head sits in the whole figure. A mood with no frame of its own shows the idle frame
 * (the mood still shows in how the animal moves), so frames can land one at a time; an animal with
 * no entry at all is drawn (the shapes below), so nothing is ever blank.
 */
export type ArtFrame = "idle" | "cheer" | "think" | "wait" | "blink" | "wave" | "silly";
export type ArtView = "face" | "body";
type ArtEntry = { frames: ArtFrame[]; body: boolean; head: { x: number; y: number; w: number; h: number }; sky: string };
const ART: Partial<Record<AnimalId, ArtEntry>> = art as Partial<Record<AnimalId, ArtEntry>>;

export function artOf(animal: AnimalId): ArtEntry | null {
  return ART[animal] ?? null;
}

/** The frame a mood shows: its own when the animal has it, else idle (a walk is the idle face hopping). */
export function frameFor(animal: AnimalId, mood: Mood): ArtFrame {
  const frames = ART[animal]?.frames ?? [];
  return mood !== "idle" && mood !== "walk" && frames.includes(mood) ? mood : "idle";
}

/** The view an animal can show: its whole figure only when that is shipped (animalArt.json), else its face. */
export function viewFor(animal: AnimalId, view: ArtView): ArtView {
  return view === "body" && ART[animal]?.body ? "body" : "face";
}

export function artSrc(animal: AnimalId, frame: ArtFrame, view: ArtView): string {
  return `${import.meta.env.BASE_URL}animals/${animal}/${frame}${view === "face" ? "-face" : ""}.webp`;
}

/** The faces a mood can show besides the idle one, in the order they lie over it. */
const MOOD_FRAMES: ArtFrame[] = ["cheer", "think", "wait"];
/** A blink comes round this often (the CSS animation's length), in seconds. */
const BLINK_EVERY = 4.8;

/** What every face takes: the mood its eyes show. */
type Face = { mood: Mood };

/**
 * Every animal's eyes, so that every animal has the same eye language and a mood reads the same on
 * each (CSS on `data-mood`, see index.css "Eyes"): open eyes that blink now and then, eyes that
 * look aside (puzzled) or up (waiting), and a happy pair, two arcs, for a cheer. Big enough to
 * read at the size of a board tile. `round` draws round pupils of that radius (an owl's, a frog's)
 * instead of the oval eyes.
 */
function Eyes({ left = 46, right = 74, y = 62, round }: { left?: number; right?: number; y?: number; round?: number }) {
  const rx = round ?? 6;
  const ry = round ?? 7.4;
  const shine = Math.max(1.4, rx * 0.34);
  const arc = rx + 1.5;
  return (
    <g className="avatar-eyes">
      <g className="avatar-eyes-open">
        <ellipse cx={left} cy={y} rx={rx} ry={ry} fill={INK} />
        <ellipse cx={right} cy={y} rx={rx} ry={ry} fill={INK} />
        <circle cx={left + rx * 0.34} cy={y - ry * 0.36} r={shine} fill="#fff" />
        <circle cx={right + rx * 0.34} cy={y - ry * 0.36} r={shine} fill="#fff" />
      </g>
      <g className="avatar-eyes-happy" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round">
        <path d={`M${left - arc} ${y + 1.5} q${arc} ${-ry} ${arc * 2} 0`} />
        <path d={`M${right - arc} ${y + 1.5} q${arc} ${-ry} ${arc * 2} 0`} />
      </g>
    </g>
  );
}

function CatAvatar({ mood }: Face) {
  return (
    <svg className="avatar-art" data-mood={mood} viewBox="0 0 120 120" aria-hidden="true">
      <path d="M34 58 28 22l26 28Z" fill="#F6B07A" />
      <path d="M86 58 92 22 66 50Z" fill="#F6B07A" />
      <path d="M38 54 34 32l16 18Z" fill="#F6C3CB" />
      <path d="M82 54 86 32 70 50Z" fill="#F6C3CB" />
      <circle cx="60" cy="66" r="34" fill="#F4A261" />
      <ellipse cx="60" cy="78" rx="16" ry="12" fill="#FFF1E0" />
      <Eyes />
      <path d="M60 70 55 76h10Z" fill="#E07A8A" />
      <path d="M44 74h12M64 74h12" stroke="#2C3A4F" strokeWidth="1.6" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function DogAvatar({ mood }: Face) {
  return (
    <svg className="avatar-art" data-mood={mood} viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="28" cy="72" rx="12" ry="20" fill="#C9845A" />
      <ellipse cx="92" cy="70" rx="12" ry="18" fill="#C9845A" />
      <circle cx="60" cy="66" r="34" fill="#E0A06A" />
      <ellipse cx="60" cy="80" rx="18" ry="13" fill="#F6D7BE" />
      <ellipse cx="60" cy="74" rx="7" ry="5.5" fill="#2C3A4F" />
      <Eyes y={58} />
      <path d="M54 84c4 8 10 8 14 0" fill="#F2A3A8" />
    </svg>
  );
}

function FoxAvatar({ mood }: Face) {
  return (
    <svg className="avatar-art" data-mood={mood} viewBox="0 0 120 120" aria-hidden="true">
      <path d="M32 56 26 18l28 30Z" fill="#F09455" />
      <path d="M88 56 94 18 66 48Z" fill="#F09455" />
      <path d="M36 52 32 28l16 18Z" fill="#F6C9B0" />
      <path d="M84 52 88 28 72 46Z" fill="#F6C9B0" />
      <circle cx="60" cy="68" r="32" fill="#E8874A" />
      <ellipse cx="60" cy="82" rx="16" ry="12" fill="#FFF6EA" />
      <ellipse cx="60" cy="76" rx="6" ry="4.5" fill="#2C3A4F" />
      <Eyes y={60} />
    </svg>
  );
}

function BearAvatar({ mood }: Face) {
  return (
    <svg className="avatar-art" data-mood={mood} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="30" cy="36" r="14" fill="#C4A484" />
      <circle cx="90" cy="36" r="14" fill="#C4A484" />
      <circle cx="30" cy="36" r="7" fill="#E7CDB4" />
      <circle cx="90" cy="36" r="7" fill="#E7CDB4" />
      <circle cx="60" cy="70" r="34" fill="#D7B08C" />
      <ellipse cx="60" cy="82" rx="16" ry="12" fill="#F6E6D4" />
      <ellipse cx="60" cy="76" rx="6" ry="4.5" fill="#2C3A4F" />
      <Eyes y={62} />
    </svg>
  );
}

function BunnyAvatar({ mood }: Face) {
  return (
    <svg className="avatar-art" data-mood={mood} viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="42" cy="28" rx="10" ry="24" fill="#F7D5E0" />
      <ellipse cx="78" cy="28" rx="10" ry="24" fill="#F7D5E0" />
      <ellipse cx="42" cy="30" rx="5" ry="16" fill="#F8C2D2" />
      <ellipse cx="78" cy="30" rx="5" ry="16" fill="#F8C2D2" />
      <circle cx="60" cy="74" r="32" fill="#FBE4EC" />
      <Eyes y={70} />
      <path d="M60 78 56 83h8Z" fill="#E07A8A" />
      <path d="M52 88c5 5 11 5 16 0" fill="none" stroke="#2C3A4F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function OwlAvatar({ mood }: Face) {
  return (
    <svg className="avatar-art" data-mood={mood} viewBox="0 0 120 120" aria-hidden="true">
      <path d="M36 40 28 22l18 14Z" fill="#C9B27C" />
      <path d="M84 40 92 22 74 36Z" fill="#C9B27C" />
      <ellipse cx="60" cy="70" rx="34" ry="32" fill="#E6D7A8" />
      <circle cx="46" cy="66" r="14" fill="#FFF8EE" />
      <circle cx="74" cy="66" r="14" fill="#FFF8EE" />
      <Eyes y={66} round={6.5} />
      <path d="M60 76 54 84h12Z" fill="#E0A15A" />
    </svg>
  );
}

function FrogAvatar({ mood }: Face) {
  return (
    <svg className="avatar-art" data-mood={mood} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="38" cy="40" r="16" fill="#8FCB7A" />
      <circle cx="82" cy="40" r="16" fill="#8FCB7A" />
      <Eyes left={38} right={82} y={40} round={7.5} />
      <ellipse cx="60" cy="78" rx="36" ry="28" fill="#A8D992" />
      <path d="M40 80c8 12 32 12 40 0" fill="none" stroke="#2C3A4F" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="46" cy="74" rx="6" ry="4" fill="#F4B0AE" opacity="0.8" />
      <ellipse cx="74" cy="74" rx="6" ry="4" fill="#F4B0AE" opacity="0.8" />
    </svg>
  );
}

function DuckAvatar({ mood }: Face) {
  return (
    <svg className="avatar-art" data-mood={mood} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="64" r="34" fill="#F6C445" />
      <ellipse cx="78" cy="74" rx="18" ry="10" fill="#F09A3A" />
      <path d="M64 74h22" stroke="#C46B22" strokeWidth="2" strokeLinecap="round" />
      <Eyes left={48} right={68} y={56} />
    </svg>
  );
}

function PigAvatar({ mood }: Face) {
  return (
    <svg className="avatar-art" data-mood={mood} viewBox="0 0 120 120" aria-hidden="true">
      <path d="M32 50 30 26l20 16Z" fill="#F4A9B8" />
      <path d="M88 50 90 26 70 42Z" fill="#F4A9B8" />
      <circle cx="60" cy="68" r="34" fill="#F8C4D0" />
      <ellipse cx="60" cy="80" rx="15" ry="10" fill="#F0A0B4" />
      <circle cx="54" cy="80" r="3" fill="#2C3A4F" />
      <circle cx="66" cy="80" r="3" fill="#2C3A4F" />
      <Eyes y={60} />
    </svg>
  );
}

function PenguinAvatar({ mood }: Face) {
  return (
    <svg className="avatar-art" data-mood={mood} viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="68" rx="34" ry="36" fill="#2C3A4F" />
      <ellipse cx="60" cy="76" rx="24" ry="26" fill="#FFF8EE" />
      <circle cx="46" cy="60" r="10" fill="#FFF8EE" />
      <circle cx="74" cy="60" r="10" fill="#FFF8EE" />
      <Eyes left={47} right={75} y={61} round={5} />
      <path d="M52 72h16l-8 10Z" fill="#F09A3A" />
    </svg>
  );
}

function LionAvatar({ mood }: Face) {
  return (
    <svg className="avatar-art" data-mood={mood} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="66" r="44" fill="#D98B3E" />
      <circle cx="60" cy="66" r="32" fill="#F2C069" />
      <ellipse cx="60" cy="80" rx="16" ry="12" fill="#FBE4B8" />
      <ellipse cx="60" cy="74" rx="6" ry="4.5" fill="#2C3A4F" />
      <path d="M52 86c4 5 12 5 16 0" fill="none" stroke="#2C3A4F" strokeWidth="2" strokeLinecap="round" />
      <Eyes y={60} />
    </svg>
  );
}

function KoalaAvatar({ mood }: Face) {
  return (
    <svg className="avatar-art" data-mood={mood} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="26" cy="52" r="18" fill="#A9A6AE" />
      <circle cx="94" cy="52" r="18" fill="#A9A6AE" />
      <circle cx="26" cy="52" r="9" fill="#E9C9CF" />
      <circle cx="94" cy="52" r="9" fill="#E9C9CF" />
      <circle cx="60" cy="68" r="34" fill="#C6C3CB" />
      <ellipse cx="60" cy="76" rx="9" ry="12" fill="#2C3A4F" />
      <Eyes y={60} />
    </svg>
  );
}

const avatars: Record<AnimalId, (face: Face) => JSX.Element> = {
  cat: CatAvatar,
  dog: DogAvatar,
  fox: FoxAvatar,
  bear: BearAvatar,
  bunny: BunnyAvatar,
  owl: OwlAvatar,
  frog: FrogAvatar,
  duck: DuckAvatar,
  pig: PigAvatar,
  penguin: PenguinAvatar,
  lion: LionAvatar,
  koala: KoalaAvatar,
};

/**
 * An animal. `mood` is how it looks (see kit.tsx); `view` is its face (the usual: it reads at tile
 * size) or its whole figure. Painted when the animal's art is there, drawn otherwise.
 *
 * A painted animal is a box (`.avatar-art`, sized by where it sits, as the drawing was). One that is
 * not given a mood (a face on a list, the picker, the home screen) is its idle face and nothing
 * else. One that is given a mood is alive on the page (the one in a game), and is a stack:
 *
 *   the idle face, always there underneath;
 *   the blink, which is only the closed eyes, see-through everywhere else, shown for a moment now
 *   and then (CSS), each animal on the page starting its turn at a moment of its own, so two of
 *   them do not blink in step;
 *   each mood face it has, see-through until its mood comes, then faded in over the idle face and
 *   out again after (CSS): the same animal changing its look, not one picture swapped for another.
 *   Once a mood face is fully there, the idle face and the blink under it are hidden (CSS), so
 *   nothing of them shows round its edge. Being on the page from the start, the mood faces are
 *   fetched before the first mood asks for one.
 */
export function Avatar({ animal, mood, view = "face" }: { animal: AnimalId; mood?: Mood; view?: ArtView }) {
  // Where in its turn this animal's blink starts: its own, kept for as long as it is on the page.
  const [blinkAt] = useState(() => Math.floor(Math.random() * BLINK_EVERY * 100) / 100);
  const entry = ART[animal];
  const look = mood ?? "idle";
  if (!entry) {
    const Art = avatars[animal];
    return <Art mood={look} />;
  }
  const frame = frameFor(animal, look);
  const shown = viewFor(animal, view);
  const alive = mood !== undefined;
  // The face underneath is decoded before it is painted when the animal is alive: a new animal on
  // the coding board each round must not show one empty frame first. (A mood face fades in from
  // nothing, so a late frame of it is not seen.)
  const face = (name: ArtFrame, className: string, on?: boolean) => (
    <img
      key={name}
      className={className}
      data-face={name}
      data-on={on === undefined ? undefined : on ? "true" : "false"}
      src={artSrc(animal, name, shown)}
      // The size attributes give the box its shape before the picture arrives (a face is square), so nothing jumps.
      width={shown === "face" ? 512 : undefined}
      height={shown === "face" ? 512 : undefined}
      alt=""
      draggable={false}
      decoding={alive && name === "idle" ? "sync" : "async"}
    />
  );
  return (
    <span
      className="avatar-art avatar-painted"
      data-mood={look}
      data-view={shown}
      data-frame={frame}
      aria-hidden="true"
      style={alive ? ({ "--blink-at": blinkAt } as CSSProperties) : undefined}
    >
      {face("idle", "avatar-face")}
      {alive && entry.frames.includes("blink") ? face("blink", "avatar-blink") : null}
      {alive ? MOOD_FRAMES.filter((name) => entry.frames.includes(name)).map((name) => face(name, "avatar-over", frame === name)) : null}
    </span>
  );
}
