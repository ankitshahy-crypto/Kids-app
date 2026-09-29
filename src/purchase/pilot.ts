import type { UnlockState } from "./store";

/**
 * The native answer about the pilot build: the build flag (only the App Pilot
 * scheme sets it) and where StoreKit says this copy came from.
 */
export type PilotAnswer = {
  pilot?: boolean;
  environment?: string;
  /**
   * When StoreKit last confirmed TestFlight on this phone (ms since 1970),
   * saved natively in UserDefaults. Sent only for a pilot build.
   */
  verifiedAt?: number;
};

/**
 * How long a saved TestFlight answer stands in when StoreKit cannot answer.
 * Any launch with a connection renews it; TestFlight builds expire at 90 days.
 */
export const PILOT_REMEMBER_MS = 60 * 24 * 60 * 60 * 1000;

/**
 * Everything opens only when the pilot flag is on and the app came from
 * TestFlight ("sandbox") or was run from Xcode. When StoreKit cannot say
 * (offline, "unknown"), a TestFlight answer this phone saved in the last 60
 * days stands in, so a pilot family is not locked out on a car ride. An App
 * Store answer ("production") always shows the paywall, saved answer or not,
 * and a fresh install with nothing saved shows it too. The environment alone
 * never opens anything: App Review runs in the sandbox with the flag off.
 */
export function pilotUnlocks(answer: PilotAnswer | null | undefined, now: number = Date.now()): boolean {
  if (!answer || answer.pilot !== true) return false;
  if (answer.environment === "sandbox" || answer.environment === "xcode") return true;
  if (answer.environment === "production") return false;
  const at = answer.verifiedAt;
  if (typeof at !== "number" || !Number.isFinite(at)) return false;
  // A time in the future (a clock set ahead) is not trusted either.
  return at <= now + 60_000 && now - at <= PILOT_REMEMBER_MS;
}

/** What the pilot answer does to the unlock state. Either way the first answer is in. */
export function afterPilotAnswer(answer: PilotAnswer | null | undefined, now: number = Date.now()): Partial<UnlockState> {
  return pilotUnlocks(answer, now) ? { beta: true, unlocked: true, ready: true } : { ready: true };
}
