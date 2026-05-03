import {
  appendTab,
  recordActivation,
  reconcile,
  removeTab,
  removeWindow,
  reset,
} from "./mru";
import {
  cancel,
  onCommand,
  onTabActivatedExternally,
  onTabRemoved,
} from "./cycler";
import type { ContentToBg } from "../shared/messages";

chrome.runtime.onInstalled.addListener(() => {
  void reconcile();
});

chrome.runtime.onStartup.addListener(() => {
  void reconcile();
});

void reconcile();

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  onTabActivatedExternally(windowId);
  await recordActivation(tabId, windowId);
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id === undefined || tab.windowId === undefined) return;
  void appendTab(tab.id, tab.windowId);
});

chrome.tabs.onRemoved.addListener((tabId, info) => {
  void removeTab(tabId, info.windowId);
  onTabRemoved(tabId);
});

chrome.tabs.onAttached.addListener((tabId, { newWindowId }) => {
  void appendTab(tabId, newWindowId);
});

chrome.tabs.onDetached.addListener((tabId, { oldWindowId }) => {
  void removeTab(tabId, oldWindowId);
});

chrome.windows.onRemoved.addListener((windowId) => {
  void removeWindow(windowId);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const [active] = await chrome.tabs.query({ active: true, windowId });
    if (active?.id !== undefined) {
      await recordActivation(active.id, windowId);
    }
  } catch {
    // window may have closed
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "cycle-next-mru") {
    void onCommand("next", tab);
  } else if (command === "cycle-prev-mru") {
    void onCommand("prev", tab);
  }
});

chrome.runtime.onMessage.addListener(
  (message: ContentToBg | { type: "settings/reset-mru" }, _sender, sendResponse) => {
    if (message.type === "cycle/cancel") {
      void cancel().then(() => sendResponse({ ok: true }));
      return true;
    }
    if (message.type === "settings/reset-mru") {
      void reset()
        .then(() => reconcile())
        .then(() => sendResponse({ ok: true }));
      return true;
    }
    return false;
  },
);
