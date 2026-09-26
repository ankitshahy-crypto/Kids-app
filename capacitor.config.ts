import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.fsdvibe.kidsapp",
  appName: "Kids App",
  webDir: "dist",
  backgroundColor: "#fbf6ee",
  ios: {
    contentInset: "never",
    backgroundColor: "#fbf6ee",
  },
};

export default config;
