import { normalizeChildName, type ChildProfile } from "../data/profiles";
import { placeForChild } from "../data/path";
import { CLASS_LINK_KEY, readStored, writeStored } from "../storage";

type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/** Membership in a school. This is not the personal backup role. */
export type SchoolRole = "parent" | "teacher" | "admin";

export type MemberRole = "admin" | "teacher";

export type SchoolMember = {
  uid: string;
  email: string;
  role: MemberRole;
  status: "active" | "invited";
};

export type InviteState = "pending" | "accepted" | "expired";

export type SchoolInvite = {
  id: string;
  email: string;
  createdBy: string;
  code: string;
  expiresAt: string;
  acceptedAt: string | null;
};

export type ProgressChild = {
  id: string;
  name: string;
  animal: string;
  stars: number;
  readingMs: number;
  path: string;
  startingLesson: string;
};

export type ClassChild = ProgressChild & {
  parentUid: string | null;
  consented: boolean;
  parentCode: string;
  parentCodeExpiresAt: string;
};

export type SchoolClass = {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  codeExpiresAt: string;
  parentCode: string;
  teacherUid: string;
  childCount: number;
  totalStars: number;
  totalReadingMs: number;
  children: ClassChild[];
};

export type SchoolRecord = {
  id: string;
  name: string;
  createdBy: string;
};

export type DeviceLink = {
  schoolId: string;
  classId: string;
  code: string;
};

export type SchoolDesk = {
  school: SchoolRecord | null;
  members: SchoolMember[];
  invites: SchoolInvite[];
  classes: SchoolClass[];
  deviceLink: DeviceLink | null;
};

export type SchoolWrite =
  | { op: "set"; path: string; data: Record<string, unknown> }
  | { op: "delete"; path: string };

export type SchoolResult = {
  desk: SchoolDesk;
  error: string | null;
  writes: SchoolWrite[];
};

export type AccessViewer = {
  uid: string | null;
  memberships: { schoolId: string; role: MemberRole }[];
};

export type ChildAccess = {
  schoolId: string;
  classId: string;
  teacherUid: string;
  parentUid: string | null;
  consented: boolean;
};

const CLASS_WORDS = ["BUNNY", "FOX", "OWL", "BEAR", "DUCK", "FROG", "LAMB", "DOVE"] as const;
const PARENT_WORDS = ["NEST", "SEED", "POND", "HILL", "LEAF", "STAR", "MOON", "SUN"] as const;

const PROGRESS_KEYS = ["id", "name", "animal", "stars", "readingMs", "path", "startingLesson"] as const;

export const CODE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const ATTEMPT_LIMIT = 5;
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export type CodeAttempts = { failures: number; windowStart: number };

export function expiresOn(now: string, ttlMs = CODE_TTL_MS): string {
  const start = Date.parse(now);
  return new Date((Number.isFinite(start) ? start : Date.now()) + ttlMs).toISOString();
}

export function inviteState(input: { acceptedAt?: string | null; expiresAt?: string }, now = new Date()): InviteState {
  if (input.acceptedAt) return "accepted";
  if (input.expiresAt && Date.parse(input.expiresAt) <= now.getTime()) return "expired";
  return "pending";
}

/** Five wrong codes in 15 minutes stop the next try. A correct code clears the count. */
export function judgeAttempt(log: CodeAttempts, now: number, matched: boolean): { log: CodeAttempts; error: string | null } {
  const fresh = log.windowStart === 0 || now - log.windowStart > ATTEMPT_WINDOW_MS;
  const failures = fresh ? 0 : log.failures;
  const windowStart = fresh || log.windowStart === 0 ? now : log.windowStart;
  if (failures >= ATTEMPT_LIMIT) {
    return { log: { failures, windowStart }, error: "Too many tries. Wait a little, then try the code again." };
  }
  if (matched) return { log: { failures: 0, windowStart: now }, error: null };
  const next = failures + 1;
  return {
    log: { failures: next, windowStart: next === 1 ? now : windowStart },
    error: next >= ATTEMPT_LIMIT ? "Too many tries. Wait a little, then try the code again." : null,
  };
}

export function schoolRole(value: unknown): SchoolRole {
  if (value === "teacher" || value === "admin" || value === "parent") return value;
  return "parent";
}

export function emptyDesk(): SchoolDesk {
  return { school: null, members: [], invites: [], classes: [], deviceLink: null };
}

export function classCodeAt(wordIndex: number, number: number): string {
  const word = CLASS_WORDS[Math.abs(Math.floor(wordIndex)) % CLASS_WORDS.length] ?? "BUNNY";
  return `${word}-${codeNumber(number)}`;
}

export function parentCodeAt(wordIndex: number, number: number): string {
  const word = PARENT_WORDS[Math.abs(Math.floor(wordIndex)) % PARENT_WORDS.length] ?? "NEST";
  return `${word}-${codeNumber(number)}`;
}

export function makeClassCode(random: () => number = Math.random): string {
  return classCodeAt(Math.floor(random() * CLASS_WORDS.length), 10 + Math.floor(random() * 90));
}

export function makeParentCode(random: () => number = Math.random): string {
  return parentCodeAt(Math.floor(random() * PARENT_WORDS.length), 10 + Math.floor(random() * 90));
}

