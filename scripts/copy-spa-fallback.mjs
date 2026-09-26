import { copyFileSync } from "node:fs";

// GitHub Pages serves this file for any unknown path, so a refresh still loads the app.
copyFileSync("dist/index.html", "dist/404.html");
