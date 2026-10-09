/**
 * While a game's code arrives (the first time it is opened in a visit): three soft dots on a small
 * paper card, and "Loading" for a screen reader. It shows only after a moment (CSS), so a quick
 * load never flashes it. It was the word "Loading" in grey, at the top left of an empty page.
 */
export function Loading({ section }: { section?: string }) {
  return (
    <p className="loading" role="status" data-explore-loading={section}>
      <span className="loading-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="sr-only">Loading</span>
    </p>
  );
}