/** Try again when a code is already used. The word list is short on purpose. */
export function freshCode(taken: ReadonlySet<string>, make: () => string): string {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = make();
    if (!taken.has(code)) return code;
  }
  return make();
}

export function normalizeSchoolName(raw: string): string | null {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!/^[A-Za-z0-9][A-Za-z0-9 '&-]{0,39}$/.test(cleaned)) return null;
  return cleaned;
}

export function inviteLink(href: string, schoolId: string, inviteId: string): string {
  const url = new URL(href);
  url.hash = "";
  url.searchParams.set("school", schoolId);
  url.searchParams.set("schoolInvite", inviteId);
  return url.toString();
}

export type CodeKind = "teacher" | "parent" | "class";

/** A web link the QR code opens. The same path can be an iOS universal link later. */
export function codeLink(href: string, kind: CodeKind, code: string): string {
  const url = new URL(href);
  url.hash = "";
  url.search = "";
  const key = kind === "teacher" ? "schoolInvite" : kind === "parent" ? "parentCode" : "classCode";
  url.searchParams.set(key, code);
  return url.toString();
}

export function codesFromHref(href: string): { teacher: string; parent: string; classCode: string } {
  const url = new URL(href, "https://littlenestlearning.app");
  return {
    teacher: (url.searchParams.get("schoolInvite") ?? "").toUpperCase(),
    parent: (url.searchParams.get("parentCode") ?? "").toUpperCase(),
    classCode: (url.searchParams.get("classCode") ?? "").toUpperCase(),
  };
}

export function readingMinutesLabel(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60000));
  return minutes === 1 ? "1 min" : `${minutes} min`;
}

/**
 * First name or initial, animal, and progress. Photos and emails are not copied.
 */
