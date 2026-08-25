// js/storage.js
//
// User library -> Supabase
// Media cache  -> localStorage
//
// Остальной проект работает с библиотекой
// только через этот файл.

import {
  supabaseRequest,
  getCurrentUser,
} from './supabase.js';

import {
  enrichDetails,
} from './api.js';


// =========================================================
// CONSTANTS
// =========================================================

const CACHE_KEY =
  'whatwewatch:mediaCache';

export const STATUS = {
  PLANNED: 'planned',
  WATCHING: 'watching',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  DROPPED: 'dropped',
};


// =========================================================
// LOCAL STORAGE
// =========================================================

function readJSON(
  key,
  fallback
) {
  try {
    const raw =
      localStorage.getItem(key);

    return raw
      ? JSON.parse(raw)
      : fallback;

  } catch (error) {
    console.warn(
      `[storage] failed to read ${key}:`,
      error
    );

    return fallback;
  }
}


function writeJSON(
  key,
  value
) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

  } catch (error) {
    console.warn(
      `[storage] failed to write ${key}:`,
      error
    );
  }
}


// =========================================================
// MEDIA CACHE
// =========================================================

function makeCacheKey(
  mediaId,
  provider
) {
  return `${provider}:${mediaId}`;
}


export function cacheMediaItem(
  item
) {
  if (
    !item?.id ||
    !item?.provider
  ) {
    return;
  }

  const cache =
    readJSON(
      CACHE_KEY,
      {}
    );

  cache[
    makeCacheKey(
      item.id,
      item.provider
    )
  ] = item;

  writeJSON(
    CACHE_KEY,
    cache
  );
}


export function getCachedMediaItem(
  mediaId,
  provider
) {
  const cache =
    readJSON(
      CACHE_KEY,
      {}
    );

  return (
    cache[
      makeCacheKey(
        mediaId,
        provider
      )
    ] || null
  );
}


// =========================================================
// USER
// =========================================================

async function requireUser() {
  const user =
    await getCurrentUser();

  if (!user) {
    throw new Error(
      'Для работы с библиотекой необходимо войти в аккаунт.'
    );
  }

  return user;
}


// =========================================================
// DATABASE RECORD NORMALIZATION
// =========================================================

function normalizeRecord(
  row
) {
  return {
    id: row.id,

    mediaId:
      String(row.media_id),

    provider:
      row.provider,

    status:
      row.status,

    userRating:
      row.user_rating,

    note:
      row.note || '',

    addedAt:
      row.added_at,

    updatedAt:
      row.updated_at,
  };
}


// =========================================================
// DATABASE QUERY HELPERS
// =========================================================

function libraryQuery(
  userId,
  {
    mediaId,
    provider,
  } = {}
) {
  const params =
    new URLSearchParams();

  params.set(
    'user_id',
    `eq.${userId}`
  );

  params.set(
    'select',
    '*'
  );

  if (mediaId !== undefined) {
    params.set(
      'media_id',
      `eq.${String(mediaId)}`
    );
  }

  if (provider !== undefined) {
    params.set(
      'provider',
      `eq.${provider}`
    );
  }

  return `library_items?${params}`;
}


async function findLibraryRecord(
  userId,
  mediaId,
  provider
) {
  const data =
    await supabaseRequest(
      libraryQuery(
        userId,
        {
          mediaId,
          provider,
        }
      ),
      {
        method: 'GET',
      }
    );

  return data?.length
    ? normalizeRecord(data[0])
    : null;
}


// =========================================================
// GET LIBRARY
// =========================================================

export async function getLibraryRecords() {
  const user =
    await requireUser();

  const data =
    await supabaseRequest(
      libraryQuery(user.id),
      {
        method: 'GET',
      }
    );

  return (
    data || []
  ).map(
    normalizeRecord
  );
}


export async function getLibraryRecord(
  mediaId,
  provider
) {
  const user =
    await requireUser();

  return findLibraryRecord(
    user.id,
    mediaId,
    provider
  );
}


// =========================================================
// ADD
// =========================================================

export async function addToLibrary(
  mediaItem,
  {
    status = STATUS.PLANNED,
    userRating = null,
    note = '',
  } = {}
) {
  const user =
    await requireUser();

  if (
    !mediaItem?.id ||
    !mediaItem?.provider
  ) {
    throw new Error(
      'Invalid media item.'
    );
  }

  cacheMediaItem(
    mediaItem
  );

  const payload = {
    user_id:
      user.id,

    media_id:
      String(mediaItem.id),

    provider:
      mediaItem.provider,

    status,

    user_rating:
      userRating,

    note,
  };

  const data =
    await supabaseRequest(
      'library_items',
      {
        method: 'POST',

        headers: {
          Prefer:
            'resolution=merge-duplicates,return=representation',
        },

        body:
          JSON.stringify(payload),
      }
    );

  return data?.length
    ? normalizeRecord(data[0])
    : null;
}


// =========================================================
// UPDATE
// =========================================================

