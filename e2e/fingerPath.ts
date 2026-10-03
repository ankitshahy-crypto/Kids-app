/**
 * How the test finger moves along a stroke.
 *
 * The tracing board lists a station every 2 units along the stroke it is asking for
 * (data-stations). A careful finger touches each one. That is about 35 mouse moves a
 * stroke, and the browser spends a frame on each, so the twelve strokes of a week's
 * letters took four tests 16 to 18 s on a laptop: most of the way to the 30 s a test
 * gets in CI, where two of them ran out of time.
 *
 * A quick finger touches every fourth station and the stroke's end. Its points are
 * 8 units apart, half the 16-unit lane a finger may stray (TRACE_TOLERANCE in
 * src/data/trace.ts), and the ink still follows it: src/data/trace.test.ts checks that
 * for every stroke of every letter and shape, so a change to the tracing rules that
 * would strand this finger fails there, with a clear message, not here as a timeout.
 *
 * Kept apart from traceFlow.ts so that unit test can import it without Playwright.
 */
export const QUICK_STRIDE = 4;

/** Every `stride`-th point of a stroke, and always its last one. A stride of 1 is every point. */
export function fingerPath<T>(stations: readonly T[], stride: number): T[] {
  return stations.filter((_, index) => index % stride === 0 || index === stations.length - 1);
}
