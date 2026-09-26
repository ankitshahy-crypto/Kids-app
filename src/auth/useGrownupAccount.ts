import { useEffect, useRef, useState } from "react";
import type { ChildProfile } from "../data/profiles";
import { DEFAULT_SETTINGS, type Settings } from "../settings";
import { mergeBackups, toBackup, type BackupDocument } from "./backup";
import type { AuthClient, GrownupUser } from "./client";
import { authConfigured, readAuthConfig } from "./config";
import { friendlyAuthError, readPreview } from "./plan";
import type { PreviewMode } from "./plan";
import { loadAccountPrefs, saveAccountPrefs, type AccountRole } from "./prefs";
import {
  acceptInvite as acceptInviteDesk,
  adminTotals,
  cancelInvite as cancelInviteDesk,
  childSnapshot,
  createClass as createClassDesk,
  createSchool as createSchoolDesk,
  emptyDesk,
  freshCode,
  inviteTeacher as inviteTeacherDesk,
  joinAsParent,
  linkDevice as linkDeviceDesk,
  loadDeviceLink,
  loadSchoolRole,
  makeClassCode,
  makeParentCode,
  parentPreviewDesk,
  publishProgress,
  removeTeacher as removeTeacherDesk,
  saveDeviceLink,
  saveSchoolRole,
  teacherPreviewDesk,
  type SchoolDesk,
  type SchoolRole,
  type SchoolWrite,
} from "./school";

const PREVIEW_USER: GrownupUser = {
  uid: "preview",
  email: "grownup@example.com",
  provider: "apple",
};

function userForPreview(mode: PreviewMode | null): GrownupUser | null {
  if (mode === "school-admin") return { uid: "preview", email: "director@example.com", provider: "google" };
  if (mode === "school-teacher") return { uid: "preview", email: "teacher@example.com", provider: "google" };
  if (mode === "school-parent") return { uid: "preview", email: "parent@example.com", provider: "email" };
  if (mode === "signed-in") return PREVIEW_USER;
  return null;
}

function deskForPreview(mode: PreviewMode | null): SchoolDesk {
  if (mode === "school-teacher") return teacherPreviewDesk();
  if (mode === "school-parent") return parentPreviewDesk();
  const link = loadDeviceLink();
  return link ? { ...emptyDesk(), deviceLink: link } : emptyDesk();
}

function initialSchoolRole(mode: PreviewMode | null): SchoolRole {
  if (mode === "school-admin") return "admin";
  if (mode === "school-teacher") return "teacher";
  if (mode === "school-parent") return "parent";
  return loadSchoolRole() ?? (loadAccountPrefs().role === "teacher" ? "teacher" : "parent");
}

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
  const [user, setUser] = useState<GrownupUser | null>(() => userForPreview(preview));
  const [role, setRoleState] = useState<AccountRole>(() => loadAccountPrefs().role);
  const [schoolRole, setSchoolRoleState] = useState<SchoolRole>(() => initialSchoolRole(preview));
  const [desk, setDesk] = useState<SchoolDesk>(() => deskForPreview(preview));
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

  function applySchool(result: { desk: SchoolDesk; error: string | null; writes: SchoolWrite[] }) {
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setDesk(result.desk);
    if (result.desk.deviceLink) saveDeviceLink(result.desk.deviceLink);
    if (preview || !configured) return;
    void import("./firebaseSchool")
      .then((mod) => mod.persistSchoolWrites(result.writes))
      .catch(() => setNotice("Saved on this device. The school will try again when you are online."));
  }

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
    schoolRole,
    desk,
    adminSummary: adminTotals(desk, user?.uid ?? ""),
    async setSchoolRole(next: SchoolRole) {
      setSchoolRoleState(next);
      saveSchoolRole(next);
      const backupRole: AccountRole = next === "teacher" ? "teacher" : "grownup";
      setRoleState(backupRole);
      roleRef.current = backupRole;
      saveAccountPrefs({ sync, role: backupRole });
    },
    createSchool(name: string) {
      if (!user) return;
      applySchool(
        createSchoolDesk(desk, {
          name,
          uid: user.uid,
          email: user.email ?? "",
          schoolId: `school-${Math.random().toString(36).slice(2, 10)}`,
          now: new Date().toISOString(),
        }),
      );
    },
    inviteTeacher(email: string) {
      if (!user) return;
      applySchool(inviteTeacherDesk(desk, { email, uid: user.uid, inviteId: `invite-${Math.random().toString(36).slice(2, 10)}` }));
    },
    removeTeacher(teacherUid: string) {
      if (!user) return;
      applySchool(removeTeacherDesk(desk, { adminUid: user.uid, teacherUid }));
    },
    cancelInvite(inviteId: string) {
      if (!user) return;
      applySchool(cancelInviteDesk(desk, { adminUid: user.uid, inviteId }));
    },
    acceptInvite(inviteId: string) {
      if (!user?.email) return;
      applySchool(acceptInviteDesk(desk, { inviteId, uid: user.uid, email: user.email }));
    },
    createClass(name: string) {
      if (!user) return;
      const taken = new Set(desk.classes.flatMap((room) => [room.code, room.parentCode]));
      const code = freshCode(taken, makeClassCode);
      const parentCode = freshCode(new Set([...taken, code]), makeParentCode);
      applySchool(
        createClassDesk(desk, {
          name,
          teacherUid: user.uid,
          classId: `class-${Math.random().toString(36).slice(2, 10)}`,
          code,
          parentCode,
        }),
      );
    },
    linkDevice(code: string) {
      if (!user) return;
      const linked = linkDeviceDesk(desk, { code, teacherUid: user.uid });
      if (linked.error || !linked.desk.deviceLink) {
        applySchool(linked);
        return;
      }
      const published = publishProgress(linked.desk, {
        classId: linked.desk.deviceLink.classId,
        teacherUid: user.uid,
        children: profilesRef.current.map((profile) => childSnapshot(profile)),
      });
      applySchool({ ...published, writes: [...linked.writes, ...published.writes] });
    },
    joinClass(code: string, consent: boolean, childIds: string[]) {
      if (!user) return;
      const chosen = new Set(childIds);
      const children = profilesRef.current.filter((profile) => chosen.has(profile.id)).map((profile) => childSnapshot(profile));
      applySchool(joinAsParent(desk, { code, parentUid: user.uid, children, consent }));
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
        setSchoolRoleState("parent");
        saveSchoolRole("parent");
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
