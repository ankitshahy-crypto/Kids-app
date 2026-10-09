import { useState } from "react";
import { colorCue, letterCue, numberCue, wordCue, type Cue } from "../audio/player";
import type { PhonemeId } from "../data/phonemes";
import type { ChildProfile, Sticker } from "../data/profiles";
import { isUnit, unitLabel } from "../data/units";
import { letterTile } from "../data/wordBuild";
import { useSpeaker } from "../hooks/useSpeaker";
import type { Settings } from "../settings";
import { Chevron } from "./icons";

const PAGE = 4;

/**
 * What a sticker says when it is tapped: a letter its card's line ("m, as in moon"), a number or a
 * colour its name, anything else its word. A sticker is what the child earned, and saying it is the
 * payoff (in the playtest of build 3 a tapped sticker did nothing).
 */
function stickerCue(sticker: Sticker): Cue {
  const label = sticker.label.toLowerCase();
  if (sticker.kind === "letter") return letterCue(isUnit(label) ? { char: unitLabel(label), phoneme: label as PhonemeId } : letterTile(label));
  if (sticker.kind === "number" && /^\d+$/.test(label)) return numberCue(Number(label));
  if (sticker.kind === "color") return colorCue(label);
  return wordCue(label, sticker.label);
}

export function StickerBook({ profile, settingsRef, onBack }: { profile: ChildProfile; settingsRef: { current: Settings }; onBack: () => void }) {
  const [page, setPage] = useState(0);
  // The sticker just tapped, and how many taps so far (so a second tap on it bounces again).
  const [said, setSaid] = useState<{ key: string; count: number }>({ key: "", count: 0 });
  const speak = useSpeaker(settingsRef);
  const pages = Math.max(1, Math.ceil(profile.stickers.length / PAGE));
  const safe = Math.min(page, pages - 1);
  const slice = profile.stickers.slice(safe * PAGE, safe * PAGE + PAGE);

  return (
    <div className="reward-screen" data-screen="stickers" data-sticker-count={profile.stickers.length}>
      <button type="button" className="back-button" aria-label="Back" onClick={onBack}>
        <span className="gear-face">
          <Chevron direction="left" />
        </span>
      </button>
      <h1>Sticker book</h1>
      <div className="sticker-page" data-page={safe + 1} data-pages={pages}>
        {slice.length === 0 ? (
          <p className="sticker-empty">New letters, words, numbers, colors, and baby animals leave a sticker here.</p>
        ) : (
          <ul className="sticker-grid">
            {slice.map((sticker) => {
              const key = `${sticker.subject}:${sticker.kind}:${sticker.label}`;
              const shown = sticker.kind === "letter" ? (isUnit(sticker.label) ? unitLabel(sticker.label) : sticker.label.toUpperCase()) : sticker.label;
              return (
                <li key={key} data-sticker={sticker.label} data-kind={sticker.kind} data-subject={sticker.subject}>
                  <button
                    type="button"
                    className="sticker-say"
                    aria-label={shown}
                    data-said={said.key === key ? (said.count % 2 === 1 ? "a" : "b") : "false"}
                    onClick={() => {
                      speak.line([stickerCue(sticker)], undefined, { remember: false });
                      setSaid((current) => ({ key, count: current.count + 1 }));
                    }}
                  >
                    {shown}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="sticker-nav">
        <button type="button" className="nav-button" aria-label="Previous page" disabled={safe === 0} onClick={() => setPage(safe - 1)}>
          <Chevron direction="left" />
        </button>
        <p>
          {safe + 1} / {pages}
        </p>
        <button
          type="button"
          className="nav-button"
          aria-label="Next page"
          disabled={safe >= pages - 1}
          onClick={() => setPage(safe + 1)}
        >
          <Chevron direction="right" />
        </button>
      </div>
    </div>
  );
}
