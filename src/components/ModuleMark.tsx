const base = import.meta.env.BASE_URL;

const files = {
  app: "icons/icon-512.png",
  words: "icons/module-words.png",
  numbers: "icons/module-numbers.png",
  colors: "icons/module-colors.png",
} as const;

export type ModuleMarkName = keyof typeof files;

/** Approved LittleNest mark. `alt` stays empty; the nearby label names it. */
export function ModuleMark({ name, className = "module-mark" }: { name: ModuleMarkName; className?: string }) {
  return <img className={className} src={`${base}${files[name]}`} alt="" />;
}
