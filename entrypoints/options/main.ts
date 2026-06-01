import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../../lib/settings";

const commitDelay = document.querySelector<HTMLInputElement>("#commitDelay")!;
const showFavicons = document.querySelector<HTMLInputElement>("#showFavicons")!;
const resetMru = document.querySelector<HTMLButtonElement>("#resetMru")!;
const shortcutsLink = document.querySelector<HTMLAnchorElement>("#shortcutsLink")!;
const status = document.querySelector<HTMLElement>("#status")!;

let statusTimer: ReturnType<typeof setTimeout> | null = null;
function flash(message: string): void {
  status.textContent = message;
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    status.textContent = "";
  }, 2000);
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return DEFAULT_SETTINGS.commitDelayMs;
  return Math.max(min, Math.min(max, value));
}

async function init(): Promise<void> {
  const settings = await loadSettings();
  commitDelay.value = String(settings.commitDelayMs);
  showFavicons.checked = settings.showFavicons;
}

commitDelay.addEventListener("change", async () => {
  const value = clamp(parseInt(commitDelay.value, 10), 50, 2000);
  commitDelay.value = String(value);
  await saveSettings({ commitDelayMs: value });
  flash("Saved.");
});

showFavicons.addEventListener("change", async () => {
  await saveSettings({ showFavicons: showFavicons.checked });
  flash("Saved.");
});

resetMru.addEventListener("click", async () => {
  resetMru.disabled = true;
  try {
    await chrome.runtime.sendMessage({ type: "settings/reset-mru" });
    flash("MRU history reset.");
  } finally {
    resetMru.disabled = false;
  }
});

shortcutsLink.addEventListener("click", (event) => {
  event.preventDefault();
  void chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

void init();
