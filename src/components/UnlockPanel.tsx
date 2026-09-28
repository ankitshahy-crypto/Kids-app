import { PRODUCT_SHORT } from "../brand";
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

/** The grown-up page for the one-time unlock: what it opens, the price, a code, and Restore. */
export function UnlockPanel() {
  const unlock = useUnlock();
  const busy = unlock.status === "busy";

  if (!unlock.paywall) {
    return (
      <section className="adult-section" data-section="unlock" data-unlock="open">
        <h2>Full {PRODUCT_SHORT}</h2>
        <p className="adult-copy">
          Everything is open on this website. In the iPhone and iPad app, the first {FREE_WEEKS} weeks of reading and the
          first activity of each Explore area are free, and one payment opens the rest.
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
          {FREE_WEEKS} weeks of reading stay free, and your school's code gives a discount on the one-time unlock.
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
          <button type="button" className="done-button unlock-buy" data-action="buy" disabled={busy} onClick={() => void buyUnlock()}>
            {unlock.price ? `Unlock everything · ${unlock.price}` : "Unlock everything"}
          </button>
        </>
      )}
      {unlock.status !== "idle" && STATUS[unlock.status] ? (
        <p className="adult-copy" role="status" data-status={unlock.status}>
          {STATUS[unlock.status]}
        </p>
      ) : null}
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
      {unlock.preview ? <p className="adult-note" data-preview="true">Preview: no money changes hands on this website.</p> : null}
    </section>
  );
}
