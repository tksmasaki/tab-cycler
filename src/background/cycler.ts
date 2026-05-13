import { getOrdered } from "./mru";
import { loadSettings } from "../shared/settings";
import type { BgToContent, OverlayItem } from "../shared/messages";

type State =
  | { phase: "idle" }
  | {
      phase: "active";
      windowId: number;
      hostTabId: number;
      tabIds: number[];
      selectedIndex: number;
      commitTimer: ReturnType<typeof setTimeout> | null;
      hasOverlay: boolean;
      commitDelayMs: number;
      showFavicons: boolean;
    };

let state: State = { phase: "idle" };

async function buildItems(
  tabIds: number[],
  showFavicons: boolean,
): Promise<OverlayItem[]> {
  const settled = await Promise.allSettled(
    tabIds.map((id) => chrome.tabs.get(id)),
  );
  const items: OverlayItem[] = [];
  settled.forEach((result, idx) => {
    if (result.status !== "fulfilled") return;
    const tab = result.value;
    const tabId = tabIds[idx];
    if (tabId === undefined) return;
    items.push({
      tabId,
      title: tab.title || tab.url || "Untitled",
      favIconUrl: showFavicons ? tab.favIconUrl : undefined,
    });
  });
  return items;
}

function getContentScriptFiles(): string[] {
  const manifest = chrome.runtime.getManifest();
  return manifest.content_scripts?.flatMap((cs) => cs.js ?? []) ?? [];
}

async function injectContentScript(tabId: number): Promise<boolean> {
  const files = getContentScriptFiles();
  if (files.length === 0) return false;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files,
      injectImmediately: true,
    });
    return true;
  } catch {
    return false;
  }
}

async function sendToHost(message: BgToContent, hostTabId: number): Promise<boolean> {
  try {
    await chrome.tabs.sendMessage(hostTabId, message);
    return true;
  } catch {
    if (!(await injectContentScript(hostTabId))) return false;
    try {
      await chrome.tabs.sendMessage(hostTabId, message);
      return true;
    } catch {
      return false;
    }
  }
}

function clearTimer(): void {
  if (state.phase === "active" && state.commitTimer !== null) {
    clearTimeout(state.commitTimer);
    state.commitTimer = null;
  }
}

function scheduleCommit(): void {
  if (state.phase !== "active") return;
  clearTimer();
  state.commitTimer = setTimeout(() => {
    void commit();
  }, state.commitDelayMs);
}

async function commit(): Promise<void> {
  if (state.phase !== "active") return;
  const { tabIds, selectedIndex, windowId, hostTabId, hasOverlay } = state;
  state = { phase: "idle" };
  if (hasOverlay) {
    void sendToHost({ type: "overlay/hide" }, hostTabId);
  }
  const targetId = tabIds[selectedIndex];
  if (targetId === undefined) return;
  try {
    await chrome.tabs.update(targetId, { active: true });
    await chrome.windows.update(windowId, { focused: true });
  } catch {
    // tab/window gone
  }
}

export async function cancel(): Promise<void> {
  if (state.phase !== "active") return;
  const { hostTabId, hasOverlay } = state;
  clearTimer();
  state = { phase: "idle" };
  if (hasOverlay) {
    void sendToHost({ type: "overlay/hide" }, hostTabId);
  }
}

async function resolveContext(
  triggerTab: chrome.tabs.Tab | undefined,
): Promise<{ windowId: number; hostTabId: number } | null> {
  if (
    triggerTab?.id !== undefined &&
    triggerTab.windowId !== undefined &&
    triggerTab.windowId !== chrome.windows.WINDOW_ID_NONE
  ) {
    return { windowId: triggerTab.windowId, hostTabId: triggerTab.id };
  }
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ["normal"] });
    if (!win || win.id === undefined) return null;
    const [activeTab] = await chrome.tabs.query({ active: true, windowId: win.id });
    if (!activeTab?.id) return null;
    return { windowId: win.id, hostTabId: activeTab.id };
  } catch {
    return null;
  }
}

export async function onCommand(
  direction: "next" | "prev",
  triggerTab?: chrome.tabs.Tab,
): Promise<void> {
  if (state.phase === "active") {
    const len = state.tabIds.length;
    if (len <= 1) return;
    const delta = direction === "next" ? 1 : -1;
    state.selectedIndex = (state.selectedIndex + delta + len) % len;
    if (state.hasOverlay) {
      void sendToHost(
        {
          type: "overlay/update",
          selectedIndex: state.selectedIndex,
          heartbeatMs: state.commitDelayMs * 4,
        },
        state.hostTabId,
      );
    }
    scheduleCommit();
    return;
  }

  const ctx = await resolveContext(triggerTab);
  if (!ctx) return;
  const { windowId, hostTabId } = ctx;

  const orderedIds = await getOrdered(windowId);
  if (orderedIds.length <= 1) return;

  const settings = await loadSettings();
  const items = await buildItems(orderedIds, settings.showFavicons);
  if (items.length <= 1) return;

  const tabIds = items.map((it) => it.tabId);
  // MRU[0] is the currently active tab — skip it. "next" lands on the second-most
  // recent, "prev" wraps around to the least recent.
  const startIndex = direction === "next" ? 1 : tabIds.length - 1;

  state = {
    phase: "active",
    windowId,
    hostTabId,
    tabIds,
    selectedIndex: startIndex,
    commitTimer: null,
    hasOverlay: false,
    commitDelayMs: settings.commitDelayMs,
    showFavicons: settings.showFavicons,
  };

  const ok = await sendToHost(
    {
      type: "overlay/show",
      items,
      selectedIndex: startIndex,
      heartbeatMs: settings.commitDelayMs * 4,
    },
    hostTabId,
  );
  if (state.phase === "active") state.hasOverlay = ok;
  scheduleCommit();
}

export function onTabActivatedExternally(windowId: number): void {
  if (state.phase !== "active") return;
  if (state.windowId !== windowId) return;
  void cancel();
}

export function onTabRemoved(tabId: number): void {
  if (state.phase !== "active") return;
  const idx = state.tabIds.indexOf(tabId);
  if (idx === -1) return;
  state.tabIds.splice(idx, 1);
  if (state.tabIds.length <= 1) {
    void cancel();
    return;
  }
  if (idx < state.selectedIndex) state.selectedIndex--;
  if (state.selectedIndex >= state.tabIds.length) {
    state.selectedIndex = state.tabIds.length - 1;
  }
  if (state.hasOverlay) {
    const { tabIds, selectedIndex, hostTabId, showFavicons, commitDelayMs } = state;
    void buildItems(tabIds, showFavicons).then((items) => {
      if (state.phase !== "active" || !state.hasOverlay) return;
      void sendToHost(
        {
          type: "overlay/show",
          items,
          selectedIndex,
          heartbeatMs: commitDelayMs * 4,
        },
        hostTabId,
      );
    });
  }
}
