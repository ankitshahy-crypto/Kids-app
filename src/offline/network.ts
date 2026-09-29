/**
 * Whether a background download of the sound clips is welcome on this
 * connection. A grown-up can always start one by hand from the Offline
 * panel; this only decides what the app does on its own. Browsers without
 * the connection API (Safari) answer yes, as they always have.
 */
export type NetworkHold = "saved-data" | "cellular" | null;

type Connection = { saveData?: boolean; type?: string; effectiveType?: string };

/** The browser's connection info, where it has any. Node and Safari have none. */
function currentConnection(): Connection | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: Connection }).connection;
}

export function networkHold(connection: Connection | undefined = currentConnection()): NetworkHold {
  if (!connection) return null;
  if (connection.saveData) return "saved-data";
  if (connection.type === "cellular") return "cellular";
  if (connection.effectiveType === "slow-2g" || connection.effectiveType === "2g") return "cellular";
  return null;
}
