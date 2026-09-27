import { useState } from "react";
import { readingBars, readingSummary } from "../data/reading";
import { deviceTimeZone, localDateKey } from "../data/time";

const tabs = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
] as const;

export function ReadingChart({
  days,
  goalMinutes,
  name,
  title = "Time reading",
  section = "reading",
}: {
  days: Record<string, number>;
  goalMinutes: number;
  name?: string;
  title?: string;
  section?: string;
}) {
  const [range, setRange] = useState<(typeof tabs)[number]["id"]>("day");
  const now = new Date();
  const zone = deviceTimeZone();
  const bars = readingBars(days, range, now, zone);
  const summary = readingSummary(bars, localDateKey(now, zone));
  const peak = Math.max(1, ...bars.map((bar) => bar.minutes));

  return (
    <section className="read-chart" data-section={section} data-range={range}>
      <h2>
        {title}
        {name ? ` · ${name}` : ""}
      </h2>
      <div className="segment segment-3" role="tablist" aria-label={title}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={range === tab.id}
            className={range === tab.id ? "is-selected" : ""}
            onClick={() => setRange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ul className="read-bars">
        {bars.map((bar) => (
          <li key={bar.key} data-day={bar.key} data-minutes={bar.minutes}>
            <span className="sr-only">
              {bar.label}: {bar.minutes} minutes
            </span>
            <span className="read-track" aria-hidden="true">
              <span
                className={`read-bar${bar.minutes === 0 ? " is-empty" : ""}`}
                style={{ height: `${Math.max(bar.minutes === 0 ? 4 : 12, (bar.minutes / peak) * 100)}%` }}
              />
            </span>
            <span className="read-label" aria-hidden="true">
              {bar.label}
            </span>
            <span className="read-mins" aria-hidden="true">
              {bar.minutes}
            </span>
          </li>
        ))}
      </ul>
      <p className="read-total" data-total={summary.total}>
        Total {summary.total} min
      </p>
      <p className="read-average" data-average={summary.average}>
        Average {summary.average} min a day
      </p>
      <p className="adult-copy">Goal {goalMinutes} min. One star when it is reached. More time does not add stars.</p>
    </section>
  );
}
