import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createChild } from "../data/profiles";
import { readPreview } from "./plan";
import { activeProviders, futureProviders, signInWithProvider } from "./providers";
import {
  acceptInvite,
  adminTotals,
  canListClassCodes,
  canReadChild,
  canReadClassSummary,
  canReadSchoolSummary,
  canRemoveTeacher,
  childSnapshot,
  classCodeAt,
  createClass,
  createSchool,
  emptyDesk,
  freshCode,
  inviteLink,
  inviteTeacher,
  joinAsParent,
  linkDevice,
  normalizeSchoolName,
  parentChildren,
  parentCodeAt,
  publishProgress,
  removeTeacher,
  teacherClasses,
  type ChildAccess,
  type SchoolDesk,
} from "./school";

const childAccess = (patch: Partial<ChildAccess> = {}): ChildAccess => ({
  schoolId: "s1",
  classId: "c1",
  teacherUid: "tea",
  parentUid: null,
  consented: false,
  ...patch,
});

function villa(): SchoolDesk {
  let desk = createSchool(emptyDesk(), {
    name: "Kids Villa",
    uid: "ada",
    email: "Ada@School.test",
    schoolId: "s1",
    now: "2026-09-01T00:00:00.000Z",
  }).desk;
  desk = inviteTeacher(desk, { email: "tea@school.test", uid: "ada", inviteId: "inv1" }).desk;
  desk = acceptInvite(desk, { inviteId: "inv1", uid: "tea", email: "TEA@school.test" }).desk;
  desk = createClass(desk, {
    name: "Bunnies",
    teacherUid: "tea",
    classId: "c1",
    code: "BUNNY-42",
    parentCode: "NEST-18",
  }).desk;
  return publishProgress(desk, {
    classId: "c1",
    teacherUid: "tea",
    children: [
      {
        id: "mia",
        name: "Mia",
        animal: "fox",
        stars: 3,
        readingMs: 300000,
        path: "Letters",
        startingLesson: "Letters",
      },
    ],
  }).desk;
}

describe("school codes, invites, and the minimum progress record", () => {
  it("builds a friendly class code and a separate parent code", () => {
    expect(classCodeAt(0, 42)).toBe("BUNNY-42");
    expect(parentCodeAt(0, 18)).toBe("NEST-18");
    expect(normalizeSchoolName("  Kids   Villa ")).toBe("Kids Villa");
    expect(freshCode(new Set(["BUNNY-10"]), () => "BUNNY-10")).toBe("BUNNY-10");
    const codes = ["BUNNY-10", "BUNNY-10", "FOX-11"];
    expect(freshCode(new Set(["BUNNY-10"]), () => codes.shift() ?? "FOX-11")).toBe("FOX-11");
  });

  it("stores a first name, animal, and progress, and drops a photo", () => {
    const child = createChild({ name: "Mia Smith", ageRange: "4", animal: "fox" });
    const dirty = { ...child, photo: "pic", email: "mia@x.com", lastName: "Smith", readingMs: { "2026-09-01": 300000 } };
    const snapshot = childSnapshot(dirty, new Date("2026-09-01T12:00:00.000Z"));
    expect(snapshot.name).toBe("Mia");
    expect(snapshot.animal).toBe("fox");
    expect(snapshot.readingMs).toBe(300000);
    expect(snapshot.startingLesson).toBe("Letters");
    expect(Object.keys(snapshot).sort()).toEqual(["animal", "id", "name", "path", "readingMs", "stars", "startingLesson"]);
    expect(JSON.stringify(snapshot)).not.toMatch(/photo|Smith|@/);
  });

  it("lets an admin invite by email and remove a teacher, not themselves", () => {
    const created = createSchool(emptyDesk(), {
      name: "Kids Villa",
      uid: "ada",
      email: "Ada@School.test",
      schoolId: "s1",
      now: "2026-09-01T00:00:00.000Z",
    });
    expect(created.desk.members[0]?.email).toBe("ada@school.test");
    expect(created.writes.map((write) => write.path)).toEqual([
      "schools/s1",
      "schools/s1/members/ada",
      "directory/ada",
    ]);
    const invited = inviteTeacher(created.desk, { email: "Tea@School.test", uid: "ada", inviteId: "inv1" });
    expect(inviteLink("https://example.com/Kids-app/?x=1#y", "s1", "inv1")).toBe(
      "https://example.com/Kids-app/?x=1&school=s1&schoolInvite=inv1",
    );
    expect(acceptInvite(invited.desk, { inviteId: "inv1", uid: "tea", email: "nope@school.test" }).error).toMatch(/invited email/);
    const joined = acceptInvite(invited.desk, { inviteId: "inv1", uid: "tea", email: "tea@school.test" });
    expect(joined.error).toBeNull();
    expect(canRemoveTeacher(joined.desk, "ada", "ada")).toBe(false);
    expect(canRemoveTeacher(joined.desk, "tea", "ada")).toBe(false);
    const removed = removeTeacher(joined.desk, { adminUid: "ada", teacherUid: "tea" });
    expect(removed.desk.members.some((member) => member.uid === "tea")).toBe(false);
    expect(removed.writes[0]).toEqual({ op: "delete", path: "schools/s1/members/tea" });
  });
});

