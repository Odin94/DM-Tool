import { rename } from "node:fs/promises";
await rename("dist-desktop/desktop.html", "dist-desktop/index.html");
