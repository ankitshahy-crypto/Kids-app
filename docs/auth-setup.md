# Grown-up sign-in setup

Sign-in is optional. Children never log in. They still tap their animal on the first screen. If you skip this guide, LittleNest keeps working with nothing stored online.

Use a **new** Firebase project that you create for LittleNest. Do not use `triagedesk-prod` or any project under `triagedesk.ai`. The app turns sign-in off if it sees that name.

You will need:

- A Google account that is not the TriageDesk production account
- An Apple Developer account (for Sign in with Apple)
- The LittleNest iPhone project on a Mac, when you are ready to ship the iPhone app

## 1. Create the Firebase project

1. Open [Firebase console](https://console.firebase.google.com/) and choose **Add project**.
2. Name it something like `littlenest-families`. Do not put `triagedesk` in the name.
3. Turn **off** Google Analytics when it asks. LittleNest does not use analytics.
4. Open **Build → Authentication → Get started**.
5. Open **Build → Firestore Database → Create database**. Start in **production mode**. Pick a region close to your families.

## 2. Turn on the three sign-in methods

In **Authentication → Sign-in method**, enable:

1. **Apple**
2. **Google**
3. **Email/Password** (turn on the password option; you can also turn on email link)

Apple is required on iPhone because Google is offered. That is Apple's rule 4.8. Leave Facebook, phone, and every other provider off.

### Google

1. Enable Google.
2. Set the support email to a grown-up address you control.
3. Save.

The website uses this automatically. No extra key is pasted into the website for Google.

### Email

1. Enable Email/Password.
2. Leave the password switch on.
3. Optional: turn on **Email link** as well. The app can send a sign-in link to the grown-up's email.

### Apple

You need an Apple **Services ID** for the website, and the iPhone app's bundle id for the installed app. The bundle id is `com.triagedesk.littlenest`.

1. Open [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list).
2. Open the App ID `com.triagedesk.littlenest` and turn on **Sign in with Apple**. Save.
3. Create a **Services ID** (for example `com.triagedesk.littlenest.web`). Turn on Sign in with Apple. Set the domain to your website domain and the return URL to:

   `https://YOUR-PROJECT.firebaseapp.com/__/auth/handler`

4. Create a **Key**, enable Sign in with Apple, and download the `.p8` file once. Note the Key ID and your Team ID.
5. Back in Firebase → Apple, paste the Services ID, Team ID, Key ID, and the contents of the `.p8` file. Save.

## 3. Tell Firestore who may read the backup

Open Firestore → **Rules**, replace the rules with the block below, and publish.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /grownups/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

A grown-up can read and write only their own backup. Nobody else can. The backup holds a first name or initial, an animal, an age range, stars, lesson progress, and grown-up settings. It does not hold photos.

## 4. Add the website to Firebase

In Authentication → Settings → **Authorized domains**, add:

- `localhost` (already there)
- Your GitHub Pages or other website host
- The Firebase domain `YOUR-PROJECT.firebaseapp.com`

## 5. Put the four values in the app

1. Firebase → Project settings → Your apps → **Add app → Web**.
2. Nickname it LittleNest Web. You do not need Hosting.
3. Copy the config into a file named `.env` in the project folder (next to `package.json`):

```
VITE_FIREBASE_API_KEY=the apiKey value
VITE_FIREBASE_AUTH_DOMAIN=YOUR-PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR-PROJECT
VITE_FIREBASE_APP_ID=the appId value
```

`.env.example` lists the same names with blanks. Do not commit `.env`. If any line is blank, sign-in stays off and the demo is unchanged.

Restart `npm run dev` after saving `.env`.

For the public website build, set those same four names in the host's environment, then build. They are baked in at build time. They are not secret passwords, but they must be from this new project.

## 6. iPhone app (native Apple and Google)

The website in Safari already offers Apple, Google, and email. The installed iPhone app uses the same Firebase project. Apple and Google on that app open the phone's own sign-in sheet. Email uses the form inside the app.

1. Firebase → Project settings → Add app → **Apple**. Bundle ID `com.triagedesk.littlenest`.
2. Download `GoogleService-Info.plist` and put it here:

   `ios/App/App/GoogleService-Info.plist`

   That file is gitignored. Do not commit it.
3. In Xcode, open `ios/App/App.xcworkspace` (or the project Xcode already uses). Select the App target → **Signing & Capabilities** → **+ Capability** → **Sign in with Apple**.
4. From the project folder, run:

   ```
   npx cap sync ios
   ```

   This links the Capacitor Firebase sign-in plugin. Do not enable Facebook. The app config only asks for `apple.com` and `google.com`.
5. In `GoogleService-Info.plist`, find `REVERSED_CLIENT_ID`. In Xcode, open Info → URL Types, and add that value as a URL scheme. Google's sheet needs it.
6. Build to a phone. A grown-up opens **Grown-ups**, passes the number check, then **Account**.

If the plist is missing, the iPhone app still opens. Apple and Google show a short message, and email still works. Nothing is uploaded.

## 7. Android, and desktop browsers

There is no separate Android app in this version. On an Android phone, families use Chrome (or Firefox, Edge, or Samsung Internet) and get the same Account page: Apple, Google, and email.

Desktop Chrome, Safari, Firefox, and Edge use a sign-in window. A narrow phone browser uses a full-page redirect and comes back to LittleNest.

## 8. What the grown-up sees

1. The child taps an animal. There is no log-in on that screen.
2. A grown-up opens **Grown-ups** and passes the number check.
3. **Account** offers Sign in with Apple, Sign in with Google, email and password, or an email link.
4. **Back up & sync progress** stays off until they turn it on.
5. **Teacher** is only a flag. Class sign-in with Google, Clever, or ClassLink is not built yet.
6. **Delete all data** removes profiles and progress on this device and the backup.
7. **Delete account** removes the sign-in and the backup. Apple requires this button.

Signing out leaves the profiles on the phone. It stops new backups.

## 9. Check that it stayed private

- The child screen has no Sign in button.
- With `.env` empty, Account says sign-in is not set up and does not show Apple or Google.
- Firestore has one document per grown-up under `grownups`, and no other collections.
- Analytics is off. There is no ads SDK.
