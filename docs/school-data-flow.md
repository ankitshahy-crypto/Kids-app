# School data flow

Status: design for owner approval. No sign-in, school, or metrics code ships until this document is approved and the feature is rebuilt from it. The current preview branch is not the implementation.

This describes how a grown-up account, a class, and class totals move between devices. Kid activities stay on the device. A child's first name is not stored on the server.

## What stays off the server

Profiles, letters, stars, outfits, stickers, and recordings stay in `localStorage` on the device. The server stores a grown-up account, class membership, and class totals. A child record on the server uses an animal name or a single initial. It does not use a first name.

The consent sentence, used exactly, is: practice days, active minutes, and session length, as class totals, with no names.

## Sign-in

Web sign-in uses a popup until a custom domain exists and the app is served from Firebase Hosting. A redirect through `firebaseapp.com` on the GitHub Pages host is not used, including on narrow screens.

After sign-in, the client subscribes with `onSnapshot`. It does not build the desk from a local cache alone.

1. Read `directory/{uid}` to find the school id.
2. Subscribe to that school, then to `members`, `invites`, `classes`, and `children`.
3. The desk on screen is the snapshot. A cache may show the last snapshot while the network is down, and it is replaced when the snapshot arrives.

## Writes

School writes that belong together use one `writeBatch`. A parent join does not write a class document or a child document. Those writes stay limited to a teacher or an admin.

A parent submits a pending join request. A teacher approves it. Approval is the write that links the child to the class. If the batch fails, nothing from that request is left half-applied.

## Join codes

Codes are at least 8 characters, drawn from an alphabet of about 30 characters (a number of similar length is also acceptable). The client does not list codes and does not query `classCodes`, `parentCodes`, or `inviteCodes` directly.

Lookup goes through a callable Cloud Function:

- The function checks the code, rejects unknown codes, and checks for a global collision before a code is saved.
- Rate limiting happens on the server. A client-side counter that a user can delete is not the limit.
- The function returns only the class the code belongs to, not a directory of codes.

## Class totals

Parents do not write `classTotals`. A parent writes that child's own session document at `children/{childId}/sessions`. The security rule allows the write only when `parentUid` is the signed-in user.

The document holds practice days, active minutes, and session length for that child. It does not hold a name.

The teacher client reads the session documents for the class and aggregates them. Totals are shown only when at least 5 families are in the aggregate. Below that floor, the teacher sees that there is not enough data, not a number that could identify one child.

Writes of those session totals are debounced: at least 30 seconds, or only when a star total or the practice day changes. A one-second timer is not used.

## Account deletion

Deleting the auth user runs an Auth `onDelete` Cloud Function. The function removes that user's `directory/{uid}`, `schools/*/parents/{uid}`, `classes/*/parents/{uid}`, `members/{uid}`, and `parentUid` fields that point at the deleted user. The client does not leave those documents behind after `deleteUser`.

## iOS class link

The app does not redirect the browser to `littlenest://join`.

- `Info.plist` declares the URL scheme with `CFBundleURLTypes`.
- Sign in with Apple is covered by an entitlements file.
- The page shows a control that opens the app when tapped.
- `GoogleService-Info.plist` is required for the native Firebase app and is documented as a local setup step. It is not committed. `FirebaseApp.configure()` is not reached in a build that does not have that file.
- The native project includes the Firebase auth plugin before anyone turns sign-in on.

## Emulator test plan

Sign-in and schools stay off in the app until this document is approved. The rebuilt feature is tested against the Firebase emulator, not a dev-only in-memory fake.

1. Two emulator projects, or two auth users in one emulator: a teacher and a parent on different clients.
2. Teacher creates a school and a class. Parent signs in on the other client and sees nothing until the snapshot includes them.
3. Parent submits a join request with a code. The callable enforces the rate limit. A second client cannot enumerate codes.
4. Creating a code that already exists fails the global collision check.
5. Teacher approval writes the membership in one batch. A rules test shows the parent still cannot write the class or child documents directly.
6. Parent writes a session document. A rules test rejects a write whose `parentUid` is someone else, and rejects a parent write to `classTotals`.
7. Teacher aggregate hides numbers when fewer than 5 families have sessions, and shows totals at 5 or more. The payload has no child first name.
8. Session writes do not fire on a one-second timer. A test advances the clock and expects a write only after 30 seconds, or when the star count or the day changes.
9. Deleting the auth user runs the `onDelete` function and the documents listed above are gone.
10. Web sign-in in the emulator uses the popup path. The iOS test taps the open-in-app control and does not auto-redirect.

## Out of scope until approval

Do not add Firebase env vars, school screens that call the network, class QR redirects, or metrics sync. Kid activities, the on-device grown-up PIN, and the Explore sections do not depend on this document.