export async function updateLibraryRecord(
  mediaId,
  provider,
  changes = {}
) {
  const user =
    await requireUser();

  const payload = {};

  if (
    changes.status !== undefined
  ) {
    payload.status =
      changes.status;
  }

  if (
    changes.userRating !== undefined
  ) {
    payload.user_rating =
      changes.userRating;
  }

  if (
    changes.note !== undefined
  ) {
    payload.note =
      changes.note;
  }

  payload.updated_at =
    new Date().toISOString();

  const data =
    await supabaseRequest(
      libraryQuery(
        user.id,
        {
          mediaId,
          provider,
        }
      ),
      {
        method: 'PATCH',

        headers: {
          Prefer:
            'return=representation',
        },

        body:
          JSON.stringify(payload),
      }
    );

  return data?.length
    ? normalizeRecord(data[0])
    : null;
}


// =========================================================
// REMOVE
// =========================================================

export async function removeFromLibrary(
  mediaId,
  provider
) {
  const user =
    await requireUser();

  await supabaseRequest(
    libraryQuery(
      user.id,
      {
        mediaId,
        provider,
      }
    ),
    {
      method: 'DELETE',
    }
  );
}


// =========================================================
// MEDIA ID PARSING
// =========================================================

function parseMediaId(
  mediaId,
  provider
) {
  const value =
    String(mediaId);

  const patterns = {
    tmdb:
      /^tmdb-(movie|series|tv)-(.+)$/,

    rawg:
      /^rawg-game-(.+)$/,

    shikimori:
      /^shikimori-anime-(.+)$/,
  };

  const pattern =
    patterns[provider];

  if (!pattern) {
    return null;
  }

  const match =
    value.match(pattern);

  if (!match) {
    return null;
  }

  if (provider === 'tmdb') {
    return {
      providerId:
        match[2],

      type:
        match[1] === 'tv' ||
        match[1] === 'series'
          ? 'series'
          : 'movie',
    };
  }

  if (provider === 'rawg') {
    return {
      providerId:
        match[1],

      type:
        'game',
    };
  }

  if (provider === 'shikimori') {
    return {
      providerId:
        match[1],

      type:
        'anime',
    };
  }

  return null;
}


// =========================================================
// MEDIA RESTORATION
// =========================================================

async function restoreMediaItem(
  mediaId,
  provider
) {
  const parsed =
    parseMediaId(
      mediaId,
      provider
    );

  if (!parsed) {
    console.warn(
      '[storage] cannot parse media id:',
      mediaId,
      provider
    );

    return null;
  }

  const baseItem = {
    id: mediaId,

    provider,

    providerId:
      parsed.providerId,

    type:
      parsed.type,

    title: '',
    originalTitle: '',

    year: null,
    rating: null,

    poster: null,
    backdrop: null,

    description: '',

    genres: [],

    runtime: null,
    episodes: null,
    playtime: null,
  };

  try {
    const restored =
      await enrichDetails(
        baseItem
      );

    if (
      !restored?.title
    ) {
      console.warn(
        '[storage] failed to restore media:',
        mediaId,
        provider
      );

      return null;
    }

    cacheMediaItem(
      restored
    );

    return restored;

  } catch (error) {
    console.warn(
      '[storage] media restore failed:',
      mediaId,
      provider,
      error
    );

    return null;
  }
}


// =========================================================
// MEDIA RESOLUTION
// =========================================================

async function resolveMedia(
  mediaId,
  provider,
  {
    requireGenres = false,
  } = {}
) {
  let media =
    getCachedMediaItem(
      mediaId,
      provider
    );

  const cacheIsValid =
    media &&
    media.id &&
    media.provider &&
    media.type &&
    media.title &&
    (
      !requireGenres ||
      (
        Array.isArray(
          media.genres
        ) &&
        media.genres.length > 0
      )
    );

  if (
    !cacheIsValid
  ) {
    media = null;
  }

  if (!media) {
    media =
      await restoreMediaItem(
        mediaId,
        provider
      );
  }

  return media;
}


// =========================================================
// LIBRARY + MEDIA DETAILS
// =========================================================

export async function getLibraryWithDetails() {
  const records =
    await getLibraryRecords();

  const items =
    await Promise.all(
      records.map(
        async record => {
          const media =
            await resolveMedia(
              record.mediaId,
              record.provider,
              {
                requireGenres:
                  true,
              }
            );

          if (!media) {
            return null;
          }

          return {
            ...media,
            ...record,

            id:
              media.id,
          };
        }
      )
    );

  return items.filter(
    Boolean
  );
}


// =========================================================
// RANDOM CANDIDATES
// =========================================================

export async function getRandomLibraryCandidates() {
  const records =
    await getLibraryRecords();

  return records.filter(
    record =>
      record.status ===
        STATUS.PLANNED ||
      record.status ===
        STATUS.ON_HOLD
  );
}


// =========================================================
// ONE LIBRARY ITEM + DETAILS
// =========================================================

export async function getLibraryItemWithDetails(
  record
) {
  if (!record) {
    return null;
  }

  const mediaId =
    String(
      record.mediaId || ''
    );

  const provider =
    record.provider;

  if (
    !mediaId ||
    !provider
  ) {
    return null;
  }

  const media =
    await resolveMedia(
      mediaId,
      provider
    );

  if (!media) {
    return null;
  }

  return {
    ...media,

    id:
      media.id ||
      mediaId,

    provider:
      media.provider ||
      provider,

    status:
      record.status,

    userRating:
      record.userRating,

    note:
      record.note || '',

    addedAt:
      record.addedAt,

    updatedAt:
      record.updatedAt,
  };
}