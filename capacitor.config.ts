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
};

export default config;
