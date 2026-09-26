import { Capacitor } from "@capacitor/core";
import { initializeApp, getApps } from "firebase/app";
import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  getRedirectResult,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { deleteDoc, doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import type { BackupDocument } from "./backup";
import { parseBackup } from "./backup";
import type { AuthClient, GrownupUser } from "./client";
import type { FirebaseWebConfig } from "./config";
import { authPlatform, magicContinueUrl, providerTransport, webSignInFlow } from "./plan";

const MAGIC_EMAIL_KEY = "littlenest-magic-email";

function grownupUser(user: User): GrownupUser {
  const ids = user.providerData.map((item) => item.providerId);
  const provider = ids.includes("apple.com") ? "apple" : ids.includes("google.com") ? "google" : "email";
  return { uid: user.uid, email: user.email, provider };
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Firebase Auth and one Firestore document per grown-up.
 * Analytics is not imported. The native iOS plugin is loaded only for Apple and Google sheets.
 */
export function createFirebaseClient(config: FirebaseWebConfig): AuthClient {
  const app = getApps().find((item) => item.options.projectId === config.projectId) ?? initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const platform = authPlatform({ native: Capacitor.isNativePlatform(), os: Capacitor.getPlatform() });

  const backupRef = (uid: string) => doc(db, "grownups", uid);

  async function finishNative(kind: "apple" | "google"): Promise<void> {
    const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
    const result =
      kind === "apple"
        ? await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true })
        : await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error("Sign-in did not return a token.");
    if (kind === "apple") {
      const provider = new OAuthProvider("apple.com");
      const credential = provider.credential({ idToken, rawNonce: result.credential?.nonce });
      await signInWithCredential(auth, credential);
      return;
    }
    await signInWithCredential(auth, GoogleAuthProvider.credential(idToken, result.credential?.accessToken));
  }

  async function webProvider(kind: "apple" | "google"): Promise<void> {
    const provider = kind === "apple" ? new OAuthProvider("apple.com") : new GoogleAuthProvider();
    if (kind === "apple") {
      provider.addScope("email");
      provider.addScope("name");
    }
    const flow = webSignInFlow(window.matchMedia("(max-width: 900px)").matches);
    if (flow === "redirect") {
      await signInWithRedirect(auth, provider);
      return;
    }
    await signInWithPopup(auth, provider);
  }

  async function signInProvider(kind: "apple" | "google"): Promise<void> {
    if (providerTransport(platform, kind) === "native") {
      await finishNative(kind);
      return;
    }
    await webProvider(kind);
  }

  void getRedirectResult(auth).catch(() => {
    // A cancelled redirect leaves the grown-up on this device, still signed out.
  });

  if (isSignInWithEmailLink(auth, window.location.href)) {
    const email = localStorage.getItem(MAGIC_EMAIL_KEY);
    if (email) {
      void signInWithEmailLink(auth, email, window.location.href)
        .then(() => localStorage.removeItem(MAGIC_EMAIL_KEY))
        .catch(() => {
          // The account screen shows the signed-out state if the link cannot be used.
        });
    }
  }

  return {
    onAuth(listener) {
      return onAuthStateChanged(auth, (user) => listener(user ? grownupUser(user) : null));
    },
    async signInWithApple() {
      await signInProvider("apple");
    },
    async signInWithGoogle() {
      await signInProvider("google");
    },
    async signInWithEmail(email, password) {
      if (!validEmail(email) || !password) throw new Error("Enter the email and password.");
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    async createWithEmail(email, password) {
      if (!validEmail(email)) throw new Error("That email does not look right.");
      if (password.length < 8) throw new Error("Use a password of at least 8 characters.");
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    },
    async sendMagicLink(email) {
      if (!validEmail(email)) throw new Error("That email does not look right.");
      const trimmed = email.trim();
      await sendSignInLinkToEmail(auth, trimmed, { url: magicContinueUrl(window.location.href), handleCodeInApp: true });
      localStorage.setItem(MAGIC_EMAIL_KEY, trimmed);
    },
    async signOut() {
      await signOut(auth);
    },
    async deleteAccount() {
      const user = auth.currentUser;
      if (!user) return;
      await deleteDoc(backupRef(user.uid));
      await deleteUser(user);
    },
    async loadBackup(uid) {
      const snap = await getDoc(backupRef(uid));
      if (!snap.exists()) return null;
      return parseBackup(snap.data());
    },
    async saveBackup(uid, document: BackupDocument) {
      await setDoc(backupRef(uid), document);
    },
    async deleteBackup(uid) {
      await deleteDoc(backupRef(uid));
    },
  };
}
