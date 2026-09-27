import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { isNativeApp } from "../audio/platform";
import { downloadForOffline } from "./download";
import { onOutbox, readOutbox } from "./queue";

export type OfflinePhase = "starting" | "downloading" | "ready";

export type OfflineSnapshot = {
  phase: OfflinePhase;
  done: number;
  total: number;
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
  needRefresh: false,
  queued: 0,
  bundled: false,
  applyUpdate: () => undefined,
};

const listeners = new Set<(state: OfflineSnapshot) => void>();
let started = false;
let warming: Promise<void> | null = null;

function publish(patch: Partial<OfflineSnapshot>): void {
  snapshot = { ...snapshot, ...patch, queued: readOutbox().length };
  if (typeof document !== "undefined") {
    document.documentElement.dataset.offline = snapshot.phase === "ready" ? "ready" : "working";
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

async function warm(): Promise<void> {
  if (warming) return warming;
  warming = (async () => {
    publish({ phase: "downloading" });
    await waitForController();
    const ready = await downloadForOffline((progress) => {
      publish({ phase: "downloading", done: progress.done, total: progress.total });
    });
    await preloadFonts();
    publish({ phase: ready ? "ready" : "downloading" });
  })().finally(() => {
    warming = null;
  });
  return warming;
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

/** Start caching after the first visit. Native builds already have the files on disk. */
export function startOffline(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  onOutbox(() => publish({}));
  if (isNativeApp()) {
    publish({ phase: "ready", bundled: true, done: 1, total: 1 });
    return;
  }
  const applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      publish({ needRefresh: true });
    },
    onOfflineReady() {
      void warm();
    },
    onRegisteredSW(_url, registration) {
      claimFirstWorker(registration);
      void warm();
    },
    onRegisterError() {
      void warm();
    },
  });
  publish({
    applyUpdate: () => {
      void applyUpdate(true);
    },
  });
}

export function retryOfflineDownload(): Promise<void> {
  return warm();
}

export function useOfflineState(): OfflineSnapshot {
  const [state, setState] = useState(snapshot);
  useEffect(() => subscribeOffline(setState), []);
  return state;
}
