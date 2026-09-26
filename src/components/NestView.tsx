import type { ChildProfile } from "../data/profiles";
import { Chevron } from "./icons";
import { EggNest } from "./sceneArt";
import { Hero } from "./Hero";

export function NestView({ profile, onBack }: { profile: ChildProfile; onBack: () => void }) {
  return (
    <div className="reward-screen" data-screen="nest" data-nest-count={profile.nest.length}>
      <button type="button" className="back-button" aria-label="Back" onClick={onBack}>
        <span className="gear-face">
          <Chevron direction="left" />
        </span>
      </button>
      <h1>My Nest</h1>
      <div className="nest-art">
        <EggNest />
        <Hero animal={profile.animal} outfit={profile.outfit} />
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
