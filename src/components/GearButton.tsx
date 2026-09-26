import { GearIcon } from "./icons";
import { HoldButton } from "./HoldButton";

export function GearButton({ onOpen }: { onOpen: () => void }) {
  return (
    <HoldButton
      className="gear-button"
      label="Parent settings. Press and hold to open."
      onOpen={onOpen}
    >
      <span className="gear-face">
        <GearIcon />
      </span>
    </HoldButton>
  );
}
