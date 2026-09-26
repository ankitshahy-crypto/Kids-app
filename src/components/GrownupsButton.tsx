import { useState } from "react";
import { GrownupIcon } from "./icons";
import { ParentGate } from "./ParentGate";

/** Corner control. The grown-up check opens before the menu. */
export function GrownupsButton({ onOpen }: { onOpen: () => void }) {
  const [ask, setAsk] = useState(false);
  return (
    <>
      <button type="button" className="grownups-launch" onClick={() => setAsk(true)}>
        <GrownupIcon />
        <span>Grown-ups</span>
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
