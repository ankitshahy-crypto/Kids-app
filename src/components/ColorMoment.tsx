import { useState } from "react";
import { playOnDevice } from "../audio/player";
import type { Settings } from "../settings";

const swatches = [
  { id: "pink", label: "Pink", fill: "#f7d5e3" },
  { id: "sky", label: "Sky", fill: "#d7ebf7" },
  { id: "butter", label: "Butter", fill: "#f8e7b0" },
] as const;

/** A short color moment on the reading path. Pastel swatches, one tap. */
export function ColorMoment({
  settingsRef,
  onDone,
}: {
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const ask = swatches[0];

  const speak = () => {
    void playOnDevice(`Tap ${ask.label}.`, settingsRef.current, new AbortController().signal).catch(() => undefined);
  };

  return (
    <div className="color-moment" data-screen="moment" data-ask={ask.id} data-picked={picked ?? ""}>
      <h1>Colors</h1>
      <p className="color-prompt">Tap {ask.label}.</p>
      <button type="button" className="hear-label" onClick={speak}>
        Hear it
      </button>
      <div className="color-choices" role="group" aria-label="Colors">
        {swatches.map((swatch) => (
          <button
            key={swatch.id}
            type="button"
            className="color-choice"
            data-color={swatch.id}
            onClick={() => {
              setPicked(swatch.id);
              if (swatch.id === ask.id) onDone();
            }}
          >
            <span className="color-object" style={{ background: swatch.fill }} aria-hidden="true" />
            <span className="color-word">{swatch.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
