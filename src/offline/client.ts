import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { isNativeApp } from "../audio/platform";
import { animalsOnDevice, describeBytes, hasChildOnDevice, offlineAudioBytes } from "./assets";
import { downloadForOffline } from "./download";
import { PROFILES_EVENT } from "./events";
import { networkHold, type NetworkHold } from "./network";
import { onOutbox, readOutbox } from "./queue";

/**
 * starting: the page just opened. waiting: nothing to download yet (no child
 * on this device) or the connection asks us to wait (Low Data Mode, cellular);
 * a grown-up can still start it. downloading: a pass is running. partial: the
 * pass ended with files it could not save. ready: every file is on the device.
 */
export type OfflinePhase = "starting" | "waiting" | "downloading" | "partial" | "ready";

export type OfflineHold = "no-child" | NetworkHold;

export type OfflineSnapshot = {
  phase: OfflinePhase;
  done: number;
  total: number;
  failed: number;
  /** Why the app is not downloading on its own. */
  hold: OfflineHold;
  /** "About 24 MB": the clips for this device's children. */
  size: string;
  needRefresh: boolean;
  queued: number;
  /** Bundled in the iOS app, so there is nothing to download. */
  bundled: boolean;
  applyUpdate: () => void;
};

let snapshot: OfflineSnapshot = {
  phase: "starting",
  done: 0,
  total: 0,
  failed: 0,
  hold: null,
  size: "",
  needRefresh: false,
  queued: 0,
  bundled: false,
  applyUpdate: () => undefined,
};

const listeners = new Set<(state: OfflineSnapshot) => void>();
let started = false;
let warming: Promise<void> | null = null;
/** The animals the last pass set out to cover. The app does not start a second pass for the same set on its own. */
let attempted: string | null = null;

function publish(patch: Partial<OfflineSnapshot>): void {
  snapshot = { ...snapshot, ...patch, queued: readOutbox().length };
  if (typeof document !== "undefined") {
    document.documentElement.dataset.offline = snapshot.phase === "ready" ? "ready" : snapshot.phase === "waiting" ? "waiting" : "working";
  }
  listeners.forEach((listener) => listener(snapshot));
}

export function getOfflineSnapshot(): OfflineSnapshot {
  return snapshot;
}

export function subscribeOffline(listener: (state: OfflineSnapshot) => void): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
}

function waitForController(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return Promise.resolve(false);
  if (navigator.serviceWorker.controller) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(Boolean(navigator.serviceWorker.controller)), 8000);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        window.clearTimeout(timer);
        resolve(true);
      },
      { once: true },
    );
  });
}

/** The letter screen uses Fredoka 600. Load it while online so a later flight still has the face. */
async function preloadFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const loads = ["400 16px Fredoka", "600 16px Fredoka", "700 16px Fredoka"].map((spec) =>
    document.fonts.load(spec).catch(() => undefined),
  );
  await Promise.race([
    Promise.all(loads),
    new Promise((resolve) => window.setTimeout(resolve, 4000)),
  ]);
}

function animalsKey(): string {
  return [...animalsOnDevice()].sort().join(",");
}

function sizeNow(): string {
  return describeBytes(offlineAudioBytes(animalsOnDevice()));
}

/** What keeps the app from downloading on its own right now. */
function holdNow(): OfflineHold {
  if (!hasChildOnDevice()) return "no-child";
  return networkHold();
}

/** One pass over this device's files. Runs at most once at a time. */
function warm(): Promise<void> {
  if (warming) return warming;
  attempted = animalsKey();
  warming = (async () => {
    publish({ phase: "downloading", failed: 0, hold: null, size: sizeNow() });
    await waitForController();
    const result = await downloadForOffline((progress) => {
      publish({ phase: "downloading", done: progress.done, total: progress.total, failed: progress.failed });
    });
    await preloadFonts();
    publish({
      phase: result.ready ? "ready" : "partial",
      done: result.done,
      total: result.total,
      failed: result.failed,
    });
  })().finally(() => {
    warming = null;
  });
  return warming;
}

/**
 * The automatic download: only once a child exists, only on a connection
 * that welcomes it, and only once per set of animals. Otherwise it waits and
 * says why; a grown-up can start it from the Offline panel.
 */
function warmIfWelcome(): void {
  if (snapshot.bundled) return;
  const hold = holdNow();
  if (hold) {
    if (!warming && snapshot.phase !== "ready") publish({ phase: "waiting", hold, size: sizeNow() });
    return;
  }
  if (attempted === animalsKey()) return;
  void warm();
}

function claimFirstWorker(registration: ServiceWorkerRegistration | undefined): void {
  if (!registration || navigator.serviceWorker.controller) return;
  const waiting = registration.waiting ?? registration.installing;
  if (!waiting) return;
  const skip = () => {
    if (!navigator.serviceWorker.controller && registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };
  if (registration.waiting) skip();
  else waiting.addEventListener("statechange", skip);
}

/** Register the worker after the first visit. Native builds already have the files on disk. */
export function startOffline(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  onOutbox(() => publish({}));
  if (isNativeApp()) {
    publish({ phase: "ready", bundled: true, done: 1, total: 1 });
    return;
  }
  // A child added or removed changes what this device needs.
  window.addEventListener(PROFILES_EVENT, () => {
    if (snapshot.phase === "ready" && attempted !== animalsKey()) publish({ phase: "waiting", hold: holdNow(), size: sizeNow() });
    warmIfWelcome();
  });
  const applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      publish({ needRefresh: true });
    },
    onOfflineReady() {
      warmIfWelcome();
    },
    onRegisteredSW(_url, registration) {
      claimFirstWorker(registration);
      warmIfWelcome();
    },
    onRegisterError() {
      warmIfWelcome();
    },
  });
  // Say at once when nothing will download on its own. The pass itself starts
  // from the worker's callbacks above, once the page is under its control.
  const hold = holdNow();
  publish({
    hold,
    size: sizeNow(),
    ...(hold ? { phase: "waiting" as const } : {}),
    applyUpdate: () => {
      void applyUpdate(true);
    },
  });
}

/** A grown-up's tap: download now, whatever the connection says. */
export function retryOfflineDownload(): Promise<void> {
  if (!hasChildOnDevice()) {
    publish({ phase: "waiting", hold: "no-child" });
    return Promise.resolve();
  }
  return warm();
}

export function useOfflineState(): OfflineSnapshot {
  const [state, setState] = useState(snapshot);
  useEffect(() => subscribeOffline(setState), []);
  return state;
}
