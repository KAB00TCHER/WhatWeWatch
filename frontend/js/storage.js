// js/storage.js
// Local and cloud storage. For Stage 1 this reads and writes the browser's
// localStorage. Roadmap stage 7 (Authorization) swaps the internals of these
// same functions for Firebase Firestore calls under users/{uid}/library/ —
// home.js, ui.js, and api.js never talk to localStorage or Firestore
// directly, only to the functions exported here, so that swap won't require
// changing any other file.
//
// Two things are stored:
//  - a media cache: Unified Media Item objects (see docs/PROJECT.md §6),
//    keyed by "provider:id", so a title's info doesn't need to be re-fetched
//    from an API every time it's opened
//  - library records: User Record objects (see docs/PROJECT.md §9) — the
//    user's own status/rating/note for a title they've added

const RECORDS_KEY = 'whatwewatch:records';
const CACHE_KEY = 'whatwewatch:mediaCache';

export const STATUS = {
  PLANNED: 'planned',
  WATCHING: 'watching',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  DROPPED: 'dropped',
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn(`[storage] failed to read ${key}`, err);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[storage] failed to write ${key}`, err);
  }
}

function recordKey(mediaId, provider) {
  return `${provider}:${mediaId}`;
}

// ---- Media cache ----

export function cacheMediaItem(item) {
  const cache = readJSON(CACHE_KEY, {});
  cache[recordKey(item.id, item.provider)] = item;
  writeJSON(CACHE_KEY, cache);
}

export function getCachedMediaItem(mediaId, provider) {
  const cache = readJSON(CACHE_KEY, {});
  return cache[recordKey(mediaId, provider)] || null;
}

// ---- Library records ----

export function getLibraryRecords() {
  const records = readJSON(RECORDS_KEY, {});
  return Object.values(records);
}

export function getLibraryRecord(mediaId, provider) {
  const records = readJSON(RECORDS_KEY, {});
  return records[recordKey(mediaId, provider)] || null;
}

export function addToLibrary(mediaItem, { status = STATUS.PLANNED, userRating = null, note = '' } = {}) {
  cacheMediaItem(mediaItem);
  const records = readJSON(RECORDS_KEY, {});
  const key = recordKey(mediaItem.id, mediaItem.provider);
  records[key] = {
    mediaId: mediaItem.id,
    provider: mediaItem.provider,
    status,
    userRating,
    note,
    addedAt: new Date().toISOString(),
  };
  writeJSON(RECORDS_KEY, records);
  return records[key];
}

export function updateLibraryRecord(mediaId, provider, changes) {
  const records = readJSON(RECORDS_KEY, {});
  const key = recordKey(mediaId, provider);
  if (!records[key]) return null;
  records[key] = { ...records[key], ...changes };
  writeJSON(RECORDS_KEY, records);
  return records[key];
}

export function removeFromLibrary(mediaId, provider) {
  const records = readJSON(RECORDS_KEY, {});
  delete records[recordKey(mediaId, provider)];
  writeJSON(RECORDS_KEY, records);
}

// ---- Combined view: library records joined with their cached media info ----

export function getLibraryWithDetails() {
  return getLibraryRecords()
    .map((record) => {
      const media = getCachedMediaItem(record.mediaId, record.provider);
      return media ? { ...media, ...record } : null;
    })
    .filter(Boolean);
}
