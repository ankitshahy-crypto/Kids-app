import { useState } from "react";
import type { ChildProfile } from "../data/profiles";
import { Chevron } from "./icons";

const PAGE = 4;

export function StickerBook({ profile, onBack }: { profile: ChildProfile; onBack: () => void }) {
  const [page, setPage] = useState(0);
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
          <p className="sticker-empty">New letters, words, numbers, and colors leave a sticker here.</p>
        ) : (
          <ul className="sticker-grid">
            {slice.map((sticker) => (
              <li
                key={`${sticker.subject}:${sticker.kind}:${sticker.label}`}
                data-sticker={sticker.label}
                data-kind={sticker.kind}
                data-subject={sticker.subject}
              >
                <span>{sticker.kind === "letter" ? sticker.label.toUpperCase() : sticker.label}</span>
              </li>
            ))}
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
