import type { UnlockState } from "./store";

/**
 * The native answer about the pilot build: the build flag (only the App Pilot
 * scheme sets it) and where StoreKit says this copy came from.
 */
export type PilotAnswer = { pilot?: boolean; environment?: string };

/**
 * Everything opens only when both agree: the pilot flag is on, and the app
 * came from TestFlight ("sandbox") or was run from Xcode. A pilot build that
 * reached the App Store ("production") by mistake, or one StoreKit cannot
 * place ("unknown"), shows the paywall. The environment alone never opens
 * anything: App Review runs in the sandbox with the flag off.
 */
export function pilotUnlocks(answer: PilotAnswer | null | undefined): boolean {
  if (!answer || answer.pilot !== true) return false;
  return answer.environment === "sandbox" || answer.environment === "xcode";
}

/** What the pilot answer does to the unlock state. Either way the first answer is in. */
export function afterPilotAnswer(answer: PilotAnswer | null | undefined): Partial<UnlockState> {
  return pilotUnlocks(answer) ? { beta: true, unlocked: true, ready: true } : { ready: true };
}