export function childSnapshot(profile: ChildProfile, now = new Date()): ProgressChild {
  const place = placeForChild(profile.createdAt, now);
  const current = place.stages.find((stage) => stage.state === "current");
  const title = current?.title ?? "Letters";
  const readingMs = Object.values(profile.readingMs ?? {}).reduce((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
  const snapshot: ProgressChild = {
    id: profile.id,
    name: normalizeChildName(profile.name) ?? "M",
    animal: profile.animal,
    stars: Math.max(0, profile.stars),
    readingMs: Math.max(0, readingMs),
    path: title,
    startingLesson: place.introduced === 0 ? "Letters" : title,
  };
  return pickProgress(snapshot);
}

export function canReadChild(viewer: AccessViewer, child: ChildAccess): boolean {
  if (!viewer.uid) return false;
  const membership = viewer.memberships.find((item) => item.schoolId === child.schoolId);
  if (membership?.role === "admin") return true;
  if (membership?.role === "teacher" && child.teacherUid === viewer.uid) return true;
  return child.parentUid === viewer.uid && child.consented === true;
}

/** A director sees totals. The class teacher sees their own class. */
export function canReadClassSummary(viewer: AccessViewer, schoolId: string, teacherUid: string): boolean {
  if (!viewer.uid) return false;
  const membership = viewer.memberships.find((item) => item.schoolId === schoolId);
  if (!membership) return false;
  if (membership.role === "admin") return true;
  return membership.role === "teacher" && teacherUid === viewer.uid;
}

export function canReadSchoolSummary(viewer: AccessViewer, schoolId: string): boolean {
  if (!viewer.uid) return false;
  return viewer.memberships.some((item) => item.schoolId === schoolId && item.role === "admin");
}

/** Codes are looked up by the exact id. Listing every code is denied. */
export function canListClassCodes(): boolean {
  return false;
}

export function canRemoveTeacher(desk: SchoolDesk, adminUid: string, teacherUid: string): boolean {
  if (!adminUid || adminUid === teacherUid) return false;
  if (!isActiveAdmin(desk, adminUid)) return false;
  return desk.members.some((member) => member.uid === teacherUid && member.role === "teacher");
}

export function teacherClasses(desk: SchoolDesk, uid: string): SchoolClass[] {
  if (!isActiveTeacher(desk, uid)) return [];
  return desk.classes.filter((room) => room.teacherUid === uid);
}

export function parentChildren(desk: SchoolDesk, uid: string): (ClassChild & { className: string })[] {
  const rows: (ClassChild & { className: string })[] = [];
  for (const room of desk.classes) {
    for (const child of room.children) {
      if (child.parentUid === uid && child.consented) rows.push({ ...child, className: room.name });
    }
  }
  return rows;
}

export type AdminTotals = {
  name: string;
  teacherCount: number;
  classCount: number;
  childCount: number;
  totalStars: number;
  totalReadingMs: number;
  classes: { name: string; childCount: number; totalStars: number; totalReadingMs: number }[];
};

/** School-wide totals. Child names are not included. */
export function adminTotals(desk: SchoolDesk, uid: string): AdminTotals | null {
  if (!desk.school || !isActiveAdmin(desk, uid)) return null;
  const classes = desk.classes.map((room) => ({
    name: room.name,
    childCount: room.childCount,
    totalStars: room.totalStars,
    totalReadingMs: room.totalReadingMs,
  }));
  return {
    name: desk.school.name,
    teacherCount: desk.members.filter((member) => member.role === "teacher" && member.status === "active").length,
    classCount: classes.length,
    childCount: classes.reduce((sum, room) => sum + room.childCount, 0),
    totalStars: classes.reduce((sum, room) => sum + room.totalStars, 0),
    totalReadingMs: classes.reduce((sum, room) => sum + room.totalReadingMs, 0),
    classes,
  };
}

export function createSchool(
  desk: SchoolDesk,
  input: { name: string; uid: string; email: string; schoolId: string; now: string },
): SchoolResult {
  if (desk.school) return fail(desk, "This account already has a school.");
  const name = normalizeSchoolName(input.name);
  if (!name) return fail(desk, "Enter a school name, such as Kids Villa.");
  const school = { id: input.schoolId, name, createdBy: input.uid };
  const member: SchoolMember = { uid: input.uid, email: input.email.trim().toLowerCase(), role: "admin", status: "active" };
  return ok(
    { ...desk, school, members: [member] },
    [
      { op: "set", path: `schools/${school.id}`, data: { name, createdBy: input.uid, createdAt: input.now } },
      {
        op: "set",
        path: `schools/${school.id}/members/${input.uid}`,
        data: { role: "admin", email: member.email, status: "active" },
      },
      { op: "set", path: `directory/${input.uid}`, data: { schoolId: school.id } },
    ],
  );
}

export function inviteTeacher(
  desk: SchoolDesk,
  input: { email: string; uid: string; inviteId: string; code?: string; now?: string },
): SchoolResult {
  if (!desk.school || !isActiveAdmin(desk, input.uid)) return fail(desk, "Only a school admin can invite a teacher.");
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(desk, "Enter the teacher's email.");
  const already =
    desk.invites.some((invite) => invite.email === email && !invite.acceptedAt) ||
    desk.members.some((member) => member.email === email && member.status === "active");
  if (already) return fail(desk, "That teacher is already invited.");
  const now = input.now ?? new Date().toISOString();
  const code = (input.code ?? "OWL-17").trim().toUpperCase();
  const invite: SchoolInvite = { id: input.inviteId, email, createdBy: input.uid, code, expiresAt: expiresOn(now), acceptedAt: null };
  return ok({ ...desk, invites: [...desk.invites, invite] }, [inviteWrite(desk.school.id, invite), inviteCodeWrite(desk.school.id, invite)]);
}

export function acceptInvite(
  desk: SchoolDesk,
  input: { inviteId?: string; code?: string; uid: string; email: string; now?: string },
): SchoolResult {
  if (!desk.school) return fail(desk, "That invite link is not valid.");
  const code = input.code?.trim().toUpperCase();
  const invite = desk.invites.find((item) => item.id === input.inviteId || (code && item.code === code));
  if (!invite) return fail(desk, "That invite link is not valid.");
  const now = input.now ?? new Date().toISOString();
  if (inviteState(invite, new Date(now)) === "expired") return fail(desk, "That invite has expired. Ask for a new one.");
  if (invite.email !== input.email.trim().toLowerCase()) return fail(desk, "Sign in with the invited email.");
  if (desk.members.some((member) => member.uid === input.uid)) return fail(desk, "You already belong to this school.");
  const member: SchoolMember = { uid: input.uid, email: invite.email, role: "teacher", status: "active" };
  const accepted: SchoolInvite = { ...invite, acceptedAt: now };
  return ok(
    {
      ...desk,
      members: [...desk.members, member],
      invites: desk.invites.map((item) => (item.id === invite.id ? accepted : item)),
    },
    [
      {
        op: "set",
        path: `schools/${desk.school.id}/members/${input.uid}`,
        data: { role: "teacher", email: invite.email, status: "active", inviteId: invite.id },
      },
      inviteWrite(desk.school.id, accepted),
      { op: "delete", path: `inviteCodes/${invite.code}` },
      { op: "set", path: `directory/${input.uid}`, data: { schoolId: desk.school.id } },
    ],
  );
}

export function resendInvite(
  desk: SchoolDesk,
  input: { adminUid: string; inviteId: string; code: string; now?: string },
): SchoolResult {
  if (!desk.school || !isActiveAdmin(desk, input.adminUid)) return fail(desk, "Only a school admin can resend an invite.");
  const invite = desk.invites.find((item) => item.id === input.inviteId);
  if (!invite) return fail(desk, "That invite is already gone.");
  if (invite.acceptedAt) return fail(desk, "That teacher already joined.");
  const now = input.now ?? new Date().toISOString();
  const next: SchoolInvite = { ...invite, code: input.code.trim().toUpperCase(), expiresAt: expiresOn(now), acceptedAt: null };
  return ok(
    { ...desk, invites: desk.invites.map((item) => (item.id === invite.id ? next : item)) },
    [
      inviteWrite(desk.school.id, next),
      { op: "delete", path: `inviteCodes/${invite.code}` },
      inviteCodeWrite(desk.school.id, next),
    ],
  );
}

export function removeTeacher(desk: SchoolDesk, input: { adminUid: string; teacherUid: string }): SchoolResult {
  if (!desk.school || !canRemoveTeacher(desk, input.adminUid, input.teacherUid)) {
    return fail(desk, "A school admin can remove another teacher.");
  }
  return ok(
    { ...desk, members: desk.members.filter((member) => member.uid !== input.teacherUid) },
    [{ op: "delete", path: `schools/${desk.school.id}/members/${input.teacherUid}` }],
  );
}

export function cancelInvite(desk: SchoolDesk, input: { adminUid: string; inviteId: string }): SchoolResult {
  if (!desk.school || !isActiveAdmin(desk, input.adminUid)) return fail(desk, "Only a school admin can remove an invite.");
  const invite = desk.invites.find((item) => item.id === input.inviteId);
  if (!invite) return fail(desk, "That invite is already gone.");
  return ok(
    { ...desk, invites: desk.invites.filter((item) => item.id !== invite.id) },
    [
      { op: "delete", path: `schools/${desk.school.id}/invites/${invite.id}` },
      { op: "delete", path: `inviteCodes/${invite.code}` },
    ],
  );
}

export function createClass(
  desk: SchoolDesk,
  input: { name: string; teacherUid: string; classId: string; code: string; parentCode: string; now?: string },
): SchoolResult {
  if (!desk.school || !isActiveTeacher(desk, input.teacherUid)) return fail(desk, "Only a teacher can create a class.");
  const name = normalizeSchoolName(input.name);
  if (!name) return fail(desk, "Enter a class name.");
  const code = input.code.trim().toUpperCase();
  const parentCode = input.parentCode.trim().toUpperCase();
  if (takenCodes(desk).has(code) || takenCodes(desk).has(parentCode)) return fail(desk, "That code is already used. Try again.");
  const now = input.now ?? new Date().toISOString();
  const room: SchoolClass = {
    id: input.classId,
    schoolId: desk.school.id,
    name,
    code,
    codeExpiresAt: expiresOn(now),
    parentCode,
    teacherUid: input.teacherUid,
    childCount: 0,
    totalStars: 0,
    totalReadingMs: 0,
    children: [],
  };
  return ok({ ...desk, classes: [...desk.classes, room] }, classWrites(room));
}

export function linkDevice(desk: SchoolDesk, input: { code: string; teacherUid: string; now?: string }): SchoolResult {
  const code = input.code.trim().toUpperCase();
  const room = desk.classes.find((item) => item.code === code);
  if (!room || room.teacherUid !== input.teacherUid || !isActiveTeacher(desk, input.teacherUid)) {
    return fail(desk, "That class code was not found for your classes.");
  }
  const now = input.now ?? new Date().toISOString();
  if (inviteState({ expiresAt: room.codeExpiresAt }, new Date(now)) === "expired") {
    return fail(desk, "That class code has expired. Make a new one.");
  }
  return ok({ ...desk, deviceLink: { schoolId: room.schoolId, classId: room.id, code: room.code } }, []);
}

export function publishProgress(
  desk: SchoolDesk,
  input: { classId: string; teacherUid: string; children: ProgressChild[] },
): SchoolResult {
  const room = desk.classes.find((item) => item.id === input.classId);
  if (!room || room.teacherUid !== input.teacherUid || !isActiveTeacher(desk, input.teacherUid)) {
    return fail(desk, "Only the teacher can update this class.");
  }
  const byId = new Map(room.children.map((child) => [child.id, child]));
  for (const child of input.children) {
    const previous = byId.get(child.id);
    byId.set(child.id, cleanChild(child, previous));
  }
  const children = [...byId.values()];
  const nextRoom = { ...room, children, ...totalsOf(children) };
  const classes = desk.classes.map((item) => (item.id === room.id ? nextRoom : item));
  const writes: SchoolWrite[] = input.children.map((child) => {
    const saved = byId.get(child.id) ?? cleanChild(child);
    return {
      op: "set",
      path: `schools/${room.schoolId}/classes/${room.id}/children/${saved.id}`,
      data: childData(saved, room.id, room.schoolId),
    };
  });
  writes.push({
    op: "set",
    path: `schools/${room.schoolId}/classes/${room.id}`,
    data: classData(nextRoom),
  });
  return ok({ ...desk, classes }, writes);
}

export function joinAsParent(
  desk: SchoolDesk,
  input: { code: string; parentUid: string; children: ProgressChild[]; consent: boolean; now?: string },
): SchoolResult {
  if (!input.consent) return fail(desk, "A parent agrees before a child is linked.");
  const code = input.code.trim().toUpperCase();
  const now = input.now ?? new Date().toISOString();
  const found = findParentTarget(desk, code);
  if (!found) return fail(desk, "That join code was not found.");
  if (inviteState({ expiresAt: found.expiresAt }, new Date(now)) === "expired") {
    return fail(desk, "That code has expired. Ask the teacher for a new one.");
  }
  if (found.child) {
    if (found.child.parentUid && found.child.parentUid !== input.parentUid) {
      return fail(desk, "That child is already linked to another parent.");
    }
    const linked: ClassChild = { ...found.child, parentUid: input.parentUid, consented: true };
    return ok(replaceChild(desk, found.room.id, linked), parentLinkWrites(found.room, linked, input.parentUid));
  }
  if (input.children.length === 0) return fail(desk, "Add a child on this device first.");
  const room = found.room;
  for (const child of input.children) {
    const existing = room.children.find((item) => item.id === child.id);
    if (existing?.parentUid && existing.parentUid !== input.parentUid) {
      return fail(desk, "That child is already linked to another parent.");
    }
  }
  const byId = new Map(room.children.map((child) => [child.id, child]));
  for (const child of input.children) {
    const previous = byId.get(child.id);
    byId.set(child.id, { ...cleanChild(child, previous), parentUid: input.parentUid, consented: true });
  }
  const children = [...byId.values()];
  const nextRoom = { ...room, children, ...totalsOf(children) };
  const classes = desk.classes.map((item) => (item.id === room.id ? nextRoom : item));
  const writes: SchoolWrite[] = parentDocs(room, input.parentUid);
  writes.push({ op: "set", path: `schools/${room.schoolId}/classes/${room.id}`, data: classData(nextRoom) });
  for (const child of input.children) {
    const saved = byId.get(child.id);
    if (!saved) continue;
    writes.push({
      op: "set",
      path: `schools/${room.schoolId}/classes/${room.id}/children/${saved.id}`,
      data: childData(saved, room.id, room.schoolId),
    });
  }
  return ok({ ...desk, classes }, writes);
}

export function addChild(
  desk: SchoolDesk,
  input: { teacherUid: string; classId: string; childId: string; name: string; animal: string; parentCode: string; now?: string },
): SchoolResult {
  const room = desk.classes.find((item) => item.id === input.classId);
  if (!room || room.teacherUid !== input.teacherUid || !isActiveTeacher(desk, input.teacherUid)) {
    return fail(desk, "Only the teacher can add a child to this class.");
  }
  const name = normalizeChildName(input.name);
  if (!name) return fail(desk, "Enter a first name or one initial.");
  const code = input.parentCode.trim().toUpperCase();
  if (takenCodes(desk).has(code)) return fail(desk, "That code is already used. Try again.");
  const now = input.now ?? new Date().toISOString();
  const child: ClassChild = {
    id: input.childId,
    name,
    animal: input.animal,
    stars: 0,
    readingMs: 0,
    path: "Letters",
    startingLesson: "Letters",
    parentUid: null,
    consented: false,
    parentCode: code,
    parentCodeExpiresAt: expiresOn(now),
  };
  const next = replaceChild(desk, room.id, child);
  const saved = next.classes.find((item) => item.id === room.id);
  const writes: SchoolWrite[] = [
    { op: "set", path: `schools/${room.schoolId}/classes/${room.id}/children/${child.id}`, data: childData(child, room.id, room.schoolId) },
    parentCodeWrite(room, child),
  ];
  if (saved) writes.push({ op: "set", path: `schools/${room.schoolId}/classes/${room.id}`, data: classData(saved) });
  return ok(next, writes);
}

export function regenerateParentCode(
  desk: SchoolDesk,
  input: { actorUid: string; classId: string; childId: string; code: string; now?: string },
): SchoolResult {
  const room = ownedClass(desk, input.actorUid, input.classId);
  if (!room) return fail(desk, "Only the teacher or a school admin can make a new parent code.");
  const child = room.children.find((item) => item.id === input.childId);
  if (!child) return fail(desk, "That child is not in this class.");
  const code = input.code.trim().toUpperCase();
  const now = input.now ?? new Date().toISOString();
  const previous = child.parentCode;
  const next: ClassChild = { ...child, parentCode: code, parentCodeExpiresAt: expiresOn(now) };
  const writes: SchoolWrite[] = [parentCodeWrite(room, next)];
  if (previous && previous !== code) writes.push({ op: "delete", path: `parentCodes/${previous}` });
  const saved = replaceChild(desk, room.id, next);
  const updated = saved.classes.find((item) => item.id === room.id);
  if (updated) writes.push({ op: "set", path: `schools/${room.schoolId}/classes/${room.id}`, data: classData(updated) });
  writes.push({
    op: "set",
    path: `schools/${room.schoolId}/classes/${room.id}/children/${next.id}`,
    data: childData(next, room.id, room.schoolId),
  });
  return ok(saved, writes);
}

export function regenerateClassCode(
  desk: SchoolDesk,
  input: { actorUid: string; classId: string; code: string; now?: string },
): SchoolResult {
  const room = ownedClass(desk, input.actorUid, input.classId);
  if (!room) return fail(desk, "Only the teacher or a school admin can make a new class code.");
  const code = input.code.trim().toUpperCase();
  const now = input.now ?? new Date().toISOString();
  const next: SchoolClass = { ...room, code, codeExpiresAt: expiresOn(now) };
  const classes = desk.classes.map((item) => (item.id === room.id ? next : item));
  const deviceLink = desk.deviceLink?.classId === room.id ? { ...desk.deviceLink, code } : desk.deviceLink;
  return ok(
    { ...desk, classes, deviceLink },
    [
      { op: "delete", path: `classCodes/${room.code}` },
      { op: "set", path: `classCodes/${code}`, data: codeDoc(next) },
      { op: "set", path: `schools/${room.schoolId}/classes/${room.id}`, data: classData(next) },
    ],
  );
}

export function unlinkParent(desk: SchoolDesk, input: { actorUid: string; classId: string; childId: string }): SchoolResult {
  const room = ownedClass(desk, input.actorUid, input.classId);
  if (!room) return fail(desk, "Only the teacher or a school admin can remove a parent link.");
  const child = room.children.find((item) => item.id === input.childId);
  if (!child) return fail(desk, "That child is not in this class.");
  const parentUid = child.parentUid;
  const next: ClassChild = { ...child, parentUid: null, consented: false };
  const writes: SchoolWrite[] = [
    { op: "set", path: `schools/${room.schoolId}/classes/${room.id}/children/${next.id}`, data: childData(next, room.id, room.schoolId) },
  ];
  if (parentUid) writes.push({ op: "delete", path: `schools/${room.schoolId}/classes/${room.id}/parents/${parentUid}` });
  return ok(replaceChild(desk, room.id, next), writes);
}

export function removeChild(desk: SchoolDesk, input: { actorUid: string; classId: string; childId: string }): SchoolResult {
  const room = ownedClass(desk, input.actorUid, input.classId);
  if (!room) return fail(desk, "Only the teacher or a school admin can remove a child.");
  const child = room.children.find((item) => item.id === input.childId);
  if (!child) return fail(desk, "That child is not in this class.");
  const children = room.children.filter((item) => item.id !== child.id);
  const next = { ...room, children, ...totalsOf(children) };
  const classes = desk.classes.map((item) => (item.id === room.id ? next : item));
  const writes: SchoolWrite[] = [
    { op: "delete", path: `schools/${room.schoolId}/classes/${room.id}/children/${child.id}` },
    { op: "set", path: `schools/${room.schoolId}/classes/${room.id}`, data: classData(next) },
  ];
  if (child.parentCode) writes.push({ op: "delete", path: `parentCodes/${child.parentCode}` });
  return ok({ ...desk, classes }, writes);
}

export function moveChild(
  desk: SchoolDesk,
  input: { adminUid: string; childId: string; fromClassId: string; toClassId: string },
): SchoolResult {
  if (!isActiveAdmin(desk, input.adminUid)) return fail(desk, "Only a school admin can move a child.");
  const from = desk.classes.find((item) => item.id === input.fromClassId);
  const to = desk.classes.find((item) => item.id === input.toClassId);
  if (!from || !to || from.schoolId !== to.schoolId) return fail(desk, "Choose two classes in this school.");
  const child = from.children.find((item) => item.id === input.childId);
  if (!child) return fail(desk, "That child is not in this class.");
  if (from.id === to.id) return fail(desk, "That child is already in this class.");
  const fromChildren = from.children.filter((item) => item.id !== child.id);
  const toChildren = [...to.children, child];
  const nextFrom = { ...from, children: fromChildren, ...totalsOf(fromChildren) };
  const nextTo = { ...to, children: toChildren, ...totalsOf(toChildren) };
  const classes = desk.classes.map((item) => (item.id === from.id ? nextFrom : item.id === to.id ? nextTo : item));
  return ok({ ...desk, classes }, [
    { op: "delete", path: `schools/${from.schoolId}/classes/${from.id}/children/${child.id}` },
    { op: "set", path: `schools/${to.schoolId}/classes/${to.id}/children/${child.id}`, data: childData(child, to.id, to.schoolId) },
    { op: "set", path: `schools/${from.schoolId}/classes/${from.id}`, data: classData(nextFrom) },
    { op: "set", path: `schools/${to.schoolId}/classes/${to.id}`, data: classData(nextTo) },
    child.parentCode ? { op: "set", path: `parentCodes/${child.parentCode}`, data: parentCodeData(nextTo, child) } : { op: "set", path: `schools/${to.schoolId}/classes/${to.id}`, data: classData(nextTo) },
  ]);
}

export type RosterChild = {
  id: string;
  name: string;
  animal: string;
  classId: string;
  className: string;
  parentCode: string;
  parentState: InviteState;
  parentLinked: boolean;
};

export type RosterClass = {
  id: string;
  name: string;
  code: string;
  codeState: InviteState;
  teacherUid: string;
  teacherEmail: string;
  children: RosterChild[];
};

export type RosterTeacher = {
  id: string;
  email: string;
  state: InviteState;
  code: string;
};

/** A director sees the whole school. A teacher sees only their classes. */
export function schoolRoster(desk: SchoolDesk, uid: string, now = new Date()): { teachers: RosterTeacher[]; classes: RosterClass[] } | null {
  const admin = isActiveAdmin(desk, uid);
  const teacher = isActiveTeacher(desk, uid);
  if (!desk.school || (!admin && !teacher)) return null;
  const rooms = admin ? desk.classes : desk.classes.filter((room) => room.teacherUid === uid);
  const teachers: RosterTeacher[] = [];
  if (admin) {
    for (const member of desk.members.filter((item) => item.role === "teacher" && item.status === "active")) {
      teachers.push({ id: member.uid, email: member.email, state: "accepted", code: "" });
    }
    for (const invite of desk.invites) {
      teachers.push({ id: invite.id, email: invite.email, state: inviteState(invite, now), code: invite.code });
    }
  }
  return {
    teachers,
    classes: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      code: room.code,
      codeState: inviteState({ expiresAt: room.codeExpiresAt }, now),
      teacherUid: room.teacherUid,
      teacherEmail: desk.members.find((member) => member.uid === room.teacherUid)?.email ?? "",
      children: room.children.map((child) => ({
        id: child.id,
        name: child.name,
        animal: child.animal,
        classId: room.id,
        className: room.name,
        parentCode: child.parentCode,
        parentState: child.consented && child.parentUid ? "accepted" : inviteState({ expiresAt: child.parentCodeExpiresAt }, now),
        parentLinked: Boolean(child.parentUid && child.consented),
      })),
    })),
  };
}

