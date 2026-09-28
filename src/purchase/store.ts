import { registerPlugin } from "@capacitor/core";
import { isNativeApp } from "../audio/platform";
import { unlockProductId } from "../config";
import { PAYWALL_PREVIEW_KEY, UNLOCK_KEY } from "../storage";

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
  addListener(event: "owned", listener: (data: { productId: string; owned: boolean }) => void): Promise<{ remove: () => Promise<void> }>;
};

const Store = registerPlugin<StorePlugin>("Store");

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
  };
}

function publish(patch: Partial<UnlockState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener(state));
}

function setOwned(owned: boolean): void {
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

/** Ask the App Store once at launch: is the unlock owned, and what does it cost here? */
export function startStore(): void {
  if (started) return;
  started = true;
  state = initial();
  if (!isNativeApp()) return;
  void Store.addListener("owned", (data: { productId: string; owned: boolean }) => {
    if (data.productId === unlockProductId) setOwned(data.owned);
  }).catch(() => undefined);
  void Store.owned({ id: unlockProductId })
    .then((result: { owned: boolean }) => setOwned(result.owned))
    .catch(() => undefined);
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
