import { useEffect, useState } from "react";
import { subscribeCaption } from "../audio/manager";

/**
 * The words of a line whose recorded clip could not play (after one retry), shown for a moment with
 * a soft chime. The app never reads a line in the phone's own voice.
 */
export function AudioCaption() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => subscribeCaption(setText), []);
  if (!text) return null;
  return (
    <div className="audio-caption" role="status" aria-live="polite" data-testid="audio-caption">
      <p>{text}</p>
    </div>
  );
}
