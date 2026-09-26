export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

export type AuthEnv = {
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
};

/** This app must not talk to the TriageDesk production project. */
function blocked(value: string): boolean {
  return /triagedesk/i.test(value);
}

/**
 * Sign-in is on only when every value is present and the project is not TriageDesk.
 * A missing value keeps the demo fully offline.
 */
export function readAuthConfig(env: AuthEnv | undefined): FirebaseWebConfig | null {
  const apiKey = env?.VITE_FIREBASE_API_KEY?.trim() ?? "";
  const authDomain = env?.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? "";
  const projectId = env?.VITE_FIREBASE_PROJECT_ID?.trim() ?? "";
  const appId = env?.VITE_FIREBASE_APP_ID?.trim() ?? "";
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  if (blocked(projectId) || blocked(authDomain) || blocked(apiKey) || blocked(appId)) return null;
  return { apiKey, authDomain, projectId, appId };
}

export function authConfigured(env: AuthEnv | undefined = import.meta.env): boolean {
  return readAuthConfig(env) !== null;
}
