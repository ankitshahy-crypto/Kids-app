import { useEffect, useState } from "react";
import { Avatar } from "../avatars";
import { shareMessage, shareUrl, showHelpContact } from "../config";
import { shareWordNest, type ShareResult } from "../share";
import type { AnimalId } from "../data/animals";
import type { PlacementDocument } from "../data/placement";
import { lessonName, type AgeRange, type ChildProfile } from "../data/profiles";
import type { Settings } from "../settings";
import { AboutWordNest } from "./AboutWordNest";
import { ChildForm } from "./ChildForm";
import { Chevron } from "./icons";
import { OfflinePanel } from "./OfflinePanel";
import { Printables } from "./Printables";
import { SettingsFields } from "./SettingsFields";

type GrownupsPage =
  | "menu"
  | "settings"
  | "profiles"
  | "account"
  | "help"
  | "privacy"
  | "about"
  | "share"
  | "printables"
  | "offline";

const rows: { id: Exclude<GrownupsPage, "menu">; title: string; note: string; tint: string }[] = [
  { id: "settings", title: "Settings", note: "Volume, tap sounds, voice, tips, and the daily goal", tint: "#E7F2EA" },
  { id: "offline", title: "Offline", note: "Download lessons for a flight", tint: "#E4EEF8" },
  { id: "profiles", title: "Child profiles", note: "First name or initial, and an animal", tint: "#F8E6D4" },
  { id: "account", title: "Account", note: "School sign-in is coming", tint: "#E4EEF8" },
  { id: "help", title: "Help", note: "The daily lesson and the letter track", tint: "#FDE7D4" },
  { id: "privacy", title: "Privacy", note: "What stays on this device", tint: "#E5F4EA" },
  { id: "about", title: "About WordNest", note: "Version and who makes the app", tint: "#E4EEF8" },
  { id: "share", title: "Tell a friend or your school", note: "Share the WordNest link", tint: "#F8E6D4" },
  { id: "printables", title: "Printables", note: "Letter tracing and blending sheets", tint: "#E4EEF8" },
];

function ProfileRow({
  profile,
  selected,
  onSelect,
  onEdit,
  onRemove,
}: {
  profile: ChildProfile;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="child-row">
      <button type="button" className="child-row-main child-select" aria-pressed={selected} onClick={onSelect}>
        <Avatar animal={profile.animal} />
        <div>
          <p className="child-name">{lessonName(profile)}</p>
          <p className="child-meta">
            {profile.name.length === 1 ? `Initial ${profile.name}` : profile.name}
            {selected ? " · showing" : ""}
          </p>
        </div>
      </button>
      <div className="child-actions">
        <button type="button" className="edit-child" onClick={onEdit}>
          Edit
        </button>
        {confirming ? (
          <button type="button" className="remove-child" onClick={onRemove}>
            Remove
          </button>
        ) : (
          <button type="button" className="remove-child remove-quiet" onClick={() => setConfirming(true)}>
            Remove
          </button>
        )}
      </div>
    </li>
  );
}

