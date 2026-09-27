# School data flow

Status: design for owner approval. No sign-in, school, or metrics code ships until this document is approved and the feature is rebuilt from it. The current preview branch is not the implementation.

This describes how a grown-up account, a class, and class totals move between devices. Kid activities stay on the device.

## Names

A child's first name lives only in the parent's own backup document, `grownups/{uid}`. It is never written to a school document or a class document.

A school or class record uses an animal name or a single initial. A session document does not contain a name. The consent sentence, used exactly, is: practice days, active minutes, and session length, as class totals, with no names.

If the parent does not agree to that sentence, the app writes no request and no session document, and it does not link the child to the class.

## What stays on the device

Profiles, letters, stars, outfits, stickers, and recordings stay in `localStorage` on the device until a grown-up turns on backup. Stars are not synced. The server then stores:

- the grown-up account
- that parent's backup at `grownups/{uid}`
- class membership
- one day document per linked child
- class totals maintained on the server

## Sign-in

Web sign-in uses a popup on every screen width until a custom domain exists and the app is served from Firebase Hosting. A redirect through `firebaseapp.com` on the GitHub Pages host is not used, including on narrow screens.

After sign-in, the client subscribes with `onSnapshot`. It does not build the desk from a local school cache.

1. Read `directory/{uid}` to find the school id.
2. If that document is missing, the desk is empty.
3. Subscribe by role, as below.
4. The desk on screen is the snapshot. The only cache is the last snapshot, shown while the network is down, and it is replaced when the next snapshot arrives.

### Role-scoped reads

- **Admin.** Subscribes to everything in the school: members, invites, classes, children, requests, sessions, and totals.
- **Teacher.** Subscribes to their own classes and the children in those classes, and to `classes/{c}/totals` for those classes. The rules deny a teacher read of session documents.
- **Parent.** Subscribes to children where `parentUid == uid`, to the class documents they are linked to, and to their own request documents. Parents never subscribe to `members` or `invites`.

## Pending request

The request path is `schools/{s}/classes/{c}/requests/{uid}`. There is one request per child. The document holds the child's avatar, an initial or animal name, a `consented` flag, and a timestamp. It does not hold a first name.

The callable validates the code and writes the request itself. The client never writes a request. The rules never trust a class id supplied by the client. The callable resolves the class from the code.

Approval is one `writeBatch`:

- the child link on the class roster
- both parents documents, `schools/{s}/parents/{uid}` and `schools/{s}/classes/{c}/parents/{uid}`
- the delete of the request

If the batch fails, nothing from that approval is left half-applied. A parent still cannot write a class document or a child document. Those writes stay limited to a teacher or an admin, inside this batch.

## Identity mapping

The home device has its own profile id. The server has a roster child id. Those ids are not the same.

Approval returns the server child id. The parent device stores that link per child. Session documents are written under the server child id. One request per child.

## Session day document

The day document is `schools/{s}/classes/{c}/children/{childId}/sessions/{YYYY-MM-DD}`, where `{childId}` is the server roster id. It holds `minutes` and `sessionLengths`. It is written with `setDoc` and merge. It does not hold a name, and it does not hold a star total.

The security rule allows the write only when all of these are true:

- `parentUid == uid`
- `consented == true`
- `hasOnly(['parentUid', 'consented', 'minutes', 'sessionLengths'])`
- `minutes` and each value in `sessionLengths` are bounded integers

### Retention

Sessions are deleted after the school year or 90 days, whichever comes first. That written window is the retention policy. The amended COPPA rule requires a written retention policy.

Unlink deletes that child's session documents. Account deletion does that cleanup as well, for every child linked to the deleted user.

## Class totals

A Cloud Function runs on session writes and maintains `classes/{c}/totals`. The document carries a `linkedFamilies` count. The function writes the total numbers only when `linkedFamilies` is 5 or more. Below that floor the count is present and the numbers are not, so a small class cannot be read back as one child's time.

The rules deny teachers reading session documents. Teachers and admins read `classes/{c}/totals`. Those class totals are also the school-level pilot numbers. A pilot reads the totals documents and does not read session documents.

The client does not aggregate sessions, and the client does not write `classes/{c}/totals`.

## Debounce

Stars are not synced. A new star does not flush a day document and does not flush the backup.

The day document and the backup at `grownups/{uid}` flush on the same schedule:

- when the practice day changes
- when the app is hidden
- at most once per 60 seconds while the app is active

A one-second reading flush is not used.

## Join codes

Codes are at least 8 characters, drawn from an alphabet of about 30 characters. A short word plus a short number is not a code. That pattern is only a few hundred values and is rejected.

Every code expires after 14 days. A parent code is single-use. After it has been used once, it cannot be used again.

Who may regenerate a code:

- An admin regenerates a teacher invite code.
- The class teacher or an admin regenerates a class code or a parent code.

The client does not read codes. Security rules deny both `get` and `list` on `inviteCodes`, `classCodes`, and `parentCodes`. The client does not query those collections.

Lookup goes through a callable Cloud Function:

