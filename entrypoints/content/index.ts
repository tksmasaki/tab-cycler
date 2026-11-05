import { getOverlay } from "./overlay";
import type { BgToContent, ContentToBg, OverlayAck } from "../../lib/messages";

declare global {
  interface Window {
    __tabCyclerInjected?: boolean;
  }
}

const ASSUMED_CTRL_HOLD_LIMIT_MS = 2000;

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  allFrames: true,
  main() {
    // Re-injection via chrome.scripting.executeScript can re-run this module in
    // the same realm. Bail out early so we don't double-register listeners or
    // stack a second overlay host on the page.
    if (window.__tabCyclerInjected) return;
    window.__tabCyclerInjected = true;

    if (window !== window.top) {
      reportCtrlReleaseFromSubframe();
      return;
    }

    let overlayActive = false;
    let ctrlHeld = false;
    let ctrlObservedSinceFocus = false;
    let assumedHoldTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatMs = 0;
    let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

    const clearHeartbeat = (): void => {
      if (heartbeatTimer !== null) {
        clearTimeout(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const armHeartbeat = (ms: number): void => {
      heartbeatMs = ms;
      clearHeartbeat();
      if (ctrlHeld) return;
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

    const clearAssumedHold = (): void => {
      if (assumedHoldTimer !== null) {
        clearTimeout(assumedHoldTimer);
        assumedHoldTimer = null;
      }
    };

    const setCtrlHeld = (held: boolean): void => {
      if (ctrlHeld === held) return;
      ctrlHeld = held;
      if (!overlayActive) return;
      if (held) {
        clearHeartbeat();
        return;
      }
      armHeartbeat(heartbeatMs);
      const message: ContentToBg = { type: "cycle/modifier-released" };
      void chrome.runtime.sendMessage(message);
    };

    const observeCtrl = (held: boolean): void => {
      ctrlObservedSinceFocus = true;
      clearAssumedHold();
      setCtrlHeld(held);
    };

    const assumeCtrlHeldByCommandUnlessObserved = (): void => {
      if (ctrlObservedSinceFocus) return;
      ctrlHeld = true;
      clearAssumedHold();
      assumedHoldTimer = setTimeout(() => {
        assumedHoldTimer = null;
        setCtrlHeld(false);
      }, ASSUMED_CTRL_HOLD_LIMIT_MS);
    };

    const ack = (): OverlayAck => ({ ok: true, modifierHeld: ctrlHeld });

    chrome.runtime.onMessage.addListener((message: BgToContent, _sender, sendResponse) => {
      switch (message.type) {
        case "overlay/show": {
          assumeCtrlHeldByCommandUnlessObserved();
          const overlay = getOverlay();
          overlay.show(message.items, message.selectedIndex);
          overlayActive = true;
          armHeartbeat(message.heartbeatMs);
          sendResponse(ack());
          return false;
        }
        case "overlay/update": {
          assumeCtrlHeldByCommandUnlessObserved();
          const overlay = getOverlay();
          overlay.update(message.selectedIndex);
          overlayActive = true;
          armHeartbeat(message.heartbeatMs);
          sendResponse(ack());
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
        observeCtrl(event.ctrlKey);
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

    document.addEventListener("keyup", (event) => observeCtrl(event.ctrlKey), true);
    window.addEventListener("blur", () => {
      clearAssumedHold();
      setCtrlHeld(false);
      ctrlObservedSinceFocus = false;
    });
  },
});

function reportCtrlReleaseFromSubframe(): void {
  document.addEventListener(
    "keyup",
    (event) => {
      if (event.key !== "Control") return;
      const message: ContentToBg = { type: "cycle/modifier-released" };
      void chrome.runtime.sendMessage(message).catch(() => {});
    },
    true,
  );
}
