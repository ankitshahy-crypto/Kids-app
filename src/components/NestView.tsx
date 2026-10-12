import type { ChildProfile } from "../data/profiles";
import { Chevron } from "./icons";
import { Nest } from "./sceneArt";
import { Hero } from "./Hero";

/**
 * My Nest: the animal at home, with what a finished day adds, and the two doors that belong here:
 * Dress up (the closet) and the Surprise. They were a second row of the dock on Today, which the
 * mockup does not have; the nest is the animal's own place, so this is where its things are.
 */
export function NestView({ profile, onBack, onCloset, onSurprise }: { profile: ChildProfile; onBack: () => void; onCloset: () => void; onSurprise: () => void }) {
  return (
    <div className="reward-screen" data-screen="nest" data-nest-count={profile.nest.length}>
      <button type="button" className="back-button" aria-label="Back" onClick={onBack}>
        <span className="gear-face">
          <Chevron direction="left" />
        </span>
      </button>
      <h1>My Nest</h1>
      <div className="nest-art">
        <Nest>
          <Hero animal={profile.animal} outfit={profile.outfit} />
        </Nest>
      </div>
      <div className="nest-doors">
        <button type="button" className="dock-button" data-nest-action="closet" onClick={onCloset}>
          <span className="dock-art dock-dress" aria-hidden="true" />
          <span>Dress up</span>
        </button>
        <button type="button" className="dock-button" data-nest-action="surprise" onClick={onSurprise}>
          <span className="dock-art dock-surprise" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <rect x="12" y="28" width="40" height="26" rx="6" fill="#F6C3CB" />
              <rect x="8" y="20" width="48" height="12" rx="5" fill="#F4A9B8" />
              <rect x="29" y="20" width="6" height="34" fill="#FFF6E4" />
              <path d="M32 20c-6-10-16-8-14-2 2 4 8 4 14 2Zm0 0c6-10 16-8 14-2-2 4-8 4-14 2Z" fill="#E07A8A" />
            </svg>
          </span>
          <span>Surprise</span>
        </button>
      </div>
      <p className="nest-note">A finished day adds a twig or an egg.</p>
      <ul className="nest-pieces">
        {profile.nest.map((piece) => (
          <li key={piece.date} data-piece={piece.piece} data-date={piece.date}>
            {piece.piece === "twig" ? "Twig" : "Egg"}
          </li>
        ))}
      </ul>
    </div>
  );
}
