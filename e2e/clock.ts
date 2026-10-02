/**
 * A profile created this calendar week, so a test sees lesson week 0 (m and
 * a) whatever today's date. The suite used a fixed date and went red at
 * midnight on a Sunday, when the calendar week rolled over. Noon UTC on
 * Monday is the same calendar week in any zone within eleven hours of UTC.
 */
export function createdThisWeek(): string {
  const now = new Date();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString();
}

/**
 * Wednesday noon UTC of this calendar week. Friday is review day, when the
 * day's letters gain the review letters; a test about one week's own letters
 * pins the page's date here with `page.clock.setFixedTime(midweek())`.
 */
export function midweek(): Date {
  const day = new Date(createdThisWeek());
  day.setUTCDate(day.getUTCDate() + 2);
  return day;
}
