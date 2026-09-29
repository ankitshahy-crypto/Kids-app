import { registerPlugin } from "@capacitor/core";
import { isNativeApp } from "../audio/platform";
import { unlockProductId } from "../config";
import { PAYWALL_PREVIEW_KEY, UNLOCK_KEY } from "../storage";
import { afterPilotAnswer, type PilotAnswer } from "./pilot";

/**
 * The one-time unlock. On the iPhone app this asks the App Store (StoreKit,
 * through the native Store plugin in ios/App/App/StorePlugin.swift); the
 * App Store keeps the purchase with the family's Apple ID, so Restore and
 * Family Sharing work with no account of ours. On the web demo everything
 * is open, unless the preview flag is set, which shows the locked app with
 * a pretend unlock (no charge) for previews and tests.
 */
type StorePlugin = {
  product(options: { id: string }): Promise<{ id: string; price: string; title: string }>;
  owned(options: { id: string }): Promise<{ owned: boolean }>;
  purchase(options: { id: string }): Promise<{ owned: boolean; cancelled?: boolean; pending?: boolean }>;
  restore(options: { id: string }): Promise<{ owned: boolean }>;
  redeemCode(): Promise<void>;
  beta(): Promise<PilotAnswer>;
  addListener(event: "owned", listener: (data: { productId: string; owned: boolean }) => void): Promise<{ remove: () => Promise<void> }>;
};

const Store = registerPlugin<StorePlugin>("Store");

/** StoreKit can take a moment; the locks never wait on it for longer than this. */
const PILOT_CHECK_MS = 8000;

export type UnlockStatus = "idle" | "busy" | "pending" | "cancelled" | "restored" | "not-found" | "error";

export type UnlockState = {
  /** Everything is open. */
  unlocked: boolean;
  /** The locked app is shown at all (the iPhone app, or the web preview). */
  paywall: boolean;
  /** The App Store's price for this family, "$29.99"; empty until known. */
  price: string;
  status: UnlockStatus;
  /** The web preview's pretend store, so the screen can say no money moves. */
  preview: boolean;
  /** The pilot build: everything is open and nothing is bought or cached. */
  beta: boolean;
  /**
   * The first answer is in (pilot flag, cached purchase, or the App Store).
   * Until then the iPhone app draws no locks, so a pilot build never flashes them.
   */
  ready: boolean;
};

function readFlag(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeUnlocked(owned: boolean): void {
  try {
    localStorage.setItem(UNLOCK_KEY, JSON.stringify({ owned, at: new Date().toISOString() }));
  } catch {
    // Storage full or blocked: the App Store still has the answer next launch.
  }
}

function cachedOwned(): boolean {
  try {
    const raw = readFlag(UNLOCK_KEY);
    return raw ? Boolean((JSON.parse(raw) as { owned?: unknown }).owned === true) : false;
  } catch {
    return false;
  }
}

function previewing(): boolean {
  return !isNativeApp() && readFlag(PAYWALL_PREVIEW_KEY) === "1";
}

let state: UnlockState = initial();
const listeners = new Set<(next: UnlockState) => void>();
let started = false;

function initial(): UnlockState {
  const native = isNativeApp();
  const preview = previewing();
  const paywall = native || preview;
  return {
    unlocked: paywall ? cachedOwned() : true,
    paywall,
    price: preview ? "$29.99" : "",
    status: "idle",
    preview,
    beta: false,
    ready: !native,
  };
}

function publish(patch: Partial<UnlockState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener(state));
}

function setOwned(owned: boolean): void {
  // A pilot build stays open, and never writes an unlock the App Store version could inherit.
  if (state.beta) return;
  writeUnlocked(owned);
  publish({ unlocked: owned });
}

export function getUnlockState(): UnlockState {
  return state;
}

export function subscribeUnlock(listener: (next: UnlockState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Ask the App Store what this family owns. A refunded unlock is revoked and
 * drops out of the family's current entitlements, so the answer turns false
 * and weeks 3 and up lock again. A failed check keeps the last answer, so a
 * launch with no connection does not lock a family that paid.
 */
function recheckOwned(): void {
  void Store.owned({ id: unlockProductId })
    .then((result: { owned: boolean }) => setOwned(result.owned))
    .catch(() => undefined);
}

/**
 * At launch: is the unlock owned, and what does it cost here? The check runs
 * again whenever the app comes back to the foreground, and a refund while the
 * app is open arrives through the plugin's "owned" event.
 */
export function startStore(): void {
  if (started) return;
  started = true;
  state = initial();
  if (!isNativeApp()) return;
  // No answer in time: show the app as any App Store copy would. A pilot
  // answer that arrives later still opens it.
  const waiting = window.setTimeout(() => publish({ ready: true }), PILOT_CHECK_MS);
  void Store.beta()
    .then((result: PilotAnswer) => {
      window.clearTimeout(waiting);
      publish(afterPilotAnswer(result));
    })
    .catch(() => {
      window.clearTimeout(waiting);
      publish({ ready: true });
    });
  void Store.addListener("owned", (data: { productId: string; owned: boolean }) => {
    if (data.productId === unlockProductId) setOwned(data.owned);
  }).catch(() => undefined);
  recheckOwned();
  // Back from the background: ask again, so a refund given meanwhile locks the paid weeks.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") recheckOwned();
  });
  void Store.product({ id: unlockProductId })
    .then((product: { price: string }) => publish({ price: product.price }))
    .catch(() => undefined);
}

export async function buyUnlock(): Promise<void> {
  if (state.status === "busy") return;
  if (state.preview) {
    setOwned(true);
    publish({ status: "idle" });
    return;
  }
  if (!isNativeApp()) return;
  publish({ status: "busy" });
  try {
    const result = await Store.purchase({ id: unlockProductId });
    if (result.owned) setOwned(true);
    publish({ status: result.owned ? "idle" : result.pending ? "pending" : "cancelled" });
  } catch (error) {
    publish({ status: /not.?found/i.test(String(error)) ? "not-found" : "error" });
  }
}

export async function restoreUnlock(): Promise<void> {
  if (state.status === "busy") return;
  if (state.preview) {
    publish({ status: state.unlocked ? "restored" : "not-found" });
    return;
  }
  if (!isNativeApp()) return;
  publish({ status: "busy" });
  try {
    const result = await Store.restore({ id: unlockProductId });
    setOwned(result.owned);
    publish({ status: result.owned ? "restored" : "not-found" });
  } catch {
    publish({ status: "error" });
  }
}

/** Apple's own sheet for a school's offer code. The price and the unlock both come from Apple. */
export async function redeemSchoolCode(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await Store.redeemCode();
    const result = await Store.owned({ id: unlockProductId });
    setOwned(result.owned);
  } catch {
    publish({ status: "error" });
  }
}

/** For tests: forget the launch state. */
export function resetStoreForTests(): void {
  started = false;
  state = initial();
}
