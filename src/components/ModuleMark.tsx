const base = import.meta.env.BASE_URL;

const files = {
  app: "icons/icon-512.png",
  words: "icons/module-words.svg",
  numbers: "icons/module-numbers.svg",
  colors: "icons/module-colors.svg",
  time: "icons/module-time.svg",
  build: "icons/module-build.svg",
  science: "icons/module-science.svg",
  code: "icons/module-code.svg",
} as const;

export type ModuleMarkName = keyof typeof files;

/** Approved LittleNest mark. `alt` stays empty; the nearby label names it. */
export function ModuleMark({ name, className = "module-mark" }: { name: ModuleMarkName; className?: string }) {
  return <img className={className} src={`${base}${files[name]}`} alt="" />;
}
