import { useState } from "react";
import type { ChildProfile } from "../data/profiles";
import { lessonName } from "../data/profiles";
import {
  adminTotals,
  inviteLink,
  parentChildren,
  readingMinutesLabel,
  teacherClasses,
  type SchoolDesk,
  type SchoolRole,
} from "../auth/school";

export function SchoolPanel({
  role,
  desk,
  uid,
  email,
  profiles,
  onCreateSchool,
  onInvite,
  onRemoveTeacher,
  onCancelInvite,
  onCreateClass,
  onLinkDevice,
  onJoin,
}: {
  role: SchoolRole;
  desk: SchoolDesk;
  uid: string;
  email: string | null;
  profiles: ChildProfile[];
  onCreateSchool: (name: string) => void;
  onInvite: (email: string) => void;
  onRemoveTeacher: (uid: string) => void;
  onCancelInvite: (inviteId: string) => void;
  onCreateClass: (name: string) => void;
  onLinkDevice: (code: string) => void;
  onJoin: (code: string, consent: boolean, childIds: string[]) => void;
}) {
  if (role === "admin") {
    return (
      <AdminSchool
        desk={desk}
        uid={uid}
        onCreateSchool={onCreateSchool}
        onInvite={onInvite}
        onRemoveTeacher={onRemoveTeacher}
        onCancelInvite={onCancelInvite}
      />
    );
  }
  if (role === "teacher") {
    return <TeacherSchool desk={desk} uid={uid} onCreateClass={onCreateClass} onLinkDevice={onLinkDevice} />;
  }
  return <ParentSchool desk={desk} uid={uid} email={email} profiles={profiles} onJoin={onJoin} />;
}

