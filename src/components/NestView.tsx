import type { ChildProfile } from "../data/profiles";
import { Chevron } from "./icons";
import { DressMark, GiftMark } from "./TodayMarks";
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
          <span className="dock-art" aria-hidden="true">
            <DressMark />
          </span>
          <span>Dress up</span>
        </button>
        <button type="button" className="dock-button" data-nest-action="surprise" onClick={onSurprise}>
          <span className="dock-art" aria-hidden="true">
            <GiftMark />
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
