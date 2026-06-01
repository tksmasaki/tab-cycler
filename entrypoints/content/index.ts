import { getOverlay } from "./overlay";
import type { BgToContent, ContentToBg } from "../../lib/messages";

declare global {
  interface Window {
    __tabCyclerInjected?: boolean;
  }
}

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  allFrames: false,
  main() {
    // Re-injection via chrome.scripting.executeScript can re-run this module in
    // the same realm. Bail out early so we don't double-register listeners or
    // stack a second overlay host on the page.
    if (window.__tabCyclerInjected) return;
    window.__tabCyclerInjected = true;

    let overlayActive = false;
    let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

    const clearHeartbeat = (): void => {
      if (heartbeatTimer !== null) {
        clearTimeout(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const armHeartbeat = (ms: number): void => {
      clearHeartbeat();
      heartbeatTimer = setTimeout(() => {
        overlayActive = false;
        heartbeatTimer = null;
        getOverlay().hide();
      }, ms);
    };

    const hideOverlay = (): void => {
      clearHeartbeat();
      overlayActive = false;
      getOverlay().hide();
    };

    chrome.runtime.onMessage.addListener((message: BgToContent, _sender, sendResponse) => {
      switch (message.type) {
        case "overlay/show": {
          const overlay = getOverlay();
          overlay.show(message.items, message.selectedIndex);
          overlayActive = true;
          armHeartbeat(message.heartbeatMs);
          sendResponse({ ok: true });
          return false;
        }
        case "overlay/update": {
          const overlay = getOverlay();
          overlay.update(message.selectedIndex);
          overlayActive = true;
          armHeartbeat(message.heartbeatMs);
          sendResponse({ ok: true });
          return false;
        }
        case "overlay/hide": {
          hideOverlay();
          sendResponse({ ok: true });
          return false;
        }
        default:
          return false;
      }
    });

    document.addEventListener(
      "keydown",
      (event) => {
        if (!overlayActive) return;
        if (event.isComposing) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          hideOverlay();
          const message: ContentToBg = { type: "cycle/cancel" };
          void chrome.runtime.sendMessage(message);
        }
      },
      true,
    );
  },
});
