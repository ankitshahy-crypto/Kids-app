# School data flow

Status: design for owner approval. No sign-in, school, or metrics code ships until this document is approved and the feature is rebuilt from it. The current preview branch is not the implementation.

This describes how a grown-up account, a class, and class totals move between devices. Kid activities stay on the device.

## Names

A child's first name is kept in the parent's own backup document, `grownups/{uid}`, and nowhere else on the server. It is never written to a school document, a class document, a class child document, or a session document.

A child record that a school or class can read uses an animal name or a single initial. It does not contain a first name. Session documents do not contain a name of any kind.

The consent sentence, used exactly, is: practice days, active minutes, and session length, as class totals, with no names.

If the parent does not agree to that sentence, the app writes no session document and does not link the child to the class.

## What stays on the device

Profiles, letters, stars, outfits, stickers, and recordings stay in `localStorage` on the device until a grown-up turns on backup. The server then stores:

- the grown-up account
- that parent's backup at `grownups/{uid}`
- class membership
- per-child session totals

## Sign-in

Web sign-in uses a popup on every screen width until a custom domain exists and the app is served from Firebase Hosting. A redirect through `firebaseapp.com` on the GitHub Pages host is not used, including on narrow screens.

After sign-in, the client subscribes with `onSnapshot`. It does not build the desk from a local school cache.

1. Read `directory/{uid}` to find the school id.
2. If that document is missing, the desk is empty.
3. Otherwise subscribe to that school, then to `members`, `invites`, `classes`, and `children`.
4. The desk on screen is the snapshot. The only cache is the last snapshot, shown while the network is down, and it is replaced when the next snapshot arrives.

## Writes

School writes that belong together use one `writeBatch`. A parent join does not write a class document or a child document. Security rules reject those writes from a parent. They stay limited to a teacher or an admin.

A parent submits a pending join request. A teacher approves it. Approval is the one batch that links the child to the class. If the batch fails, nothing from that request is left half-applied.

## Join codes

Codes are at least 8 characters, drawn from an alphabet of about 30 characters. A short word plus a short number is not a code. That pattern is only a few hundred values and is rejected.

The client does not read codes. Security rules deny both `get` and `list` on `inviteCodes`, `classCodes`, and `parentCodes`. The client does not query those collections.

Lookup goes through a callable Cloud Function:

- The function checks the code, rejects unknown codes, and checks for a global collision before a code is saved.
- Rate limiting happens on the server. It is not a counter stored where the client can delete it, and deleting local storage does not reset it.
- The function returns only the class the code belongs to, not a directory of codes.

## Class totals

There is no `classTotals` document. A parent does not write one, and neither does the teacher client.

A parent writes that child's own session document at `schools/{schoolId}/classes/{classId}/children/{childId}/sessions`. The security rule allows the write only when `parentUid` is the signed-in user. The document holds practice days, active minutes, and session length. It does not hold a name.

The teacher client reads those session documents and aggregates them in memory. Totals are shown only when at least 5 families are in the aggregate. Below that floor, the teacher sees that there is not enough data, not a number that could identify one child.

Session writes and backup writes of `grownups/{uid}` are debounced the same way: at least 30 seconds, or only when a star total or the practice day changes. A one-second reading flush is not used. A backup debounce of under a second is not used.

## Backup and account deletion

`grownups/{uid}` is readable and writable only by that parent. It is the only server document that may hold a child's first name. School and class documents never receive a copy of it.

Deleting a child on the device records a tombstone for that child id inside the backup. Merging two backups keeps a tombstoned child deleted. A merge must not recreate a child that was removed.

Deleting the auth user runs an Auth `onDelete` Cloud Function. The function removes that user's `grownups/{uid}`, `directory/{uid}`, `schools/*/parents/{uid}`, `schools/*/classes/*/parents/{uid}`, `schools/*/members/{uid}`, and `parentUid` fields that point at the deleted user. The client does not leave those documents behind after `deleteUser`.

## iOS class link

The app does not redirect the browser to `littlenest://join`.

- `Info.plist` declares the URL scheme with `CFBundleURLTypes`.
- Sign in with Apple is covered by an entitlements file.
- The page shows a control that opens the app when tapped.
- `GoogleService-Info.plist` is a local setup file for a later native build. It is not committed.
- The Firebase native plugin stays out of `Package.swift` until sign-in is turned on. This design does not add it.

## Emulator test plan

Sign-in and schools stay off in the app until this document is approved. The rebuilt feature is tested in one Firebase emulator with two auth users, a teacher and a parent, plus rules unit tests. It is not tested as two emulator projects, and it is not tested against a dev-only in-memory fake.

1. Teacher creates a school and a class. Parent signs in on the other client and sees an empty desk until a snapshot includes them. A missing `directory/{uid}` does not fall back to a saved school cache.
2. Parent submits a join request with a code. The callable enforces the rate limit, and the limit still holds after local storage is deleted. A second client cannot `get` or `list` codes.
3. Creating a code that already exists fails the global collision check. A code shorter than 8 characters, including a short word plus a short number, is rejected.
4. Teacher approval writes the membership in one batch. A rules test shows the parent still cannot write the class or child documents directly.
5. A rules test allows a first name only on `grownups/{uid}` and rejects a first name on the school, the class, the child, and the session document.
6. After consent, the parent writes a session document. A rules test rejects a write whose `parentUid` is someone else, and rejects any write to `classTotals`. Refusing consent writes no session document.
7. The teacher aggregate hides numbers when fewer than 5 families have sessions, and shows totals at 5 or more. The payload has no child first name.
8. Session writes and backup writes do not fire on a one-second timer. A test advances the clock and expects a write only after 30 seconds, or when the star count or the day changes.
9. Deleting a child writes a tombstone. Merging the backup does not bring that child back.
10. Deleting the auth user runs the `onDelete` function. The membership documents and `grownups/{uid}` are gone.
11. Web sign-in in the emulator uses the popup path at every width. The iOS test taps the open-in-app control and does not auto-redirect. It does not expect the Firebase plugin in `Package.swift`.

## Out of scope until approval

Do not add Firebase env vars, school screens that call the network, class QR redirects, the Firebase native plugin, or metrics sync. Kid activities, the on-device grown-up PIN, and the Explore sections do not depend on this document.
