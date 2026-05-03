export type Settings = {
  commitDelayMs: number;
  showFavicons: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  commitDelayMs: 350,
  showFavicons: true,
};

const KEY = "settings";

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[KEY] ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await chrome.storage.sync.set({ [KEY]: next });
  return next;
}
