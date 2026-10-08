import { PRODUCT_SHORT } from "../brand";
import { appStoreUrl, googlePlayUrl } from "../config";
import { lessonName, type ChildProfile } from "../data/profiles";
import { soFarLine } from "../data/progress";
import { FREE_WEEKS } from "../purchase/access";
import { buyUnlock, redeemSchoolCode, restoreUnlock, type UnlockStatus } from "../purchase/store";
import { useUnlock } from "../purchase/useUnlock";

const STATUS: Partial<Record<UnlockStatus, string>> = {
  busy: "Talking to the App Store…",
  pending: "Waiting for approval. It opens as soon as it is approved.",
  cancelled: "No charge. You can unlock any time.",
  restored: "Found it. Everything is open on this device.",
  "not-found": "No earlier purchase was found for this Apple ID.",
  error: "The App Store did not answer. Check the connection and try again.",
};

/** An Android phone or tablet: the web demo points it to Google Play, not the App Store. */
function onAndroid(): boolean {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

/**
 * What each child on this device has done so far, for the grown-up deciding
 * on the unlock. Only children with something done are listed, and it is
 * facts only: never a score, and nothing about catching up.
 */
function SoFar({ profiles }: { profiles: ChildProfile[] }) {
  const lines = profiles.map((profile) => ({ profile, line: soFarLine(profile) })).filter((item) => item.line !== null);
  if (lines.length === 0) return null;
  return (
    <div className="unlock-so-far" data-progress>
      <p className="adult-copy">So far on this device:</p>
      <ul className="plain-list">
        {lines.map(({ profile, line }) => (
          <li key={profile.id} data-child={profile.id}>
            <strong>{lessonName(profile)}:</strong> {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The web demo's way to the full app: the App Store, or Google Play on Android. Never a purchase here. */
function StoreLink() {
  if (onAndroid()) {
    return googlePlayUrl ? (
      <a className="done-button unlock-buy" data-store="play" href={googlePlayUrl}>
        Get {PRODUCT_SHORT} on Google Play
      </a>
    ) : (
      <p className="adult-copy" data-store="play">
        Coming to Google Play.
      </p>
    );
  }
  return appStoreUrl ? (
    <a className="done-button unlock-buy" data-store="app-store" href={appStoreUrl}>
      Get the full app on the App Store
    </a>
  ) : (
    <p className="adult-copy" data-store="app-store">
      Coming soon to the App Store.
    </p>
  );
}

/** The grown-up page for the one-time unlock: what it opens, the price, a code, and Restore. */
export function UnlockPanel({ profiles = [] }: { profiles?: ChildProfile[] }) {
  const unlock = useUnlock();
  const busy = unlock.status === "busy";

  if (!unlock.paywall) {
    return (
      <section className="adult-section" data-section="unlock" data-unlock="open">
        <h2>Full {PRODUCT_SHORT}</h2>
        <p className="adult-copy">
          Everything is open in this build. In the iPhone and iPad app, the first {FREE_WEEKS} weeks of reading and the
          first activity of each Explore area are free, and one payment opens the rest.
        </p>
      </section>
    );
  }

  if (!unlock.ready) {
    // The App Store has not answered yet (the first moments after the app opens): nothing to buy
    // is offered until it is known what this copy is and what the family owns.
    return (
      <section className="adult-section" data-section="unlock" data-unlock="checking">
        <h2>Full {PRODUCT_SHORT}</h2>
        <p className="adult-copy" role="status">
          Checking with the App Store…
        </p>
      </section>
    );
  }

  if (unlock.beta) {
    return (
      <section className="adult-section" data-section="unlock" data-unlock="beta">
        <h2>Full {PRODUCT_SHORT}</h2>
        <p className="account-status" data-unlocked="true">
          Pilot version: everything is open, free.
        </p>
        <p className="adult-copy">
          Thank you for trying {PRODUCT_SHORT} early. When it launches, install it from the App Store. The first{" "}
          {FREE_WEEKS} weeks of reading stay free, and one payment opens the rest. If a school or partner gave you a
          code, enter it there under Have a code?.
        </p>
      </section>
    );
  }

  return (
    <section className="adult-section" data-section="unlock" data-unlock={unlock.unlocked ? "open" : "locked"}>
      <h2>Full {PRODUCT_SHORT}</h2>
      {unlock.unlocked ? (
        <p className="account-status" data-unlocked="true">
          Everything is open. Thank you!
        </p>
      ) : (
        <>
          <SoFar profiles={profiles} />
          <p className="adult-copy">
            Free for good: the first {FREE_WEEKS} weeks of reading and the first activity of each Explore area. One
            payment opens the rest:
          </p>
          <ul className="plain-list">
            <li>All 26 reading weeks, from letters to sh, ee, and the magic e</li>
            <li>Every story, game, and Explore activity</li>
            <li>Every child on this device, and your family's other devices with Family Sharing</li>
          </ul>
          <p className="adult-copy">Pay once. No subscription, no account, no ads.</p>
          {unlock.web ? (
            <>
              <p className="adult-copy" data-web-demo>
                This is the web demo. The iPhone and iPad app has all of it, with one payment.
              </p>
              <StoreLink />
            </>
          ) : (
            <button type="button" className="done-button unlock-buy" data-action="buy" disabled={busy} onClick={() => void buyUnlock()}>
              {unlock.price ? `Unlock everything · ${unlock.price}` : "Unlock everything"}
            </button>
          )}
        </>
      )}
      {unlock.status !== "idle" && STATUS[unlock.status] ? (
        <p className="adult-copy" role="status" data-status={unlock.status}>
          {STATUS[unlock.status]}
        </p>
      ) : null}
      {unlock.web ? null : (
        <div className="unlock-more">
          {!unlock.unlocked && !unlock.preview ? (
            <button type="button" className="text-button" data-action="code" disabled={busy} onClick={() => void redeemSchoolCode()}>
              Have a code?
            </button>
          ) : null}
          <button type="button" className="text-button" data-action="restore" disabled={busy} onClick={() => void restoreUnlock()}>
            Restore purchase
          </button>
        </div>
      )}
      {unlock.preview ? <p className="adult-note" data-preview="true">Preview: no money changes hands on this website.</p> : null}
    </section>
  );
}
