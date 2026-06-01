import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Tab Cycler",
    description: "MRU (most recently used) tab cycling for Chrome.",
    permissions: ["tabs", "storage", "scripting"],
    host_permissions: ["<all_urls>"],
    icons: {
      16: "icons/icon16.png",
      32: "icons/icon32.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
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
  },
});
