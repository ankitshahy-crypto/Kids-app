/**
 * Pastel UI tokens. Hex values live once, on `:root` in `src/index.css`.
 * Screens use these names so a fill stays in the same palette.
 * Lesson paints are not in this list. Those stay saturated on their own.
 */
export const tint = {
  mint: "var(--mint-wash)",
  mintCard: "var(--mint-card)",
  sky: "var(--sky-wash)",
  peach: "var(--peach)",
  blush: "var(--blush)",
  sand: "var(--sand)",
  butter: "var(--butter)",
  paper: "var(--paper)",
} as const;

export const face = {
  cat: "var(--face-cat)",
  dog: "var(--face-dog)",
  fox: "var(--face-fox)",
  bear: "var(--face-bear)",
  bunny: "var(--face-bunny)",
  owl: "var(--face-owl)",
  frog: "var(--face-frog)",
  duck: "var(--face-duck)",
} as const;

export const stroke = {
  track: "var(--mint-wash)",
  progress: "var(--sage-soft)",
  goal: "var(--gold)",
  sage: "var(--sage)",
} as const;
