import { isNativeApp } from "../audio/platform";
import { retryOfflineDownload, useOfflineState } from "../offline/client";

export function OfflinePanel() {
  const state = useOfflineState();
  const bundled = state.bundled || isNativeApp();
  const working = state.phase === "downloading";

  return (
    <section className="adult-section" data-section="offline" data-offline-state={state.phase} data-ready={state.phase === "ready" ? "true" : "false"}>
      <h2>Offline</h2>
      {state.phase === "ready" ? (
        <p className="offline-ready" data-ready="true">
          Ready for offline
        </p>
      ) : (
        <p className="adult-copy">Lessons, pictures, and sounds are still saving on this device.</p>
      )}
      {working ? (
        <p className="adult-copy" data-offline-progress={`${state.done}/${state.total}`}>
          {state.done} of {state.total}
        </p>
      ) : null}
      {working ? <progress value={state.done} max={Math.max(state.total, 1)} /> : null}
      {bundled ? (
        <p className="adult-copy">This copy keeps the lessons on the device. It does not fetch them from the web.</p>
      ) : (
        <button type="button" className="offline-download" disabled={working} onClick={() => void retryOfflineDownload()}>
          Download for offline
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
            Update WordNest
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