export const PREVIEW_SCHOOL_ID = "school-kids-villa";
export const PREVIEW_CLASS_ID = "class-bunnies";

export function teacherPreviewDesk(): SchoolDesk {
  const room = previewClass("preview");
  return {
    school: { id: PREVIEW_SCHOOL_ID, name: "Kids Villa", createdBy: "director" },
    members: [{ uid: "preview", email: "teacher@example.com", role: "teacher", status: "active" }],
    invites: [],
    classes: [room],
    deviceLink: null,
  };
}

export function parentPreviewDesk(): SchoolDesk {
  return {
    school: { id: PREVIEW_SCHOOL_ID, name: "Kids Villa", createdBy: "director" },
    members: [
      { uid: "director", email: "director@example.com", role: "admin", status: "active" },
      { uid: "teacher-1", email: "teacher@example.com", role: "teacher", status: "active" },
    ],
    invites: [],
    classes: [previewClass("teacher-1")],
    deviceLink: null,
  };
}

export function loadDeviceLink(storage: KeyValueStore = localStorage): DeviceLink | null {
  try {
    return parseDeviceLink(readStored(storage, CLASS_LINK_KEY));
  } catch {
    return null;
  }
}

export function saveDeviceLink(link: DeviceLink | null, storage: KeyValueStore = localStorage): void {
  if (!link) return;
  writeStored(storage, CLASS_LINK_KEY, JSON.stringify(link));
}

