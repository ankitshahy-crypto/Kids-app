import { ExploreMark, ReadingMark, type ExploreMarkName } from "./TodayMarks";

const base = import.meta.env.BASE_URL;

export type ModuleMarkName = "app" | "words" | ExploreMarkName;

/**
 * A section's mark, drawn as Today draws its doors (TodayMarks): thin taupe lines with a little
 * sage, sand and blush, on a cream tile with a sand edge. About, the module headings and the
 * placement pages used to show the older painted squares (public/icons/module-*.svg), a different
 * family from the home screen's. "app" is the app icon itself. `alt` stays empty: the nearby label
 * names the mark.
 */
export function ModuleMark({ name, className = "module-mark" }: { name: ModuleMarkName; className?: string }) {
  if (name === "app") return <img className={className} src={`${base}icons/icon-512.png`} alt="" />;
  return (
    <span className={`${className} is-drawn`} data-mark={name} aria-hidden="true">
      {name === "words" ? <ReadingMark /> : <ExploreMark name={name} />}
    </span>
  );
}
