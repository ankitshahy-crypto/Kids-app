import { Chevron } from "./icons";
import { Nest, ToyBox } from "./sceneArt";

export function KidCorner({ kind, onBack }: { kind: "library" | "nest"; onBack: () => void }) {
  const library = kind === "library";
  return (
    <div className="kid-corner" data-screen={kind}>
      <button type="button" className="back-button" aria-label="Back" onClick={onBack}>
        <span className="gear-face">
          <Chevron direction="left" />
        </span>
      </button>
      <div className="kid-corner-art">{library ? <ToyBox /> : <Nest />}</div>
      <h1>{library ? "Play library" : "My Nest"}</h1>
      <span className="soon soon-large">Soon</span>
    </div>
  );
}