describe("who can see progress", () => {
  const desk = villa();
  const hidden = childAccess();
  const teacher = { uid: "tea", memberships: [{ schoolId: "s1", role: "teacher" as const }] };
  const admin = { uid: "ada", memberships: [{ schoolId: "s1", role: "admin" as const }] };
  const other = { uid: "other", memberships: [{ schoolId: "s1", role: "teacher" as const }] };
  const parent = { uid: "pat", memberships: [] };

  it("shows a teacher their class, a parent only a consented child, and a director only totals", () => {
    expect(canReadChild({ uid: null, memberships: [] }, hidden)).toBe(false);
    expect(canReadChild(teacher, hidden)).toBe(true);
    expect(canReadChild(admin, hidden)).toBe(false);
    expect(canReadChild(other, hidden)).toBe(false);
    expect(canReadChild(parent, hidden)).toBe(false);
    expect(canReadClassSummary(admin, "s1", "tea")).toBe(true);
    expect(canReadClassSummary(teacher, "s1", "tea")).toBe(true);
    expect(canReadClassSummary(other, "s1", "tea")).toBe(false);
    expect(canReadClassSummary({ uid: null, memberships: [] }, "s1", "tea")).toBe(false);
    expect(canReadSchoolSummary(admin, "s1")).toBe(true);
    expect(canReadSchoolSummary(teacher, "s1")).toBe(false);
    expect(canListClassCodes()).toBe(false);

    expect(teacherClasses(desk, "tea")[0]?.code).toBe("BUNNY-42");
    expect(teacherClasses(desk, "ada")).toEqual([]);
    expect(parentChildren(desk, "pat")).toEqual([]);
    const totals = adminTotals(desk, "ada");
    expect(totals).toMatchObject({ name: "Kids Villa", teacherCount: 1, classCount: 1, childCount: 1, totalStars: 3, totalReadingMs: 300000 });
    expect(JSON.stringify(totals)).not.toMatch(/Mia|fox/);
  });

  it("requires parent consent and refuses another parent's child or the class code", () => {
    const mia = {
      id: "mia",
      name: "Mia",
      animal: "fox",
      stars: 3,
      readingMs: 300000,
      path: "Letters",
      startingLesson: "Letters",
    };
    expect(joinAsParent(desk, { code: "NEST-18", parentUid: "pat", children: [mia], consent: false }).error).toMatch(/agrees/);
    expect(joinAsParent(desk, { code: "BUNNY-42", parentUid: "pat", children: [mia], consent: true }).error).toMatch(/not found/);
    const joined = joinAsParent(desk, { code: "NEST-18", parentUid: "pat", children: [mia], consent: true });
    expect(joined.error).toBeNull();
    expect(parentChildren(joined.desk, "pat").map((child) => child.name)).toEqual(["Mia"]);
    expect(parentChildren(joined.desk, "sam")).toEqual([]);
    expect(canReadChild(parent, childAccess({ parentUid: "pat", consented: true }))).toBe(true);
    expect(canReadChild(parent, childAccess({ parentUid: "pat", consented: false }))).toBe(false);
    expect(joinAsParent(joined.desk, { code: "NEST-18", parentUid: "sam", children: [mia], consent: true }).error).toMatch(/another parent/);
    expect(JSON.stringify(joined.writes)).not.toMatch(/photo|lastName/);
  });

  it("links a classroom device only for that class teacher", () => {
    expect(linkDevice(desk, { code: "bunny-42", teacherUid: "tea" }).desk.deviceLink).toEqual({
      schoolId: "s1",
      classId: "c1",
      code: "BUNNY-42",
    });
    expect(linkDevice(desk, { code: "BUNNY-42", teacherUid: "pat" }).error).toMatch(/not found/);
    expect(linkDevice(desk, { code: "BUNNY-42", teacherUid: "ada" }).error).toMatch(/not found/);
  });
});

