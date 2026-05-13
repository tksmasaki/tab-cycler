import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "../package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Tab Cycler",
  description: "Vivaldi-style MRU (most recently used) tab cycling for Chrome.",
  version: pkg.version,
  icons: {
    16: "icons/icon16.png",
    32: "icons/icon32.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png",
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
      all_frames: false,
    },
  ],
  options_ui: {
    page: "src/options/options.html",
    open_in_tab: true,
  },
  permissions: ["tabs", "storage", "scripting"],
  host_permissions: ["<all_urls>"],
  commands: {
    "cycle-next-mru": {
      suggested_key: { default: "Ctrl+Q", mac: "MacCtrl+Q" },
      description: "Cycle to next recently used tab",
    },
    "cycle-prev-mru": {
      suggested_key: { default: "Ctrl+Shift+Q", mac: "MacCtrl+Shift+Q" },
      description: "Cycle to previous recently used tab",
    },
  },
});
