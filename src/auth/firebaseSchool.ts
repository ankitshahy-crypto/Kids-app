import type { SchoolWrite } from "./school";

/**
 * Writes the same documents the security rules describe.
 * No-op until the grown-up sign-in has already started Firebase.
 * Analytics is not imported.
 */
export async function persistSchoolWrites(writes: SchoolWrite[]): Promise<void> {
  if (writes.length === 0) return;
  const { getApps } = await import("firebase/app");
  const app = getApps()[0];
  if (!app) return;
  const { deleteDoc, doc, getFirestore, setDoc } = await import("firebase/firestore");
  const db = getFirestore(app);
  for (const write of writes) {
    const parts = write.path.split("/").filter(Boolean);
    const head = parts[0];
    if (!head || parts.length % 2 !== 0) continue;
    const ref = doc(db, head, ...parts.slice(1));
    if (write.op === "delete") await deleteDoc(ref);
    else await setDoc(ref, write.data);
  }
}
