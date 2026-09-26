import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.triagedesk.littlenest",
  appName: "LittleNest",
  webDir: "dist",
  backgroundColor: "#fbf6ee",
  ios: {
    contentInset: "never",
    backgroundColor: "#fbf6ee",
  },
  plugins: {
    FirebaseAuthentication: {
      // The web SDK holds the session. Native iOS only shows the Apple and Google sheets.
      skipNativeAuth: true,
      providers: ["apple.com", "google.com"],
    },
  },
};

export default config;
