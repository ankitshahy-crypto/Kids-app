/**
 * The addresses a page asked for, with the names of the app's own bundle files left out.
 *
 * A bundle file's name carries a hash of its contents (assets/chunk-MIAXCOQF.js), and a hash can
 * spell anything, a child's name included. That is not the name being sent: the file is the same
 * for every child. Left in, a "nothing with the name in it was fetched" check fails by chance when
 * the code changes, which it did. Only the file name is dropped; anything after it (a query) stays.
 */
export function sentAddresses(requested: string[]): string {
  return requested.map((url) => url.replace(/\/assets\/[^/?#]+/, "/assets/*")).join(" ");
}
