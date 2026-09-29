import { isNativeApp } from "../audio/platform";
import { retryOfflineDownload, useOfflineState, type OfflineSnapshot } from "../offline/client";

/** One plain line on where the download stands, for a grown-up. */
function statusLine(state: OfflineSnapshot): string {
  const size = state.size ? ` ${state.size} of sound clips for the children on this device.` : "";
  if (state.phase === "ready") return "Every lesson, picture, and sound is saved on this device.";
  if (state.phase === "partial") {
    return `${state.failed} of ${state.total} files could not be saved. Try again when the connection is better.`;
  }
  if (state.phase === "downloading") return `Saving lessons, pictures, and sounds on this device.${size}`;
  if (state.hold === "no-child") return "Add a child first. The sounds for their stories are saved after that.";
  if (state.hold === "saved-data") return `Waiting for Low Data Mode to be off.${size} Download now to save them anyway.`;
  if (state.hold === "cellular") return `Waiting for Wi-Fi.${size} Download now to use cellular data.`;
  return `Getting ready.${size}`;
}

export function OfflinePanel() {
  const state = useOfflineState();
  const bundled = state.bundled || isNativeApp();
  const working = state.phase === "downloading";
  const label = working ? "Saving…" : state.phase === "partial" ? "Try again" : state.hold && state.hold !== "no-child" ? "Download now" : "Download for offline";

  return (
    <section
      className="adult-section"
      data-section="offline"
      data-offline-state={state.phase}
      data-offline-hold={state.hold ?? ""}
      data-offline-size={state.size}
      data-ready={state.phase === "ready" ? "true" : "false"}
    >
      <h2>Offline</h2>
      {state.phase === "ready" ? (
        <p className="offline-ready" data-ready="true">
          Ready for offline
        </p>
      ) : null}
      <p className="adult-copy" data-offline-note>
        {statusLine(state)}
      </p>
      {working ? (
        <p className="adult-copy" data-offline-progress={`${state.done}/${state.total}`}>
          {state.done} of {state.total}
        </p>
      ) : null}
      {working ? <progress value={state.done} max={Math.max(state.total, 1)} /> : null}
      {bundled ? (
        <p className="adult-copy">This copy keeps the lessons on the device. It does not fetch them from the web.</p>
      ) : (
        <button
          type="button"
          className="offline-download"
          disabled={working || state.hold === "no-child"}
          onClick={() => void retryOfflineDownload()}
        >
          {label}
        </button>
      )}
      <p className="adult-copy">
        Recorded clips play first. If a clip is not on this device, the phone speaks. iPhone voices usually work
        offline.
      </p>
      {state.queued > 0 ? (
        <p className="adult-copy" data-outbox={state.queued}>
          Saved to send later.
        </p>
      ) : (
        <p className="adult-copy">Nothing is waiting to send.</p>
      )}
      {state.needRefresh ? (
        <>
          <p className="adult-copy">A new version is ready. It waits here so a lesson is never interrupted.</p>
          <button type="button" className="offline-update" onClick={() => state.applyUpdate()}>
            Update LittleNest
          </button>
        </>
      ) : (
        <p className="adult-copy">A new version shows up here, not in the middle of a lesson.</p>
      )}
      <h3>Add to Home Screen</h3>
      <h4>iPhone Safari</h4>
      <p className="adult-copy">Tap the Share button, then Add to Home Screen.</p>
      <h4>Android</h4>
      <p className="adult-copy">Open the browser menu, then Install app or Add to Home screen.</p>
    </section>
  );
}
