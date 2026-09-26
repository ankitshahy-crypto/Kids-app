import { starterDeck } from "../data/deck";
import { Illustration } from "../illustrations";
import { PictureCard } from "./PictureCard";
import { PlayGlyph } from "./icons";
import { SoundLabel } from "./SoundLabel";

export function StartScreen({ onStart }: { onStart: () => void }) {
  const first = starterDeck.words[0];

  return (
    <div className="activity">
      <PictureCard label={first.word}>
        <Illustration name={first.illustration} />
      </PictureCard>
      <SoundLabel />
      <div className="letter-slot" aria-hidden="true" />
      <button type="button" className="start-button" onClick={onStart}>
        <span className="play-icon" aria-hidden="true">
          <PlayGlyph />
        </span>
        <span>Tap to start</span>
      </button>
    </div>
  );
}