- The function checks the code, rejects unknown codes, and checks for a global collision before a code is saved.
- Rate limiting happens on the server. It is not a counter stored where the client can delete it, and deleting local storage does not reset it.
- For a parent code, the function returns the class name plus the roster child's avatar and initial, and nothing more.
- The function does not return a directory of codes.

## Backup and account deletion

`grownups/{uid}` is readable and writable only by that parent. The security rule also applies `noPhoto()` and a key allowlist. `noPhoto()` rejects `photo`, `photoSrc`, `image`, `picture`, `avatarUrl`, `lastName`, and `email`. The allowlist is the backup keys only: profiles (including the first name), tombstones, and the backup timestamp. Any other key is rejected.

This document is the only server document that may hold a child's first name. School and class documents never receive a copy of it.

Deleting a child on the device records a tombstone for that child id inside the backup. Merging two backups keeps a tombstoned child deleted. A merge must not recreate a child that was removed.

Deleting the auth user runs an Auth `onDelete` Cloud Function. The function removes that user's `grownups/{uid}`, `directory/{uid}`, `schools/*/parents/{uid}`, `schools/*/classes/*/parents/{uid}`, `schools/*/members/{uid}`, `parentUid` fields that point at the deleted user, and the session documents for each linked child. The client does not leave those documents behind after `deleteUser`.

## iOS class link

The app does not redirect the browser to `littlenest://join`.

- `Info.plist` declares the URL scheme with `CFBundleURLTypes`.
- Sign in with Apple is covered by an entitlements file.
- The page shows a control that opens the app when tapped.
- `GoogleService-Info.plist` is a local setup file for a later native build. It is not committed.
- The Firebase native plugin stays out of `Package.swift` until sign-in is turned on. This design does not add it.

## Emulator test plan

Sign-in and schools stay off in the app until this document is approved. The rebuilt feature is tested with two auth users, a teacher and a parent, in one Firebase emulator. Rules tests use `@firebase/rules-unit-testing` and run in CI with `firebase emulators:exec`. The suite is not two emulator projects, and it is not a dev-only in-memory fake.

1. Teacher creates a school and a class. Parent signs in on the other client and sees an empty desk until a snapshot includes them. A missing `directory/{uid}` does not fall back to a saved school cache.
2. Role-scoped reads. An admin read of members, invites, classes, children, and totals succeeds. A teacher read of another teacher's class fails. A teacher read of a session document is denied. A parent read succeeds for a child with `parentUid == uid`, for a class document they are linked to, and for their own request. A parent read of `members` or `invites` is denied.
3. Pending request. The callable writes `schools/{s}/classes/{c}/requests/{uid}` with the avatar, an initial or animal name, `consented`, and a timestamp. A client write of that request is denied. A client-supplied class id is ignored. Approval is one batch that writes the child link, both parents documents, and deletes the request. One request per child. Approval returns the server child id, and later session writes use that id, not the device profile id.
4. Codes. The callable enforces the rate limit, and the limit still holds after local storage is deleted. A second client cannot `get` or `list` codes. A colliding code is rejected. A code shorter than 8 characters, including a short word plus a short number, is rejected. A code older than 14 days is rejected. A parent code fails on the second use. An admin can regenerate a teacher invite. A class teacher or an admin can regenerate a class code or a parent code. A parent-code response is the class name, the roster child's avatar, and the initial, and nothing more.
5. Session rules. After consent, `setDoc` merge writes `sessions/{YYYY-MM-DD}` with `minutes` and `sessionLengths`. The rules reject a write whose `parentUid` is someone else, a write with `consented` false, a key outside `hasOnly(['parentUid', 'consented', 'minutes', 'sessionLengths'])`, and an integer outside the bound. Refusing consent writes no request and no session. A session past the school year, or past 90 days, whichever comes first, is deleted. Unlink deletes that child's sessions.
6. Server totals. A session write updates `classes/{c}/totals` and its `linkedFamilies` count. Below 5 the numbers are absent. At 5 or more the numbers are present. A teacher read of the session documents is denied. A client write of the totals document is denied. The numbers contain no child first name. The same totals documents are what a school-level pilot reads.
7. Debounce. A new star does not flush the day document or the backup. A test advances the clock and expects a flush when the day changes, when the app is hidden, and at most once per 60 seconds while the app is active.
8. Backup rules. A first name is allowed only on `grownups/{uid}`. The same rules test rejects a first name on the school, the class, the child, the request, and the session document. `grownups/{uid}` rejects a photo field and rejects a key outside the allowlist. Deleting a child writes a tombstone, and merging the backup does not bring that child back.
9. Deleting the auth user runs `onDelete`. The membership documents, the linked session documents, and `grownups/{uid}` are gone.
10. Web sign-in in the emulator uses the popup path at every width. The iOS test taps the open-in-app control and does not auto-redirect. It does not expect the Firebase plugin in `Package.swift`.

## Out of scope until approval

Do not add Firebase env vars, school screens that call the network, class QR redirects, the Firebase native plugin, or metrics sync. Kid activities, the on-device grown-up PIN, and the Explore sections do not depend on this document.
