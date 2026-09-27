import { useState } from "react";
import { PRODUCT_NAME } from "../brand";
import { ACCOUNT_OFF, ACCOUNT_ON_NOTE, ADMIN_NOTE, BACKUP_NOTE, KIDS_NEVER_LOGIN, PARENT_NOTE, SYNC_LABEL, TEACHER_NOTE } from "../auth/copy";
import type { GrownupUser } from "../auth/client";
import { activeProviders, providerLabel, signInWithProvider, type Stage1Adapter } from "../auth/providers";
import type { SchoolDesk, SchoolRole } from "../auth/school";
import type { RosterCommand } from "../auth/useGrownupAccount";
import type { ChildProfile } from "../data/profiles";
import { SchoolPanel } from "./SchoolPanel";

export function AccountPanel({
  configured,
  user,
  schoolRole,
  desk,
  profiles,
  sync,
  busy,
  error,
  notice,
  onApple,
  onGoogle,
  onEmailSignIn,
  onEmailCreate,
  onMagicLink,
  onSignOut,
  onSchoolRole,
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
  onSync,
  onDeleteData,
  onDeleteAccount,
}: {
  configured: boolean;
  user: GrownupUser | null;
  schoolRole: SchoolRole;
  desk: SchoolDesk;
  profiles: ChildProfile[];
  sync: boolean;
  busy: boolean;
  error: string | null;
  notice: string | null;
  onApple: () => void;
  onGoogle: () => void;
  onEmailSignIn: (email: string, password: string) => void;
  onEmailCreate: (email: string, password: string) => void;
  onMagicLink: (email: string) => void;
  onSignOut: () => void;
  onSchoolRole: (role: SchoolRole) => void;
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
  onSync: (on: boolean) => void;
  onDeleteData: () => void;
  onDeleteAccount: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState<"data" | "account" | null>(null);
  const providers = activeProviders();
  const adapters: Stage1Adapter[] = [
    { id: "apple", label: providerLabel("apple"), signIn: async () => onApple() },
    { id: "google", label: providerLabel("google"), signIn: async () => onGoogle() },
    { id: "email", label: providerLabel("email"), signIn: async () => onEmailSignIn(email, password) },
  ];

  return (
    <section className="adult-section" data-section="account" data-auth={configured ? "on" : "off"} data-signed-in={user ? "true" : "false"} data-role={schoolRole} data-sync={sync ? "on" : "off"} data-providers={providers.join(",")}>
      <h2>Account</h2>
      <p className="account-status">{user ? "Signed in" : "Not signed in"}</p>
      {user?.email ? <p className="adult-copy">{user.email}</p> : null}

      {!configured ? (
        <>
          {ACCOUNT_OFF.map((line) => (
            <p key={line} className="adult-copy">
              {line}
            </p>
          ))}
        </>
      ) : null}

      {configured && !user ? (
        <>
          <p className="adult-copy">{ACCOUNT_ON_NOTE}</p>
          <p className="adult-copy">{KIDS_NEVER_LOGIN}</p>
          <p className="adult-copy">{PRODUCT_NAME} does not ask for a card or a payment.</p>
          <div className="account-actions">
            {providers.includes("apple") ? (
              <button type="button" className="account-apple" disabled={busy} onClick={() => void signInWithProvider("apple", adapters)}>
                {providerLabel("apple")}
              </button>
            ) : null}
            {providers.includes("google") ? (
              <button type="button" className="account-google" disabled={busy} onClick={() => void signInWithProvider("google", adapters)}>
                {providerLabel("google")}
              </button>
            ) : null}
          </div>
          <form
            className="account-email"
            onSubmit={(event) => {
              event.preventDefault();
              void signInWithProvider("email", adapters);
            }}
          >
            <label htmlFor="grownup-email">Email</label>
            <input
              id="grownup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label htmlFor="grownup-password">Password</label>
            <input
              id="grownup-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button type="submit" className="account-email-go" disabled={busy}>
              Sign in with email
            </button>
            <button type="button" className="account-email-new" disabled={busy} onClick={() => onEmailCreate(email, password)}>
              Create account
            </button>
            <button type="button" className="account-magic" disabled={busy} onClick={() => onMagicLink(email)}>
              Email me a sign-in link
            </button>
          </form>
        </>
      ) : null}

      {configured && user ? (
        <>
          <p className="adult-copy">{KIDS_NEVER_LOGIN}</p>
          <fieldset className="setting-group">
            <legend>Account type</legend>
            <div className="segment segment-3">
              <button type="button" className={schoolRole === "parent" ? "is-selected" : ""} aria-pressed={schoolRole === "parent"} onClick={() => onSchoolRole("parent")}>
                Parent
              </button>
              <button type="button" className={schoolRole === "teacher" ? "is-selected" : ""} aria-pressed={schoolRole === "teacher"} onClick={() => onSchoolRole("teacher")}>
                Teacher
              </button>
              <button type="button" className={schoolRole === "admin" ? "is-selected" : ""} aria-pressed={schoolRole === "admin"} onClick={() => onSchoolRole("admin")}>
                School Admin
              </button>
            </div>
            <p className="adult-copy">{schoolRole === "teacher" ? TEACHER_NOTE : schoolRole === "admin" ? ADMIN_NOTE : PARENT_NOTE}</p>
          </fieldset>
          <SchoolPanel
            role={schoolRole}
            desk={desk}
            uid={user.uid}
            email={user.email}
            profiles={profiles}
            onCreateSchool={onCreateSchool}
            onInvite={onInvite}
            onRemoveTeacher={onRemoveTeacher}
            onCancelInvite={onCancelInvite}
            onCreateClass={onCreateClass}
            onLinkDevice={onLinkDevice}
            onJoin={onJoin}
            onRoster={onRoster}
            onAcceptInvite={onAcceptInvite}
            onShowExplore={onShowExplore}
          />
          <fieldset className="setting-group">
            <legend>{SYNC_LABEL}</legend>
            <div className="segment">
              <button type="button" className={sync ? "is-selected" : ""} aria-pressed={sync} onClick={() => onSync(true)}>
                On
              </button>
              <button type="button" className={!sync ? "is-selected" : ""} aria-pressed={!sync} onClick={() => onSync(false)}>
                Off
              </button>
            </div>
            <p className="adult-copy">{BACKUP_NOTE}</p>
          </fieldset>
          <div className="account-actions">
            <button type="button" className="account-sign-out" disabled={busy} onClick={onSignOut}>
              Sign out
            </button>
            {confirm === "data" ? (
              <button type="button" className="account-delete" disabled={busy} onClick={onDeleteData}>
                Yes, delete all data
              </button>
            ) : (
              <button type="button" className="account-delete account-delete-quiet" onClick={() => setConfirm("data")}>
                Delete all data
              </button>
            )}
            {confirm === "account" ? (
              <button type="button" className="account-delete" disabled={busy} onClick={onDeleteAccount}>
                Yes, delete the account
              </button>
            ) : (
              <button type="button" className="account-delete account-delete-quiet" onClick={() => setConfirm("account")}>
                Delete account
              </button>
            )}
          </div>
        </>
      ) : null}

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
    </section>
  );
}
