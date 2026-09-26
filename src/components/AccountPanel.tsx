import { useState } from "react";
import { PRODUCT_NAME } from "../brand";
import { ACCOUNT_OFF, ACCOUNT_ON_NOTE, BACKUP_NOTE, KIDS_NEVER_LOGIN, SYNC_LABEL, TEACHER_NOTE } from "../auth/copy";
import type { GrownupUser } from "../auth/client";
import type { AccountRole } from "../auth/prefs";

export function AccountPanel({
  configured,
  user,
  role,
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
  onRole,
  onSync,
  onDeleteData,
  onDeleteAccount,
}: {
  configured: boolean;
  user: GrownupUser | null;
  role: AccountRole;
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
  onRole: (role: AccountRole) => void;
  onSync: (on: boolean) => void;
  onDeleteData: () => void;
  onDeleteAccount: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState<"data" | "account" | null>(null);

  return (
    <section className="adult-section" data-section="account" data-auth={configured ? "on" : "off"} data-signed-in={user ? "true" : "false"} data-role={role} data-sync={sync ? "on" : "off"}>
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
            <button type="button" className="account-apple" disabled={busy} onClick={onApple}>
              Sign in with Apple
            </button>
            <button type="button" className="account-google" disabled={busy} onClick={onGoogle}>
              Sign in with Google
            </button>
          </div>
          <form
            className="account-email"
            onSubmit={(event) => {
              event.preventDefault();
              onEmailSignIn(email, password);
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
            <div className="segment">
              <button type="button" className={role === "grownup" ? "is-selected" : ""} aria-pressed={role === "grownup"} onClick={() => onRole("grownup")}>
                Grown-up
              </button>
              <button type="button" className={role === "teacher" ? "is-selected" : ""} aria-pressed={role === "teacher"} onClick={() => onRole("teacher")}>
                Teacher
              </button>
            </div>
            <p className="adult-copy">{TEACHER_NOTE}</p>
          </fieldset>
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
