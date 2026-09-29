import { lessonName, type ChildProfile } from "../data/profiles";
import { saysSoundsHint } from "../data/progress";
import { unitLabel } from "../data/units";

/**
 * Who says the letter sounds in Sound It Out. The app does, until a grown-up
 * (a parent or the teacher) decides the child is ready to say them out loud.
 * The latest sound game can suggest it; it never switches on its own.
 */
export function SaysSoundsControl({ profile, onChange }: { profile: ChildProfile; onChange: (on: boolean) => void }) {
  const name = lessonName(profile);
  const on = profile.saysSounds === true;
  const hint = saysSoundsHint(profile);
  const sounds = hint.kind === "none" ? "" : hint.sounds.map((sound) => unitLabel(sound).toUpperCase()).join(" ");
  return (
    <section
      className="dash-card says-sounds"
      data-section="says-sounds"
      data-child={profile.id}
      data-says-sounds={on ? "child" : "app"}
      data-hint={hint.kind}
    >
      <h2>Sounding out</h2>
      <p className="adult-copy">
        {on
          ? `${name} says each letter sound out loud while sliding across a word. The app stays quiet until the end, then says the whole word so ${name} can check.`
          : `The app says each letter sound as ${name} slides across a word.`}{" "}
        Tapping a letter or Play sound always plays the sounds. New letters are always said by the app.
      </p>
      <div className="writing-level" role="group" aria-label={`Who says the letter sounds for ${name}`}>
        <span className="writing-name">Sounds</span>
        <button type="button" aria-pressed={!on} data-says="app" onClick={() => onChange(false)}>
          The app
        </button>
        <button type="button" aria-pressed={on} data-says="child" onClick={() => onChange(true)}>
          {name}
        </button>
      </div>
      {hint.kind === "ready" ? (
        <p className="adult-copy says-hint" data-says-hint="ready">
          {name} got every sound right on the first try in the last sound game ({sounds}). {name} may be ready to say the
          sounds. Sit nearby the first time and listen.
        </p>
      ) : null}
      {hint.kind === "practicing" ? (
        <p className="adult-copy says-hint" data-says-hint="practicing">
          In the last sound game, {name} was still practicing {sounds}. You can let the app say the sounds again anytime.
        </p>
      ) : null}
      <p className="adult-copy says-note">Set on each device.</p>
    </section>
  );
}
