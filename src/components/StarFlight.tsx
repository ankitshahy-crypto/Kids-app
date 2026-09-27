import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { StarIcon } from "./icons";

/** A star that glides from the middle of the screen into the counter. */
export function StarFlight({ onDone }: { onDone: () => void }) {
  const [style, setStyle] = useState<CSSProperties>({});
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const target = document.querySelector(".star-count");
    const box = target?.getBoundingClientRect();
    const endX = box ? box.left + box.width / 2 - window.innerWidth / 2 : window.innerWidth / 2 - 48;
    const endY = box ? box.top + box.height / 2 - window.innerHeight / 2 : -window.innerHeight / 2 + 40;
    setStyle({ "--fly-x": `${endX}px`, "--fly-y": `${endY}px` } as CSSProperties);
    const timer = window.setTimeout(() => done.current(), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <span className="star-flight" style={style} aria-hidden="true">
      <StarIcon />
    </span>
  );
}
