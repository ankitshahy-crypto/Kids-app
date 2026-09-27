# Class QR links

A class QR code is an https link, for example `https://your-site/Kids-app/?classCode=BUNNY-42&open=app`.

On iPhone and iPad, iOS opens the LittleNest app when `apple-app-site-association` matches the domain. The file in this repo is `public/.well-known/apple-app-site-association`. The app id is `TEAMID.com.triagedesk.littlenest`. Replace `TEAMID` with the Apple Team ID before the pilot. The bundle id stays `com.triagedesk.littlenest`.

If the app is not installed, the same link opens this website. That is the fallback. TestFlight is the placeholder until the App Store build exists: `https://testflight.apple.com/join/PLACEHOLDER`. Replace `PLACEHOLDER` with the real join code. Do not ship that placeholder as a working invite.

Associated Domains on the iOS target: `applinks:your-site`.

Android App Links (`assetlinks.json`) wait until there is an Android app. The pilot on Android is the Chrome page at the same https link. This version does not add Capacitor Android.

GitHub project pages serve the association file under `/Kids-app/.well-known/`, not at the domain root. A custom domain is required before iOS will honor it.