describe("stage 2 providers stay unwired", () => {
  it("signs in with Apple, Google, and email only", async () => {
    expect(activeProviders()).toEqual(["apple", "google", "email"]);
    expect(futureProviders()).toEqual(["clever", "classlink", "microsoft", "saml"]);
    await expect(signInWithProvider("clever", [])).rejects.toThrow(/not available yet/);
    await expect(signInWithProvider("saml", [])).rejects.toThrow(/not available yet/);
    let used = "";
    await signInWithProvider("google", [{ id: "google", label: "Sign in with Google", signIn: async () => { used = "google"; } }]);
    expect(used).toBe("google");
  });

  it("keeps school previews out of production", () => {
    expect(readPreview(false, "school-admin")).toBeNull();
    expect(readPreview(true, "school-teacher")).toBe("school-teacher");
    expect(readPreview(true, "school-parent")).toBe("school-parent");
    expect(readPreview(true, "on")).toBeNull();
  });
});

describe("firestore rules match the access decisions", () => {
  const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
  const children = rules.slice(
    rules.indexOf("match /schools/{schoolId}/classes/{classId}/children/{childId}"),
    rules.indexOf("match /schools/{schoolId}/classes/{classId}/parents/{parentUid}"),
  );

  it("lets a teacher or a consenting parent read a child, and not a director", () => {
    expect(children).toMatch(/teaches\(schoolId, classId\)/);
    expect(children).toMatch(/parentUid == request\.auth\.uid/);
    expect(children).toMatch(/consented == true/);
    expect(children).toMatch(/noPhoto\(\)/);
    expect(children).not.toMatch(/isAdmin/);
  });

  it("blocks listing class codes and keeps each grown-up backup private", () => {
    expect(rules).toMatch(/match \/classCodes\/\{code\} \{[\s\S]*?allow list: if false;/);
    expect(rules).toMatch(/match \/parentCodes\/\{code\} \{[\s\S]*?allow list: if false;/);
    expect(rules).toMatch(/function noPhoto\(\)/);
    expect(rules).toMatch(/match \/grownups\/\{uid\} \{\s*allow read, write: if signedIn\(\) && request\.auth\.uid == uid;/);
    expect(rules).not.toMatch(/firebase\/analytics|getAnalytics|admob/i);
  });

  it("does not import analytics in the school writer", () => {
    const writer = readFileSync(new URL("./firebaseSchool.ts", import.meta.url), "utf8");
    expect(writer).not.toMatch(/firebase\/analytics|getAnalytics|gtag|admob/i);
  });
});
