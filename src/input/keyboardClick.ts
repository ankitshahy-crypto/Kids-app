/**
 * Is this a click that no pointer made? Enter or Space on a keyboard makes one, and so does
 * a switch or a screen reader's "activate".
 *
 * Why this exists: a control that can be tapped or dragged listens for pointer-down and
 * pointer-up, so that it can tell the two apart. A keyboard sends neither. It sends only a
 * click. The blocks in Build, the cards in First, then and the Spin & Say wheel had no click
 * handler at all, so on a keyboard nothing could be added, placed or spun, Play stayed
 * disabled, and the game could not be finished. (Found in review of #132.)
 *
 * A click's `detail` is its click count: 1 or more when a finger or a mouse made it, 0 when
 * there was no pointer. Only the 0 is taken here. The pointer's own tap has already been dealt
 * with on pointer-up, and the click the browser sends after it would add the block twice.
 */
export function clickWithoutPointer(event: { detail: number }): boolean {
  return event.detail === 0;
}
