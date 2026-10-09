import { lessonName, type ChildProfile } from "../data/profiles";
import { Hero } from "./Hero";

/**
 * A quiet stop. Nothing is lost: every finished chunk is already saved, and
 * the Today path is exactly as the child left it.
 */
export function BreakScreen({
  profile,
  onReady,
  onSwitch,
}: {
  profile: ChildProfile;
  onReady: () => void;
  onSwitch: () => void;
}) {
  return (
    <section className="break-screen" data-screen="break" aria-labelledby="break-title">
      <div className="break-hero" aria-hidden="true">
        {/* Sleepy, when the animal has that face (round plush); otherwise its idle face, as before. */}
        <Hero animal={profile.animal} outfit={profile.outfit} mood="sleepy" />
      </div>
      <h1 id="break-title">Break time</h1>
      <p className="break-note">Everything is saved. Come back whenever you like, {lessonName(profile)}.</p>
      <button type="button" className="done-button break-ready" onClick={onReady}>
        I&apos;m ready
      </button>
      <button type="button" className="text-button break-switch" onClick={onSwitch}>
        Switch child
      </button>
    </section>
  );
}
