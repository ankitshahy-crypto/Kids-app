import { aggregatePayload, type ClassTotals } from "../data/aggregates";
import { authConfigured } from "./config";

/** Pilot metrics sync only when grown-up sign-in is configured. */
export function metricsSyncEnabled(): boolean {
  return authConfigured();
}

/**
 * Writes class totals. Skips the network when the feature flag is off.
 * The payload is the allowlist only.
 */
export async function syncClassAggregates(classId: string, totals: ClassTotals): Promise<"skipped" | "sent"> {
  if (!metricsSyncEnabled()) return "skipped";
  const { getApps } = await import("firebase/app");
  const app = getApps()[0];
  if (!app) return "skipped";
  const { doc, getFirestore, setDoc } = await import("firebase/firestore");
  const db = getFirestore(app);
  await setDoc(doc(db, "classTotals", classId), aggregatePayload(totals));
  return "sent";
}
