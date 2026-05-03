import { getOverlay } from "./overlay";
import type { BgToContent, ContentToBg } from "../shared/messages";

let overlayActive = false;
let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

function clearHeartbeat(): void {
  if (heartbeatTimer !== null) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function armHeartbeat(ms: number): void {
  clearHeartbeat();
  heartbeatTimer = setTimeout(() => {
    overlayActive = false;
    heartbeatTimer = null;
    getOverlay().hide();
  }, ms);
}

function hideOverlay(): void {
  clearHeartbeat();
  overlayActive = false;
  getOverlay().hide();
}

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
