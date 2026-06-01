// Pure operations on a per-window MRU (most-recently-used) tab-id list.
// Extracted from mru.ts so the ordering logic is unit-testable without the
// chrome.storage layer.

/** Move `id` to the front (most recent). Removes any existing occurrence. */
export function moveToFront(list: number[], id: number): number[] {
  return [id, ...list.filter((x) => x !== id)];
}

/**
 * Append `id` to the end (least recent) if absent. Returns the SAME array
 * reference when unchanged, so callers can skip a redundant persist.
 */
export function appendUnique(list: number[], id: number): number[] {
  return list.includes(id) ? list : [...list, id];
}

/** Remove every occurrence of `id`. */
export function removeId(list: number[], id: number): number[] {
  return list.filter((x) => x !== id);
}
