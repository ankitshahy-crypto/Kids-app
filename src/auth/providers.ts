/**
 * Stage 1 signs in with Apple, Google, or email.
 * Stage 2 (Clever, ClassLink, Microsoft, and district SAML) is a slot only.
 * Adding it later means a new adapter in this list, not a new account screen.
 */

export type Stage1ProviderId = "apple" | "google" | "email";
export type Stage2ProviderId = "clever" | "classlink" | "microsoft" | "saml";
export type AuthProviderId = Stage1ProviderId | Stage2ProviderId;

export type Stage1Adapter = {
  id: Stage1ProviderId;
  label: string;
  signIn: () => Promise<void>;
};

const STAGE1: readonly Stage1ProviderId[] = ["apple", "google", "email"];
const STAGE2: readonly Stage2ProviderId[] = ["clever", "classlink", "microsoft", "saml"];

export function activeProviders(): readonly Stage1ProviderId[] {
  return STAGE1;
}

export function futureProviders(): readonly Stage2ProviderId[] {
  return STAGE2;
}

export function providerLabel(id: AuthProviderId): string {
  if (id === "apple") return "Sign in with Apple";
  if (id === "google") return "Sign in with Google";
  if (id === "email") return "Sign in with email";
  if (id === "clever") return "Clever";
  if (id === "classlink") return "ClassLink";
  if (id === "microsoft") return "Microsoft";
  return "District sign-in";
}

export function isStage1Provider(id: AuthProviderId): id is Stage1ProviderId {
  return (STAGE1 as readonly string[]).includes(id);
}

/** Stage 2 ids throw. They are named so a later adapter can replace this branch. */
export async function signInWithProvider(id: AuthProviderId, adapters: readonly Stage1Adapter[]): Promise<void> {
  if (!isStage1Provider(id)) {
    throw new Error("That sign-in is not available yet.");
  }
  const adapter = adapters.find((item) => item.id === id);
  if (!adapter) throw new Error("That sign-in is not available yet.");
  await adapter.signIn();
}