export function parseDeviceLink(raw: string | null): DeviceLink | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Partial<DeviceLink>;
    if (!record.schoolId || !record.classId || !record.code) return null;
    return { schoolId: record.schoolId, classId: record.classId, code: record.code };
  } catch {
    return null;
  }
}

export const SCHOOL_ROLE_KEY = "littlenest-school-role-v1";

export function loadSchoolRole(storage: KeyValueStore = localStorage): SchoolRole | null {
  try {
    const raw = storage.getItem(SCHOOL_ROLE_KEY);
    if (raw === "teacher" || raw === "admin" || raw === "parent") return raw;
    return null;
  } catch {
    return null;
  }
}

export function saveSchoolRole(role: SchoolRole, storage: KeyValueStore = localStorage): void {
  storage.setItem(SCHOOL_ROLE_KEY, role);
}

function previewClass(teacherUid: string): SchoolClass {
  const child: ClassChild = {
    id: "mia",
    name: "Mia",
    animal: "fox",
    stars: 3,
    readingMs: 300000,
    path: "Letters",
    startingLesson: "Letters",
    parentUid: null,
    consented: false,
    parentCode: "NEST-18",
    parentCodeExpiresAt: "2099-01-01T00:00:00.000Z",
  };
  return {
    id: PREVIEW_CLASS_ID,
    schoolId: PREVIEW_SCHOOL_ID,
    name: "Bunnies",
    code: "BUNNY-42",
    codeExpiresAt: "2099-01-01T00:00:00.000Z",
    parentCode: "NEST-18",
    teacherUid,
    childCount: 1,
    totalStars: 3,
    totalReadingMs: 300000,
    children: [child],
  };
}

