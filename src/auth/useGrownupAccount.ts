import { useEffect, useRef, useState } from "react";
import type { ChildProfile } from "../data/profiles";
import { DEFAULT_SETTINGS, type Settings } from "../settings";
import { mergeBackups, toBackup, type BackupDocument } from "./backup";
import type { AuthClient, GrownupUser } from "./client";
import { authConfigured, readAuthConfig } from "./config";
import { friendlyAuthError, readPreview } from "./plan";
import { loadAccountPrefs, saveAccountPrefs, type AccountRole } from "./prefs";

const PREVIEW_USER: GrownupUser = {
  uid: "preview",
  email: "grownup@example.com",
  provider: "apple",
};

export function useGrownupAccount({
  profiles,
  settings,
  replaceProfiles,
  replaceSettings,
}: {
  profiles: ChildProfile[];
  settings: Settings;
  replaceProfiles: (profiles: ChildProfile[]) => void;
  replaceSettings: (settings: Settings) => void;
}) {
  const configured = authConfigured();
  const preview = readPreview(import.meta.env.DEV, readPreviewFlag());
  const [user, setUser] = useState<GrownupUser | null>(preview === "signed-in" ? PREVIEW_USER : null);
  const [role, setRoleState] = useState<AccountRole>(() => loadAccountPrefs().role);
  const [sync, setSyncState] = useState(() => loadAccountPrefs().sync);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const clientRef = useRef<AuthClient | null>(null);
  const readyRef = useRef(false);
  const profilesRef = useRef(profiles);
  const settingsRef = useRef(settings);
  const roleRef = useRef(role);
  const syncRef = useRef(sync);
  profilesRef.current = profiles;
  settingsRef.current = settings;
  roleRef.current = role;
  syncRef.current = sync;

  useEffect(() => {
    if (!configured || preview) return;
    const config = readAuthConfig(import.meta.env);
    if (!config) return;
    let stop = () => {};
    let cancelled = false;
    void import("./firebaseClient")
      .then((mod) => {
        if (cancelled) return;
        const client = mod.createFirebaseClient(config);
        clientRef.current = client;
        stop = client.onAuth((next) => {
          readyRef.current = false;
          setUser(next);
        });
      })
      .catch((err: unknown) => setError(friendlyAuthError(err)));
    return () => {
      cancelled = true;
      stop();
    };
  }, [configured, preview]);

  useEffect(() => {
    const client = clientRef.current;
    if (!user || !client || preview) return;
    let cancelled = false;
    void (async () => {
      try {
        const remote = await client.loadBackup(user.uid);
        if (cancelled) return;
        const local = toBackup(profilesRef.current, settingsRef.current, roleRef.current, new Date().toISOString());
        if (remote && (syncRef.current || remote.children.length > 0 || remote.role === "teacher")) {
          const merged = mergeBackups(local, remote);
          applyBackup(merged);
          setSyncState(true);
          syncRef.current = true;
          saveAccountPrefs({ sync: true, role: merged.role });
          await client.saveBackup(user.uid, { ...merged, updatedAt: new Date().toISOString() });
        }
        if (!cancelled) readyRef.current = true;
      } catch {
        if (!cancelled) {
          readyRef.current = true;
          setNotice("Saved on this device. Backup will try again when you are online.");
        }
      }
    })();
    return () => {
      cancelled = true;
      readyRef.current = false;
    };
    // Pull once each time the grown-up signs in. Later edits push from the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, preview]);

  useEffect(() => {
    const client = clientRef.current;
    if (!readyRef.current || !user || !sync || !client || preview) return;
    const handle = window.setTimeout(() => {
      const document = toBackup(profilesRef.current, settingsRef.current, roleRef.current, new Date().toISOString());
      void client.saveBackup(user.uid, document).catch(() => {
        setNotice("Saved on this device. Backup will try again when you are online.");
      });
    }, 600);
    return () => window.clearTimeout(handle);
  }, [profiles, settings, role, sync, user, preview]);

  function applyBackup(document: BackupDocument) {
    replaceProfiles(document.children);
    replaceSettings(document.settings);
    setRoleState(document.role);
    roleRef.current = document.role;
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  const client = () => {
    const current = clientRef.current;
    if (!current) throw new Error("Sign-in is not ready yet.");
    return current;
  };

  return {
    configured: configured || preview !== null,
    user,
    role,
    sync,
    busy,
    error,
    notice,
    async signInWithApple() {
      if (preview) {
        setUser(PREVIEW_USER);
        return;
      }
      await run(() => client().signInWithApple());
    },
    async signInWithGoogle() {
      if (preview) {
        setUser({ ...PREVIEW_USER, provider: "google" });
        return;
      }
      await run(() => client().signInWithGoogle());
    },
    async signInWithEmail(email: string, password: string) {
      if (preview) {
        setUser({ ...PREVIEW_USER, email, provider: "email" });
        return;
      }
      await run(() => client().signInWithEmail(email, password));
    },
    async createWithEmail(email: string, password: string) {
      if (preview) {
        setUser({ ...PREVIEW_USER, email, provider: "email" });
        return;
      }
      await run(() => client().createWithEmail(email, password));
    },
    async sendMagicLink(email: string) {
      if (preview) {
        setNotice("Check that email on this device, then open the link.");
        return;
      }
      await run(async () => {
        await client().sendMagicLink(email);
        setNotice("Check that email on this device, then open the link.");
      });
    },
    async signOut() {
      if (preview) {
        setUser(null);
        readyRef.current = false;
        return;
      }
      await run(async () => {
        readyRef.current = false;
        await client().signOut();
      });
    },
    async setRole(next: AccountRole) {
      setRoleState(next);
      roleRef.current = next;
      saveAccountPrefs({ sync, role: next });
    },
    async setSync(next: boolean) {
      setSyncState(next);
      syncRef.current = next;
      saveAccountPrefs({ sync: next, role });
      if (!next || preview || !user) return;
      await run(async () => {
        const remote = await client().loadBackup(user.uid);
        const local = toBackup(profilesRef.current, settingsRef.current, roleRef.current, new Date().toISOString());
        const merged = remote ? mergeBackups(local, remote) : local;
        applyBackup(merged);
        readyRef.current = true;
        await client().saveBackup(user.uid, { ...merged, updatedAt: new Date().toISOString() });
      });
    },
    async deleteData() {
      const wipe = () => {
        replaceProfiles([]);
        replaceSettings(DEFAULT_SETTINGS);
        setSyncState(false);
        syncRef.current = false;
        saveAccountPrefs({ sync: false, role });
        setNotice("All child profiles and progress on this device were deleted.");
      };
      if (preview || !user) {
        wipe();
        return;
      }
      await run(async () => {
        readyRef.current = false;
        await client().deleteBackup(user.uid);
        wipe();
        readyRef.current = true;
      });
    },
    async deleteAccount() {
      const wipe = () => {
        replaceProfiles([]);
        replaceSettings(DEFAULT_SETTINGS);
        setSyncState(false);
        syncRef.current = false;
        setRoleState("grownup");
        roleRef.current = "grownup";
        saveAccountPrefs({ sync: false, role: "grownup" });
        setUser(null);
        readyRef.current = false;
        setNotice("The account and its backup were deleted. LittleNest still works on this device.");
      };
      if (preview || !user) {
        wipe();
        return;
      }
      await run(async () => {
        readyRef.current = false;
        await client().deleteAccount();
        wipe();
      });
    },
  };
}

function readPreviewFlag(): string | null {
  try {
    return localStorage.getItem("littlenest-auth-preview");
  } catch {
    return null;
  }
}
