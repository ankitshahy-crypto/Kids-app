import type { BackupDocument } from "./backup";

export type GrownupUser = {
  uid: string;
  email: string | null;
  provider: "apple" | "google" | "email";
};

export type AuthClient = {
  onAuth(listener: (user: GrownupUser | null) => void): () => void;
  signInWithApple(): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  createWithEmail(email: string, password: string): Promise<void>;
  sendMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  loadBackup(uid: string): Promise<BackupDocument | null>;
  saveBackup(uid: string, document: BackupDocument): Promise<void>;
  deleteBackup(uid: string): Promise<void>;
};
