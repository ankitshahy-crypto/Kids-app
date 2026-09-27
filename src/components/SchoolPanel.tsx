import { useState } from "react";
import { CONSENT_TEXT } from "../data/aggregates";
import { ClassMetrics } from "./ClassMetrics";
import { PRODUCT_SHORT } from "../brand";
import type { ChildProfile } from "../data/profiles";
import { lessonName } from "../data/profiles";
import { animals } from "../data/animals";
import { qrMatrix } from "../auth/qr";
import type { RosterCommand } from "../auth/useGrownupAccount";
import {
  adminTotals,
  codeLink,
  codesFromHref,
  inviteState,
  parentChildren,
  readingMinutesLabel,
  teacherClasses,
  type ClassChild,
  type SchoolClass,
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
  onRoster,
  onAcceptInvite,
  onShowExplore,
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
  onRoster: (action: RosterCommand) => void;
  onAcceptInvite: (code: string) => void;
  onShowExplore: (on: boolean) => void;
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
        onRoster={onRoster}
        onShowExplore={onShowExplore}
      />
    );
  }
  if (role === "teacher") {
    return (
      <TeacherSchool
        desk={desk}
        uid={uid}
        onCreateClass={onCreateClass}
        onLinkDevice={onLinkDevice}
        onRoster={onRoster}
        onAcceptInvite={onAcceptInvite}
      />
    );
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
  onRoster,
  onShowExplore,
}: {
  desk: SchoolDesk;
  uid: string;
  onCreateSchool: (name: string) => void;
  onInvite: (email: string) => void;
  onRemoveTeacher: (uid: string) => void;
  onCancelInvite: (inviteId: string) => void;
  onRoster: (action: RosterCommand) => void;
  onShowExplore: (on: boolean) => void;
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
      <fieldset className="setting-group" data-setting="school-explore">
        <legend>Show Explore sections</legend>
        <div className="segment">
          <button type="button" className={desk.showExplore !== false ? "is-selected" : ""} aria-pressed={desk.showExplore !== false} onClick={() => onShowExplore(true)}>
            On
          </button>
          <button type="button" className={desk.showExplore === false ? "is-selected" : ""} aria-pressed={desk.showExplore === false} onClick={() => onShowExplore(false)}>
            Off
          </button>
        </div>
        <p className="adult-copy">On for the school unless you turn it off. Reading stays available.</p>
      </fieldset>
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
            <li key={member.uid} className="school-row" data-invite-state="accepted">
              <span>
                {member.email}
                <span className="school-status">Accepted</span>
              </span>
              <button type="button" className="account-delete-quiet" onClick={() => onRemoveTeacher(member.uid)}>
                Remove
              </button>
            </li>
          ))}
        {desk.invites.map((invite) => {
          const state = inviteState(invite);
          const link = codeLink(window.location.href, "teacher", invite.code);
          return (
            <li key={invite.id} className="school-row" data-invite={invite.id} data-invite-state={state}>
              <div className="school-invite">
                {invite.email}
                <span className="school-code">{invite.code}</span>
                <span className="school-status">{stateLabel(state)}</span>
                <span className="school-link" data-invite-link>
                  {link}
                </span>
                <QrMark text={link} label={`QR code ${invite.code}`} />
              </div>
              <span className="school-actions">
                {state !== "accepted" ? (
                  <button type="button" className="account-email-new" onClick={() => onRoster({ type: "resend-invite", inviteId: invite.id })}>
                    Resend invite
                  </button>
                ) : null}
                <button type="button" className="account-delete-quiet" onClick={() => onCancelInvite(invite.id)}>
                  Remove
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {desk.classes.length > 0 ? (
        <div data-roster="admin">
          {desk.classes.map((room) => (
            <ClassCard key={room.id} room={room} canMove canAdd={false} classes={desk.classes} onRoster={onRoster} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TeacherSchool({
  desk,
  uid,
  onCreateClass,
  onLinkDevice,
  onRoster,
  onAcceptInvite,
}: {
  desk: SchoolDesk;
  uid: string;
  onCreateClass: (name: string) => void;
  onLinkDevice: (code: string) => void;
  onRoster: (action: RosterCommand) => void;
  onAcceptInvite: (code: string) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState(() => codesFromHref(window.location.href).classCode);
  const [inviteCode, setInviteCode] = useState(() => codesFromHref(window.location.href).teacher);
  const classes = teacherClasses(desk, uid);

  if (!desk.school) {
    return (
      <form
        className="school-form"
        onSubmit={(event) => {
          event.preventDefault();
          onAcceptInvite(inviteCode);
        }}
      >
        <h3>School</h3>
        <p className="adult-copy">Ask your director for an invite code. Then sign in with that email.</p>
        <label htmlFor="teacher-code">Teacher invite code</label>
        <input
          id="teacher-code"
          value={inviteCode}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => setInviteCode(event.target.value)}
        />
        <button type="submit" className="account-email-go">
          Join school
        </button>
      </form>
    );
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
      <div data-roster="teacher">
        {classes.map((room) => (
          <div key={room.id}>
            <ClassCard room={room} canMove={false} canAdd classes={classes} onRoster={onRoster} />
            <ClassMetrics linked={room.children.filter((child) => child.consented && child.parentUid).length} />
          </div>
        ))}
      </div>
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
  const [code, setCode] = useState(() => codesFromHref(window.location.href).parent);
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
          <span data-consent="class">{CONSENT_TEXT}</span>
        </label>
        <button type="submit" className="account-email-go" disabled={!consent}>
          Join class
        </button>
      </form>
    </div>
  );
}

function ClassCard({
  room,
  canMove,
  canAdd,
  classes,
  onRoster,
}: {
  room: SchoolClass;
  canMove: boolean;
  canAdd: boolean;
  classes: SchoolClass[];
  onRoster: (action: RosterCommand) => void;
}) {
  const [childName, setChildName] = useState("");
  const [animal, setAnimal] = useState("fox");
  const link = codeLink(window.location.href, "class", room.code);
  const codeState = inviteState({ expiresAt: room.codeExpiresAt });
  return (
    <article className="school-card" data-class-code={room.code} data-code-state={codeState}>
      <h3>{room.name}</h3>
      <p className="school-code">
        {room.code}
        <span className="school-status">{stateLabel(codeState)}</span>
      </p>
      <QrMark text={link} label={`QR code ${room.code}`} />
      <p className="school-link">{link}</p>
      <button type="button" className="account-email-new" onClick={() => onRoster({ type: "regen-class", classId: room.id })}>
        New class code
      </button>
      <ul className="school-list">
        {room.children.map((child) => (
          <ChildRow key={child.id} room={room} child={child} canMove={canMove} classes={classes} onRoster={onRoster} />
        ))}
      </ul>
      {canAdd ? (
        <form
          className="school-form"
          onSubmit={(event) => {
            event.preventDefault();
            onRoster({ type: "add-child", classId: room.id, name: childName, animal });
            setChildName("");
          }}
        >
          <label htmlFor={`child-name-${room.id}`}>Child first name</label>
          <input id={`child-name-${room.id}`} value={childName} onChange={(event) => setChildName(event.target.value)} />
          <div className="segment">
            {animals.map((item) => (
              <button key={item.id} type="button" className={animal === item.id ? "is-selected" : ""} onClick={() => setAnimal(item.id)}>
                {item.name}
              </button>
            ))}
          </div>
          <button type="submit" className="account-email-go">
            Add child
          </button>
        </form>
      ) : null}
    </article>
  );
}

function ChildRow({
  room,
  child,
  canMove,
  classes,
  onRoster,
}: {
  room: SchoolClass;
  child: ClassChild;
  canMove: boolean;
  classes: SchoolClass[];
  onRoster: (action: RosterCommand) => void;
}) {
  const state = child.consented && child.parentUid ? "accepted" : inviteState({ expiresAt: child.parentCodeExpiresAt });
  const link = child.parentCode ? codeLink(window.location.href, "parent", child.parentCode) : "";
  return (
    <li data-child={child.id} data-parent-state={state}>
      {child.name}, {child.animal}, {child.stars} stars, {readingMinutesLabel(child.readingMs)}, {child.path}, starts at {child.startingLesson}
      <p className="school-code">{child.parentCode}</p>
      <p className="school-status">{stateLabel(state)}</p>
      {link ? <QrMark text={link} label={`QR code ${child.parentCode}`} /> : null}
      <TakeHome name={child.name} animal={child.animal} code={child.parentCode} link={link} />
      <div className="school-actions">
        <button type="button" className="account-email-new" onClick={() => onRoster({ type: "regen-parent", classId: room.id, childId: child.id })}>
          New parent code
        </button>
        <button type="button" className="account-delete-quiet" onClick={() => onRoster({ type: "cancel-parent", classId: room.id, childId: child.id })}>
          Cancel invite
        </button>
        {child.parentUid ? (
          <button type="button" className="account-delete-quiet" onClick={() => onRoster({ type: "unlink-parent", classId: room.id, childId: child.id })}>
            Remove parent
          </button>
        ) : null}
        <button type="button" className="account-delete-quiet" onClick={() => onRoster({ type: "remove-child", classId: room.id, childId: child.id })}>
          Remove child
        </button>
        {canMove
          ? classes
              .filter((item) => item.id !== room.id)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="account-email-new"
                  onClick={() => onRoster({ type: "move-child", childId: child.id, fromClassId: room.id, toClassId: item.id })}
                >
                  {`Move to ${item.name}`}
                </button>
              ))
          : null}
      </div>
    </li>
  );
}

function TakeHome({ name, animal, code, link }: { name: string; animal: string; code: string; link: string }) {
  if (!code || !link) return null;
  return (
    <div className="print-root" data-paper="letter">
      <button type="button" className="print-button no-print" onClick={() => window.print()}>
        Print take-home sheet
      </button>
      <article className="print-sheet take-home" data-sheet="take-home">
        <p className="take-home-brand">{PRODUCT_SHORT}</p>
        <h3>Come learn with us</h3>
        <p>
          {name} the {animal} is in class.
        </p>
        <QrMark text={link} label={`QR code ${code}`} />
        <p className="school-code">{code}</p>
        <ol>
          <li>A grown-up opens LittleNest.</li>
          <li>Open Grown-ups, then Account.</li>
          <li>Enter this code, or scan the square.</li>
          <li>Agree before anything is shared.</li>
        </ol>
        <p>Kids never log in. A child taps their animal.</p>
      </article>
    </div>
  );
}

function QrMark({ text, label }: { text: string; label: string }) {
  let modules: boolean[][] = [];
  try {
    modules = qrMatrix(text);
  } catch {
    return null;
  }
  const size = modules.length;
  const cells = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (modules[y]?.[x]) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  }
  return (
    <svg className="qr-mark" role="img" aria-label={label} viewBox={`-4 -4 ${size + 8} ${size + 8}`}>
      <rect x="-4" y="-4" width={size + 8} height={size + 8} fill="#fff" />
      <g fill="#1c1c1e">{cells}</g>
    </svg>
  );
}

function stateLabel(state: string): string {
  if (state === "accepted") return "Accepted";
  if (state === "expired") return "Expired";
  return "Pending";
}