function codeNumber(number: number): number {
  const whole = Math.floor(number);
  if (whole >= 10 && whole <= 99) return whole;
  return 10 + (Math.abs(whole) % 90);
}

function fail(desk: SchoolDesk, error: string): SchoolResult {
  return { desk, error, writes: [] };
}

function ok(desk: SchoolDesk, writes: SchoolWrite[]): SchoolResult {
  return { desk, error: null, writes };
}

function isActiveAdmin(desk: SchoolDesk, uid: string): boolean {
  return desk.members.some((member) => member.uid === uid && member.role === "admin" && member.status === "active");
}

function isActiveTeacher(desk: SchoolDesk, uid: string): boolean {
  return desk.members.some((member) => member.uid === uid && member.role === "teacher" && member.status === "active");
}

function totalsOf(children: ClassChild[]): Pick<SchoolClass, "childCount" | "totalStars" | "totalReadingMs"> {
  return {
    childCount: children.length,
    totalStars: children.reduce((sum, child) => sum + child.stars, 0),
    totalReadingMs: children.reduce((sum, child) => sum + child.readingMs, 0),
  };
}

function pickProgress(snapshot: ProgressChild): ProgressChild {
  const copy = { ...snapshot } as ProgressChild & Record<string, unknown>;
  for (const key of Object.keys(copy)) {
    if (!(PROGRESS_KEYS as readonly string[]).includes(key)) delete copy[key];
  }
  return copy;
}

