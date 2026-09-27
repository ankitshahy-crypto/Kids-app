import type { ChildProfile } from "../data/profiles";
import { wardrobe } from "../data/wardrobe";
import { Chevron } from "./icons";
import { Hero } from "./Hero";

export function Closet({
  profile,
  onWear,
  onBack,
}: {
  profile: ChildProfile;
  onWear: (itemId: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="reward-screen" data-screen="closet">
      <button type="button" className="back-button" aria-label="Back" onClick={onBack}>
        <span className="gear-face">
          <Chevron direction="left" />
        </span>
      </button>
      <h1>Dress up</h1>
      <div className="closet-hero">
        <Hero animal={profile.animal} outfit={profile.outfit} />
      </div>
      <ul className="closet-grid">
        {wardrobe.map((item) => {
          const open = profile.stars >= item.stars;
          const worn = profile.outfit[item.slot] === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`closet-item${worn ? " is-worn" : ""}`}
                data-item={item.id}
                data-unlocked={open ? "true" : "false"}
                data-worn={worn ? "true" : "false"}
                disabled={!open}
                onClick={() => onWear(item.id)}
              >
                <span className={`closet-swatch swatch-${item.id}`} aria-hidden="true" />
                <span className="closet-name">{item.name}</span>
                <span className="closet-cost">{open ? (worn ? "Wearing" : "Wear") : `${item.stars} stars`}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
