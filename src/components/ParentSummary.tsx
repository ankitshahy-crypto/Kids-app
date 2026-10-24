import { useState } from "react";
import { Avatar } from "../avatars";
import { PRODUCT_NAME } from "../brand";
import { parentSummary, summaryText } from "../data/summary";
import { unitLabel } from "../data/units";
import type { ChildProfile } from "../data/profiles";
import { shareText, type TextShareResult } from "../nativeExtras";

function Row({ label, value, data }: { label: string; value: string | number; data: string }) {
  return (
    <div className="completion-row" data-stat={data}>
      <span className="completion-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ChildSummary({ profile }: { profile: ChildProfile }) {
  // Default to the initial. The stored name is used only when the grown-up switches it on.
  const [showName, setShowName] = useState(false);
  const [status, setStatus] = useState<TextShareResult | "idle">("idle");
  const summary = parentSummary(profile, showName);
  const canName = profile.name.trim().length > 1;
  return (
    <li className="summary-card" data-summary={profile.id}>
      <div className="summary-head">
        <Avatar animal={profile.animal} />
        <h3 data-summary-label>{summary.label}</h3>
      </div>
      <Row label="Weeks completed" value={summary.weeks} data="weeks" />
      <Row label="Lessons finished" value={summary.lessons} data="lessons" />
      <Row label="Sounds mastered" value={summary.mastered.length > 0 ? summary.mastered.map((s) => unitLabel(s)).join(" ") : "None checked yet"} data="mastered" />
      <Row label="Letters worked on" value={summary.lettersWorked} data="letters" />
      <Row label="Words practiced" value={summary.words} data="words" />
      <Row label="Stories read" value={summary.stories} data="stories" />
      <Row label="Stickers" value={summary.stickers} data="stickers" />
      <Row label="Stars" value={summary.stars} data="stars" />
      <Row label="Days of practice" value={summary.practiceDays} data="days" />
      {canName ? (
        <label className="summary-name-toggle">
          <input type="checkbox" checked={showName} onChange={(event) => setShowName(event.target.checked)} data-action="summary-name" />
          Use the name in the summary (otherwise just the initial)
        </label>
      ) : null}
      <button
        type="button"
        className="share-button"
        data-action="share-summary"
        onClick={() => {
          void shareText(`${summary.label}'s progress`, summaryText(summary, PRODUCT_NAME)).then((result) =>
            setStatus(result === "cancelled" ? "idle" : result),
          );
        }}
      >
        Share summary
      </button>
      {status === "shared" ? <p role="status">Shared</p> : null}
      {status === "copied" ? <p role="status">Summary copied</p> : null}
      {status === "failed" ? <p role="status">Could not share on this device</p> : null}
    </li>
  );
}

/** Every child's progress so far, for grown-ups only. Read from this device; nothing is sent unless shared. */
export function ParentSummary({ profiles }: { profiles: ChildProfile[] }) {
  return (
    <section className="adult-section" data-section="summary">
      <h2>Progress summary</h2>
      <p className="adult-copy">Everything so far, from this device. Share it as plain text with the initial only, unless you choose the name.</p>
      {profiles.length === 0 ? (
        <p className="adult-copy">Add a child in Child profiles to see a summary.</p>
      ) : (
        <ul className="summary-list">
          {profiles.map((profile) => (
            <ChildSummary key={profile.id} profile={profile} />
          ))}
        </ul>
      )}
    </section>
  );
}