function cleanChild(child: ProgressChild, previous?: ClassChild): ClassChild {
  return {
    id: child.id,
    name: normalizeChildName(child.name) ?? "M",
    animal: child.animal,
    stars: Math.max(0, child.stars),
    readingMs: Math.max(0, child.readingMs),
    path: child.path,
    startingLesson: child.startingLesson,
    parentUid: previous?.parentUid ?? null,
    consented: previous?.consented ?? false,
    parentCode: previous?.parentCode ?? "",
    parentCodeExpiresAt: previous?.parentCodeExpiresAt ?? "",
  };
}

function childData(child: ClassChild, classId: string, schoolId: string): Record<string, unknown> {
  return {
    name: child.name,
    animal: child.animal,
    stars: child.stars,
    readingMs: child.readingMs,
    path: child.path,
    startingLesson: child.startingLesson,
    parentUid: child.parentUid,
    consented: child.consented,
    parentCode: child.parentCode,
    parentCodeExpiresAt: child.parentCodeExpiresAt,
    classId,
    schoolId,
  };
}

function classData(room: SchoolClass): Record<string, unknown> {
  return {
    name: room.name,
    code: room.code,
    codeExpiresAt: room.codeExpiresAt,
    parentCode: room.parentCode,
    teacherUid: room.teacherUid,
    schoolId: room.schoolId,
    childCount: room.childCount,
    totalStars: room.totalStars,
    totalReadingMs: room.totalReadingMs,
  };
}

