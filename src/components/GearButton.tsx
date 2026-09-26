import { useState } from "react";
import { GearIcon } from "./icons";
import { ParentGate } from "./ParentGate";

export function GearButton({ onOpen }: { onOpen: () => void }) {
  const [ask, setAsk] = useState(false);
  return (
    <>
      <button type="button" className="gear-button" aria-label="Parent settings" onClick={() => setAsk(true)}>
        <span className="gear-face">
          <GearIcon />
        </span>
      </button>
      {ask ? (
        <ParentGate
          onPass={() => {
            setAsk(false);
            onOpen();
          }}
          onCancel={() => setAsk(false)}
        />
      ) : null}
    </>
  );
}
