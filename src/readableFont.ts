/**
 * The easier-to-read typeface is bundled as font files under `public/fonts/`
 * (see the README there for the exact file names). The `@font-face` rules
 * are added at runtime so a device without the files simply keeps the next
 * font in the stack. Nothing is fetched from anywhere but this app's folder.
 */
export const READABLE_FONT_FAMILY = "Atkinson Hyperlegible";

export const READABLE_FONT_FILES = [
  { file: "AtkinsonHyperlegible-Regular.woff2", weight: 400 },
  { file: "AtkinsonHyperlegible-Bold.woff2", weight: 700 },
] as const;

export function readableFontCss(base: string): string {
  return READABLE_FONT_FILES.map(
    ({ file, weight }) =>
      `@font-face{font-family:"${READABLE_FONT_FAMILY}";src:url("${base}fonts/${file}") format("woff2");font-weight:${weight};font-style:normal;font-display:swap;}`,
  ).join("\n");
}

const STYLE_ID = "readable-font";

/** Add the font rules once. Safe to call again. */
export function installReadableFont(base: string = import.meta.env.BASE_URL): void {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = readableFontCss(base);
  document.head.appendChild(style);
}
