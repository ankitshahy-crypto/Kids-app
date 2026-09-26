import { useEffect, useState } from "react";
import { dismissSilentHint, subscribeSilentHint } from "../audio/manager";

export function SilentHint() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => subscribeSilentHint(setText), []);

  if (!text) return null;
  return (
    <div className="silent-hint" role="status">
      <p>{text}</p>
      <button type="button" onClick={() => dismissSilentHint()}>
        OK
      </button>
    </div>
  );
}