function AdminSchool({
  desk,
  uid,
  onCreateSchool,
  onInvite,
  onRemoveTeacher,
  onCancelInvite,
}: {
  desk: SchoolDesk;
  uid: string;
  onCreateSchool: (name: string) => void;
  onInvite: (email: string) => void;
  onRemoveTeacher: (uid: string) => void;
  onCancelInvite: (inviteId: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const totals = adminTotals(desk, uid);

  if (!desk.school || !totals) {
    return (
      <form
        className="school-form"
        onSubmit={(event) => {
          event.preventDefault();
          onCreateSchool(name);
        }}
      >
        <h3>School</h3>
        <label htmlFor="school-name">School name</label>
        <input id="school-name" value={name} autoComplete="organization" onChange={(event) => setName(event.target.value)} />
        <button type="submit" className="account-email-go">
          Create school
        </button>
      </form>
    );
  }

  return (
    <div className="school-card" data-school={totals.name}>
      <h3>{totals.name}</h3>
      <p className="adult-copy">
        {totals.teacherCount === 1 ? "1 teacher" : `${totals.teacherCount} teachers`}.{" "}
        {totals.classCount === 1 ? "1 class" : `${totals.classCount} classes`}. {totals.childCount} children. {totals.totalStars}{" "}
        stars. {readingMinutesLabel(totals.totalReadingMs)} of reading.
      </p>
      <ul className="school-list">
        {totals.classes.map((room) => (
          <li key={room.name}>
            {room.name}: {room.childCount} children, {room.totalStars} stars, {readingMinutesLabel(room.totalReadingMs)}
          </li>
        ))}
      </ul>
      <form
        className="school-form"
        onSubmit={(event) => {
          event.preventDefault();
          onInvite(email);
          setEmail("");
        }}
      >
        <label htmlFor="teacher-email">Teacher email</label>
        <input id="teacher-email" type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} />
        <button type="submit" className="account-email-new">
          Invite teacher
        </button>
      </form>
      <ul className="school-list">
        {desk.members
          .filter((member) => member.role === "teacher")
          .map((member) => (
            <li key={member.uid} className="school-row">
              <span>{member.email}</span>
              <button type="button" className="account-delete-quiet" onClick={() => onRemoveTeacher(member.uid)}>
                Remove
              </button>
            </li>
          ))}
        {desk.invites.map((invite) => (
          <li key={invite.id} className="school-row" data-invite={invite.id}>
            <span>
              {invite.email}
              <span className="school-link" data-invite-link>
                {inviteLink(window.location.href, desk.school?.id ?? "", invite.id)}
              </span>
            </span>
            <button type="button" className="account-delete-quiet" onClick={() => onCancelInvite(invite.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeacherSchool({
  desk,
  uid,
  onCreateClass,
  onLinkDevice,
}: {
  desk: SchoolDesk;
  uid: string;
  onCreateClass: (name: string) => void;
  onLinkDevice: (code: string) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const classes = teacherClasses(desk, uid);

  if (!desk.school) {
    return <p className="adult-copy">Ask your director for an invite link. Then sign in with that email.</p>;
  }

  return (
    <div data-school={desk.school.name}>
      <h3>{desk.school.name}</h3>
      <form
        className="school-form"
        onSubmit={(event) => {
          event.preventDefault();
          onCreateClass(name);
          setName("");
        }}
      >
        <label htmlFor="class-name">Class name</label>
        <input id="class-name" value={name} onChange={(event) => setName(event.target.value)} />
        <button type="submit" className="account-email-go">
          Create class
        </button>
      </form>
      {classes.map((room) => (
        <article key={room.id} className="school-card" data-class-code={room.code}>
          <h3>{room.name}</h3>
          <p className="school-code">{room.code}</p>
          <p className="adult-copy">Parent join code {room.parentCode}</p>
          <ul className="school-list">
            {room.children.map((child) => (
              <li key={child.id} data-child={child.id}>
                {child.name}, {child.animal}, {child.stars} stars, {readingMinutesLabel(child.readingMs)}, {child.path}, starts at{" "}
                {child.startingLesson}
              </li>
            ))}
          </ul>
        </article>
      ))}
      <form
        className="school-form"
        data-device-link={desk.deviceLink?.code ?? ""}
        onSubmit={(event) => {
          event.preventDefault();
          onLinkDevice(code);
        }}
      >
        <label htmlFor="class-code">Class code on this device</label>
        <input
          id="class-code"
          value={code}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => setCode(event.target.value)}
        />
        <button type="submit" className="account-email-new">
          Link this device
        </button>
        {desk.deviceLink ? <p className="adult-copy">This device is linked to {desk.deviceLink.code}.</p> : null}
      </form>
    </div>
  );
}

function ParentSchool({
  desk,
  uid,
  profiles,
  onJoin,
}: {
  desk: SchoolDesk;
  uid: string;
  email: string | null;
  profiles: ChildProfile[];
  onJoin: (code: string, consent: boolean, childIds: string[]) => void;
}) {
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [chosen, setChosen] = useState<string[]>(() => profiles.map((profile) => profile.id));
  const children = parentChildren(desk, uid);

  return (
    <div data-school={desk.school?.name ?? ""}>
      <h3>Your children</h3>
      {children.length === 0 ? <p className="adult-copy">No child is linked yet.</p> : null}
      <ul className="school-list">
        {children.map((child) => (
          <li key={child.id} data-child={child.id}>
            {child.name}, {child.animal}, {child.stars} stars, {readingMinutesLabel(child.readingMs)}, {child.path}, {child.className}
          </li>
        ))}
      </ul>
      <form
        className="school-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!consent) return;
          onJoin(code, true, chosen);
        }}
      >
        <label htmlFor="join-code">Join code from the teacher</label>
        <input
          id="join-code"
          value={code}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => setCode(event.target.value)}
        />
        {profiles.length === 0 ? <p className="adult-copy">Add a child on this device first.</p> : null}
        {profiles.map((profile) => (
          <label key={profile.id} className="school-check">
            <input
              type="checkbox"
              checked={chosen.includes(profile.id)}
              onChange={(event) => {
                setChosen((current) =>
                  event.target.checked ? [...current, profile.id] : current.filter((id) => id !== profile.id),
                );
              }}
            />
            <span>{lessonName(profile)}</span>
          </label>
        ))}
        <label className="school-check">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>I agree to share a first name or initial, the animal, and progress with this class.</span>
        </label>
        <button type="submit" className="account-email-go" disabled={!consent}>
          Join class
        </button>
      </form>
    </div>
  );
}