export function GrownupsMenu({
  settings,
  onChange,
  profiles,
  active,
  placement,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onClose,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  profiles: ChildProfile[];
  active: ChildProfile | null;
  placement: PlacementDocument;
  onSelect: (id: string) => void;
  onAdd: (input: { name: string; ageRange: AgeRange; animal: AnimalId }) => void;
  onUpdate: (id: string, input: { name: string; ageRange: AgeRange; animal: AnimalId }) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const [page, setPage] = useState<GrownupsPage>("menu");
  const [shareStatus, setShareStatus] = useState<ShareResult | "idle">("idle");
  const [adding, setAdding] = useState(profiles.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = profiles.find((profile) => profile.id === editingId) ?? null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (page === "menu") onClose();
      else setPage("menu");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, page]);

  useEffect(() => {
    if (editingId && !profiles.some((profile) => profile.id === editingId)) setEditingId(null);
  }, [editingId, profiles]);

  const back = () => {
    if (page === "menu") onClose();
    else setPage("menu");
  };

  return (
    <div className="grownups-view" data-screen="grownups" data-page={page}>
      <button type="button" className="grownups-back" onClick={back}>
        <Chevron direction="left" />
        Back
      </button>

      {page === "menu" ? (
        <>
          <header className="adult-head">
            <h1>Grown-ups</h1>
            <p className="adult-note">Help, settings, and profiles. A child stays on the lesson path.</p>
          </header>
          <ul className="grownups-rows">
            {rows.map((row) => (
              <li key={row.id}>
                <button type="button" className="grownups-row" onClick={() => setPage(row.id)}>
                  <span className="row-icon" style={{ background: row.tint }} aria-hidden="true" />
                  <span className="grownups-row-copy">
                    <span className="grownups-row-title">{row.title}</span>
                    <small>{row.note}</small>
                  </span>
                  <Chevron direction="right" />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {page === "offline" ? <OfflinePanel /> : null}

      {page === "settings" ? (
        <section className="adult-section" data-section="settings">
          <h2>Settings</h2>
          <SettingsFields settings={settings} onChange={onChange} />
        </section>
      ) : null}

      {page === "profiles" ? (
        <section className="adult-section" data-section="profiles">
          <h2>Child profiles</h2>
          <p className="adult-copy">
            A first name or one initial, and an animal from the app. Saved on this device only. A last name is not
            stored.
          </p>
          <ul className="child-list">
            {profiles.map((profile) => (
              <ProfileRow
                key={profile.id}
                profile={profile}
                selected={profile.id === active?.id}
                onSelect={() => onSelect(profile.id)}
                onEdit={() => {
                  setAdding(false);
                  setEditingId(profile.id);
                }}
                onRemove={() => onRemove(profile.id)}
              />
            ))}
          </ul>
          {editing ? (
            <ChildForm
              key={editing.id}
              initial={editing}
              submitLabel="Save changes"
              onSave={(input) => {
                onUpdate(editing.id, input);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : null}
          {adding ? (
            <ChildForm
              submitLabel="Save child"
              onSave={(input) => {
                onAdd(input);
                setAdding(false);
              }}
              onCancel={profiles.length === 0 ? undefined : () => setAdding(false)}
            />
          ) : null}
          {!adding && !editing ? (
            <button type="button" className="add-child" onClick={() => setAdding(true)}>
              {profiles.length === 0 ? "Add a child" : "Add another child"}
            </button>
          ) : null}
        </section>
      ) : null}

      {page === "account" ? (
        <section className="adult-section" data-section="account">
          <h2>Account</h2>
          <p className="account-status">Not signed in</p>
          <p className="adult-copy">
            School sign-in is coming. A grown-up will be able to connect this device to a class later. There is no
            account to create in this version, and WordNest does not ask for a card or a payment.
          </p>
        </section>
      ) : null}

      {page === "help" ? (
        <section className="adult-section" data-section="help">
          <h2>Help</h2>
          <h3>How the daily lesson works</h3>
          <p className="adult-copy">
            Each day the path has four stops: Letters, Draw, Story, and Colors. A star is for trying. On Friday the
            letters from that week come back for a short review.
          </p>
          <h3>Drag to blend</h3>
          <p className="adult-copy">
            In Letters the word starts dim. Drag the animal along the track from left to right. Each letter lights and
            says its sound as the finger passes it. A slow drag says the sounds separately. The end of the track says
            the whole word and leaves the letters lit. Tap a lit letter to hear that sound again.
          </p>
          <h3>If an iPhone is quiet</h3>
          <p className="adult-copy">
            The switch on the side of the phone can mute sound. Recorded clips follow the Voice slider in Settings. The
            phone's own voice follows the volume buttons.
          </p>
          <h3>Questions</h3>
          <dl className="faq">
            <dt>Can a child open this menu?</dt>
            <dd>Only after the grown-up check. Cancel leaves them on the lesson.</dd>
            <dt>Where are profiles saved?</dt>
            <dd>On this device. WordNest does not upload them.</dd>
            <dt>How do I quiet the taps?</dt>
            <dd>Open Settings, then turn Tap sounds & buzz off. Dragging across a word stays quiet either way.</dd>
          </dl>
          {showHelpContact ? (
            <div data-section="contact">
              <h3>Contact us</h3>
              <p className="adult-copy">A help address will be listed here when one is chosen.</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {page === "privacy" ? (
        <section className="adult-section" data-section="privacy">
          <h2>Privacy</h2>
          <ul className="plain-list">
            <li>WordNest keeps information on this device.</li>
            <li>A profile stores a first name or one initial, an age range, and an animal that is already in the app.</li>
            <li>Photos are not uploaded. The app does not take pictures.</li>
            <li>There is no health data and no diagnosis.</li>
            <li>There are no ads and no tracking.</li>
            <li>Nothing is sent to a school. Class linking is not available yet.</li>
          </ul>
        </section>
      ) : null}

      {page === "about" ? <AboutWordNest /> : null}

      {page === "printables" ? (
        <section className="adult-section" data-section="printables">
          <h2>Printables</h2>
          <Printables profiles={profiles} activeId={active?.id ?? null} placement={placement} />
        </section>
      ) : null}

      {page === "share" ? (
        <section className="adult-section" data-section="share">
          <h2>Tell a friend or your school</h2>
          <p className="adult-copy">{shareMessage}</p>
          <p className="share-url" data-share-url={shareUrl}>
            {shareUrl}
          </p>
          <p className="adult-copy">No codes and no tracking. This only shares the WordNest link.</p>
          <button
            type="button"
            className="share-button"
            onClick={() => {
              void shareWordNest().then((result) => setShareStatus(result === "cancelled" ? "idle" : result));
            }}
          >
            Share
          </button>
          {shareStatus === "shared" ? <p role="status">Shared</p> : null}
          {shareStatus === "copied" ? <p role="status">Link copied</p> : null}
          {shareStatus === "queued" ? <p role="status">Saved to send later</p> : null}
        </section>
      ) : null}
    </div>
  );
}
