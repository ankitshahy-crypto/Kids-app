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

export type SchoolInvite = {
  id: string;
  email: string;
  createdBy: string;
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
};

export type SchoolClass = {
  id: string;
  schoolId: string;
  name: string;
  code: string;
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

export function inviteTeacher(desk: SchoolDesk, input: { email: string; uid: string; inviteId: string }): SchoolResult {
  if (!desk.school || !isActiveAdmin(desk, input.uid)) return fail(desk, "Only a school admin can invite a teacher.");
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(desk, "Enter the teacher's email.");
  const already =
    desk.invites.some((invite) => invite.email === email) || desk.members.some((member) => member.email === email);
  if (already) return fail(desk, "That teacher is already invited.");
  const invite = { id: input.inviteId, email, createdBy: input.uid };
  return ok(
    { ...desk, invites: [...desk.invites, invite] },
    [{ op: "set", path: `schools/${desk.school.id}/invites/${invite.id}`, data: { email, createdBy: input.uid } }],
  );
}

export function acceptInvite(desk: SchoolDesk, input: { inviteId: string; uid: string; email: string }): SchoolResult {
  if (!desk.school) return fail(desk, "That invite link is not valid.");
  const invite = desk.invites.find((item) => item.id === input.inviteId);
  if (!invite) return fail(desk, "That invite link is not valid.");
  if (invite.email !== input.email.trim().toLowerCase()) return fail(desk, "Sign in with the invited email.");
  if (desk.members.some((member) => member.uid === input.uid)) return fail(desk, "You already belong to this school.");
  const member: SchoolMember = { uid: input.uid, email: invite.email, role: "teacher", status: "active" };
  return ok(
    { ...desk, members: [...desk.members, member], invites: desk.invites.filter((item) => item.id !== invite.id) },
    [
      {
        op: "set",
        path: `schools/${desk.school.id}/members/${input.uid}`,
        data: { role: "teacher", email: invite.email, status: "active", inviteId: invite.id },
      },
      { op: "delete", path: `schools/${desk.school.id}/invites/${invite.id}` },
      { op: "set", path: `directory/${input.uid}`, data: { schoolId: desk.school.id } },
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
    [{ op: "delete", path: `schools/${desk.school.id}/invites/${invite.id}` }],
  );
}

export function createClass(
  desk: SchoolDesk,
  input: { name: string; teacherUid: string; classId: string; code: string; parentCode: string },
): SchoolResult {
  if (!desk.school || !isActiveTeacher(desk, input.teacherUid)) return fail(desk, "Only a teacher can create a class.");
  const name = normalizeSchoolName(input.name);
  if (!name) return fail(desk, "Enter a class name.");
  const code = input.code.trim().toUpperCase();
  const parentCode = input.parentCode.trim().toUpperCase();
  if (desk.classes.some((room) => room.code === code || room.parentCode === parentCode)) {
    return fail(desk, "That code is already used. Try again.");
  }
  const room: SchoolClass = {
    id: input.classId,
    schoolId: desk.school.id,
    name,
    code,
    parentCode,
    teacherUid: input.teacherUid,
    childCount: 0,
    totalStars: 0,
    totalReadingMs: 0,
    children: [],
  };
  return ok({ ...desk, classes: [...desk.classes, room] }, classWrites(room));
}

export function linkDevice(desk: SchoolDesk, input: { code: string; teacherUid: string }): SchoolResult {
  const code = input.code.trim().toUpperCase();
  const room = desk.classes.find((item) => item.code === code);
  if (!room || room.teacherUid !== input.teacherUid || !isActiveTeacher(desk, input.teacherUid)) {
    return fail(desk, "That class code was not found for your classes.");
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
  input: { code: string; parentUid: string; children: ProgressChild[]; consent: boolean },
): SchoolResult {
  if (!input.consent) return fail(desk, "A parent agrees before a child is linked.");
  const code = input.code.trim().toUpperCase();
  const room = desk.classes.find((item) => item.parentCode === code);
  if (!room) return fail(desk, "That join code was not found.");
  if (input.children.length === 0) return fail(desk, "Add a child on this device first.");
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
  const writes: SchoolWrite[] = [
    {
      op: "set",
      path: `schools/${room.schoolId}/classes/${room.id}/parents/${input.parentUid}`,
      data: { consented: true },
    },
    {
      op: "set",
      path: `schools/${room.schoolId}/parents/${input.parentUid}`,
      data: { consented: true },
    },
    {
      op: "set",
      path: `schools/${room.schoolId}/classes/${room.id}`,
      data: classData(nextRoom),
    },
  ];
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
  };
  return {
    id: PREVIEW_CLASS_ID,
    schoolId: PREVIEW_SCHOOL_ID,
    name: "Bunnies",
    code: "BUNNY-42",
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
    classId,
    schoolId,
  };
}

function classData(room: SchoolClass): Record<string, unknown> {
  return {
    name: room.name,
    code: room.code,
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
    {
      op: "set",
      path: `classCodes/${room.code}`,
      data: { schoolId: room.schoolId, classId: room.id, teacherUid: room.teacherUid },
    },
    {
      op: "set",
      path: `parentCodes/${room.parentCode}`,
      data: { schoolId: room.schoolId, classId: room.id, teacherUid: room.teacherUid },
    },
  ];
}