function classWrites(room: SchoolClass): SchoolWrite[] {
  return [
    { op: "set", path: `schools/${room.schoolId}/classes/${room.id}`, data: classData(room) },
    { op: "set", path: `classCodes/${room.code}`, data: codeDoc(room) },
  ];
}

function codeDoc(room: SchoolClass): Record<string, unknown> {
  return { schoolId: room.schoolId, classId: room.id, teacherUid: room.teacherUid, expiresAt: Date.parse(room.codeExpiresAt) };
}

function parentCodeData(room: SchoolClass, child: ClassChild): Record<string, unknown> {
  return {
    schoolId: room.schoolId,
    classId: room.id,
    childId: child.id,
    teacherUid: room.teacherUid,
    expiresAt: Date.parse(child.parentCodeExpiresAt),
  };
}

function parentCodeWrite(room: SchoolClass, child: ClassChild): SchoolWrite {
  return { op: "set", path: `parentCodes/${child.parentCode}`, data: parentCodeData(room, child) };
}

function inviteWrite(schoolId: string, invite: SchoolInvite): SchoolWrite {
  return {
    op: "set",
    path: `schools/${schoolId}/invites/${invite.id}`,
    data: {
      email: invite.email,
      createdBy: invite.createdBy,
      code: invite.code,
      expiresAt: Date.parse(invite.expiresAt),
      status: invite.acceptedAt ? "accepted" : "pending",
    },
  };
}

function inviteCodeWrite(schoolId: string, invite: SchoolInvite): SchoolWrite {
  return {
    op: "set",
    path: `inviteCodes/${invite.code}`,
    data: { schoolId, inviteId: invite.id, expiresAt: Date.parse(invite.expiresAt) },
  };
}

function takenCodes(desk: SchoolDesk): Set<string> {
  const codes = new Set<string>();
  for (const invite of desk.invites) if (invite.code) codes.add(invite.code);
  for (const room of desk.classes) {
    codes.add(room.code);
    if (room.parentCode) codes.add(room.parentCode);
    for (const child of room.children) if (child.parentCode) codes.add(child.parentCode);
  }
  return codes;
}

function findParentTarget(desk: SchoolDesk, code: string): { room: SchoolClass; child: ClassChild | null; expiresAt: string } | null {
  for (const room of desk.classes) {
    const child = room.children.find((item) => item.parentCode === code);
    if (child) return { room, child, expiresAt: child.parentCodeExpiresAt };
  }
  const room = desk.classes.find((item) => item.parentCode === code);
  if (!room) return null;
  return { room, child: null, expiresAt: room.codeExpiresAt };
}

function replaceChild(desk: SchoolDesk, classId: string, child: ClassChild): SchoolDesk {
  const classes = desk.classes.map((room) => {
    if (room.id !== classId) return room;
    const children = room.children.some((item) => item.id === child.id)
      ? room.children.map((item) => (item.id === child.id ? child : item))
      : [...room.children, child];
    return { ...room, children, ...totalsOf(children) };
  });
  return { ...desk, classes };
}

function parentDocs(room: SchoolClass, parentUid: string): SchoolWrite[] {
  return [
    { op: "set", path: `schools/${room.schoolId}/classes/${room.id}/parents/${parentUid}`, data: { consented: true } },
    { op: "set", path: `schools/${room.schoolId}/parents/${parentUid}`, data: { consented: true } },
  ];
}

function parentLinkWrites(room: SchoolClass, child: ClassChild, parentUid: string): SchoolWrite[] {
  const nextRoom = {
    ...room,
    children: room.children.map((item) => (item.id === child.id ? child : item)),
  };
  return [
    ...parentDocs(room, parentUid),
    { op: "set", path: `schools/${room.schoolId}/classes/${room.id}`, data: classData({ ...nextRoom, ...totalsOf(nextRoom.children) }) },
    { op: "set", path: `schools/${room.schoolId}/classes/${room.id}/children/${child.id}`, data: childData(child, room.id, room.schoolId) },
  ];
}

function ownedClass(desk: SchoolDesk, uid: string, classId: string): SchoolClass | null {
  const room = desk.classes.find((item) => item.id === classId);
  if (!room) return null;
  if (isActiveAdmin(desk, uid)) return room;
  if (isActiveTeacher(desk, uid) && room.teacherUid === uid) return room;
  return null;
}
