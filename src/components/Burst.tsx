import { useMemo } from "react";

/**
 * A small burst of petals and stars from the middle of what it sits in: a
 * right answer's reward. Each piece takes its own angle, distance and spin,
 * drifts out, falls a little and fades, all in transform and opacity so it
 * stays smooth on an older iPad. Mount it with a new `key` to play it again.
 * With reduced motion (or calm mode) the CSS shows nothing, and the answer's
 * own glow is the reward.
 */
export function Burst({ pieces = 12, seed = 1, big = false }: { pieces?: number; seed?: number; big?: boolean }) {
  const parts = useMemo(() => {
    let value = (seed * 9301 + 49297) % 233280;
    const random = () => {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
    return Array.from({ length: pieces }, (_, index) => {
      const angle = (index / pieces) * Math.PI * 2 + random() * 0.5;
      const distance = (big ? 70 : 40) + random() * (big ? 60 : 50);
      return {
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance - 10,
        spin: (random() - 0.5) * 360,
        delay: Math.round(random() * 60),
        kind: index % 3,
        tone: index % 4,
      };
    });
  }, [pieces, seed, big]);
  return (
    <span className={`burst${big ? " is-big" : ""}`} aria-hidden="true" data-burst>
      {parts.map((part, index) => (
        <span
          key={index}
          className={`burst-piece kind-${part.kind} tone-${part.tone}`}
          style={
            {
              "--dx": `${part.dx.toFixed(1)}px`,
              "--dy": `${part.dy.toFixed(1)}px`,
              "--spin": `${part.spin.toFixed(0)}deg`,
              animationDelay: `${part.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}
