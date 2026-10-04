import { lessonName, type ChildProfile } from "../data/profiles";
import { saysSoundsHint } from "../data/progress";
import type { ReadingPace } from "../data/schedule";
import { SLIDES_WITH_APP, soundingMode, type SoundingMode } from "../data/sounding";
import { unitLabel } from "../data/units";

/**
 * Who says the letter sounds while sliding, in lessons and in stories.
 *
 *  - Hear, then say (the default): the app says a word's sounds the first two
 *    times it is slid, and the child says them after that.
 *  - The app: the app always says the sounds.
 *  - The child: the child always says them; the app says only the whole word.
 *
 * The latest Friday Challenge can suggest a change; it never switches on its own.
 * With `onPace`, the card also holds the reading pace (steady or gentle).
 */
export function SaysSoundsControl({
  profile,
  onChange,
  onPace,
}: {
  profile: ChildProfile;
  onChange: (mode: SoundingMode) => void;
  onPace?: (pace: ReadingPace) => void;
}) {
  const name = lessonName(profile);
  const mode = soundingMode(profile);
  const hint = saysSoundsHint({ ...profile, saysSounds: mode === "child" });
  const sounds = hint.kind === "none" ? "" : hint.sounds.map((sound) => unitLabel(sound).toUpperCase()).join(" ");
  const pace: ReadingPace = profile.readingPace === "gentle" ? "gentle" : "steady";
  const copy =
    mode === "child"
      ? `${name} says each sound out loud while sliding under a word. The app stays quiet until the end, then says the whole word so ${name} can check.`
      : mode === "app"
        ? `The app says each sound as ${name} slides under a word.`
        : `The app says a word's sounds the first ${SLIDES_WITH_APP === 2 ? "two" : SLIDES_WITH_APP} times ${name} slides under it. After that, ${name} says them and the app says the whole word at the end.`;
  return (
    <section
      className="dash-card says-sounds"
      data-section="says-sounds"
      data-child={profile.id}
      data-says-sounds={mode}
      data-hint={hint.kind}
    >
      <h2>Sounding out</h2>
      <p className="adult-copy">
        {copy} Tapping a letter or Play sound always plays the sounds. New letter cards and Nest words are always said by the app.
      </p>
      <div className="writing-level says-choice" role="group" aria-label={`Who says the letter sounds for ${name}`}>
        <span className="writing-name">Sounds</span>
        <button type="button" aria-pressed={mode === "auto"} data-says="auto" onClick={() => onChange("auto")}>
          Hear, then say
        </button>
        <button type="button" aria-pressed={mode === "app"} data-says="app" onClick={() => onChange("app")}>
          The app
        </button>
        <button type="button" aria-pressed={mode === "child"} data-says="child" onClick={() => onChange("child")}>
          {name}
        </button>
      </div>
      {hint.kind === "ready" ? (
        <p className="adult-copy says-hint" data-says-hint="ready">
          {name} got every sound right on the first try in the last Friday Challenge ({sounds}). {name} may be ready to say the
          sounds every time. Sit nearby the first time and listen.
        </p>
      ) : null}
      {hint.kind === "practicing" ? (
        <p className="adult-copy says-hint" data-says-hint="practicing">
          In the last Friday Challenge, {name} was still practicing {sounds}. You can let the app say the sounds again anytime.
        </p>
      ) : null}
      {onPace ? (
        <>
          <h3 className="says-pace-title">Reading pace</h3>
          <p className="adult-copy">
            {pace === "gentle"
              ? `Each week's sounds stay for two weeks, so ${name} has more time with them.`
              : `New sounds each week: three or four.`}
            {profile.ageRange === "3" && pace === "steady" ? ` For a 3-year-old, Gentle is often a better fit.` : ""}
          </p>
          <div className="writing-level" role="group" aria-label={`Reading pace for ${name}`}>
            <span className="writing-name">Pace</span>
            <button type="button" aria-pressed={pace === "steady"} data-pace="steady" onClick={() => onPace("steady")}>
              Steady
            </button>
            <button type="button" aria-pressed={pace === "gentle"} data-pace="gentle" onClick={() => onPace("gentle")}>
              Gentle
            </button>
          </div>
        </>
      ) : null}
      <p className="adult-copy says-note">Set on each device.</p>
    </section>
  );
}
