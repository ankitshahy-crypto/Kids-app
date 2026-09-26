import nestLogo from "../assets/nest-logo.svg";
import { HoldButton } from "./HoldButton";

export function StartScreen({
  onKid,
  onParent,
  onTeacher,
}: {
  onKid: () => void;
  onParent: () => void;
  onTeacher: () => void;
}) {
  return (
    <div className="mode-switch" data-screen="start">
      <div className="mode-art">
        <img className="nest-logo" src={nestLogo} alt="WordNest" />
      </div>
      <button type="button" className="kid-enter" onClick={onKid}>
        Kid
      </button>
      <div className="gate-row">
        <HoldButton
          className="gate-button"
          indicator="bar"
          label="Parent. Press and hold to open."
          onOpen={onParent}
        >
          Parent
        </HoldButton>
        <HoldButton
          className="gate-button"
          indicator="bar"
          label="Teacher. Press and hold to open."
          onOpen={onTeacher}
        >
          Teacher
        </HoldButton>
      </div>
      <p className="gate-hint">Hold Parent or Teacher.</p>
    </div>
  );
}
