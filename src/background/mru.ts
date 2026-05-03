const STORAGE_KEY = "mru";

type MruByWindow = Record<number, number[]>;

let cache: MruByWindow | null = null;

async function load(): Promise<MruByWindow> {
  if (cache) return cache;
  const stored = await chrome.storage.session.get(STORAGE_KEY);
  cache = (stored[STORAGE_KEY] as MruByWindow | undefined) ?? {};
  return cache;
}

async function persist(): Promise<void> {
  if (!cache) return;
  await chrome.storage.session.set({ [STORAGE_KEY]: cache });
}

export async function recordActivation(tabId: number, windowId: number): Promise<void> {
  const mru = await load();
  const list = mru[windowId] ?? [];
  const filtered = list.filter((id) => id !== tabId);
  filtered.unshift(tabId);
  mru[windowId] = filtered;
  await persist();
}

export async function appendTab(tabId: number, windowId: number): Promise<void> {
  const mru = await load();
  const list = mru[windowId] ?? [];
  if (!list.includes(tabId)) {
    list.push(tabId);
    mru[windowId] = list;
    await persist();
  }
}

export async function removeTab(tabId: number, windowId?: number): Promise<void> {
  const mru = await load();
  if (windowId !== undefined) {
    const list = mru[windowId];
    if (!list) return;
    const next = list.filter((id) => id !== tabId);
    if (next.length === 0) delete mru[windowId];
    else mru[windowId] = next;
  } else {
    for (const wid of Object.keys(mru)) {
      const key = Number(wid);
      const list = mru[key];
      if (!list) continue;
      const next = list.filter((id) => id !== tabId);
      if (next.length === 0) delete mru[key];
      else mru[key] = next;
    }
  }
  await persist();
}

export async function removeWindow(windowId: number): Promise<void> {
  const mru = await load();
  if (mru[windowId]) {
    delete mru[windowId];
    await persist();
  }
}

export async function getOrdered(windowId: number): Promise<number[]> {
  const mru = await load();
  return [...(mru[windowId] ?? [])];
}

export async function reset(): Promise<void> {
  cache = {};
  await chrome.storage.session.remove(STORAGE_KEY);
}

export async function reconcile(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  const mru = await load();
  const liveByWindow = new Map<number, Set<number>>();
  for (const tab of tabs) {
    if (tab.id === undefined || tab.windowId === undefined) continue;
    let set = liveByWindow.get(tab.windowId);
    if (!set) {
      set = new Set();
      liveByWindow.set(tab.windowId, set);
    }
    set.add(tab.id);
  }

  for (const wid of Object.keys(mru)) {
    const key = Number(wid);
    const live = liveByWindow.get(key);
    if (!live) {
      delete mru[key];
      continue;
    }
    const filtered = (mru[key] ?? []).filter((id) => live.has(id));
    if (filtered.length === 0) delete mru[key];
    else mru[key] = filtered;
  }

  for (const [windowId, liveTabs] of liveByWindow) {
    const known = new Set(mru[windowId] ?? []);
    const list = mru[windowId] ?? [];
    for (const id of liveTabs) {
      if (!known.has(id)) list.push(id);
    }
    if (list.length > 0) mru[windowId] = list;
  }

  const activeTabs = await chrome.tabs.query({ active: true });
  for (const tab of activeTabs) {
    if (tab.id === undefined || tab.windowId === undefined) continue;
    const list = mru[tab.windowId] ?? [];
    const filtered = list.filter((id) => id !== tab.id);
    filtered.unshift(tab.id);
    mru[tab.windowId] = filtered;
  }

  await persist();
}
