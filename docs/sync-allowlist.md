# Sync allowlist

Parent consent, when a family links a child from a class QR, uses this sentence and no other sharing promise:

practice days, active minutes, and session length, as class totals, with no names

Allowed class-link aggregates, keyed by an anonymous avatar id:

- practice days (active days per week)
- active minutes
- session lengths and the median
- last-active week

Not allowed: first names, photos, or audio.

Teacher and admin views read these class totals from Firestore only when at least 5 children in that class are linked. Below that, the app shows "Not enough families linked yet" and does not show per-family or per-child patterns.

Sync runs only when grown-up sign-in is configured. Server data for a class link is deleted on unlink or account deletion.
