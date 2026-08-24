// js/storage.js
//
// User library -> Supabase
// Media cache -> localStorage
//
// Все остальные файлы проекта работают со storage.js
// и не обращаются напрямую ни к Supabase, ни к localStorage.


import {
  supabaseRequest,
  getCurrentUser,
} from './supabase.js';

import { enrichDetails } from './api.js';
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
// LOCAL MEDIA CACHE
// =========================================================
//
// Кэш остаётся локальным.
// Он НЕ является пользовательской библиотекой.
//
// Например:
// "tmdb:550" -> информация о Fight Club
//
// Это нормально хранить в localStorage,
// потому что эти данные одинаковы для всех пользователей.


function readJSON(key, fallback) {
  try {

    const raw =
      localStorage.getItem(key);

    return raw
      ? JSON.parse(raw)
      : fallback;

  } catch (err) {

    console.warn(
      `[storage] failed to read ${key}`,
      err
    );

    return fallback;
  }
}


function writeJSON(key, value) {
  try {

    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

  } catch (err) {

    console.warn(
      `[storage] failed to write ${key}`,
      err
    );
  }
}


function recordKey(
  mediaId,
  provider
) {
  return `${provider}:${mediaId}`;
}


// =========================================================
// MEDIA CACHE
// =========================================================

export function cacheMediaItem(item) {

  const cache =
    readJSON(
      CACHE_KEY,
      {}
    );


  cache[
    recordKey(
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
      recordKey(
        mediaId,
        provider
      )
    ] || null
  );
}


// =========================================================
// CURRENT USER
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
// DATABASE RECORD -> APP RECORD
// =========================================================
//
// Supabase:
//   media_id
//   user_rating
//   added_at
//   updated_at
//
// Application:
//   mediaId
//   userRating
//   addedAt
//   updatedAt
//
// Остальному коду проекта не нужно знать,
// как именно называются поля в БД.


function normalizeRecord(row) {

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
// GET ALL LIBRARY RECORDS
// =========================================================

export async function getLibraryRecords() {

  const user =
    await requireUser();


  const data =
    await supabaseRequest(
      `library_items?user_id=eq.${encodeURIComponent(user.id)}&select=*`,
      {
        method: 'GET',
      }
    );


  return (data || [])
    .map(normalizeRecord);
}


// =========================================================
// GET ONE LIBRARY RECORD
// =========================================================

export async function getLibraryRecord(
  mediaId,
  provider
) {

  const user =
    await requireUser();


  const data =
    await supabaseRequest(
      `library_items?user_id=eq.${encodeURIComponent(user.id)}&media_id=eq.${encodeURIComponent(String(mediaId))}&provider=eq.${encodeURIComponent(provider)}&select=*`,
      {
        method: 'GET',
      }
    );


  if (!data || !data.length) {
    return null;
  }


  return normalizeRecord(
    data[0]
  );
}


// =========================================================
// ADD TO LIBRARY
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


  // Кэшируем информацию о фильме/игре/аниме
  // локально, чтобы потом можно было
  // отрисовать библиотеку без повторного API-запроса.
  cacheMediaItem(mediaItem);


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


  if (!data || !data.length) {
    return null;
  }


  return normalizeRecord(
    data[0]
  );
}


// =========================================================
// UPDATE LIBRARY RECORD
// =========================================================

export async function updateLibraryRecord(
  mediaId,
  provider,
  changes
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
      `library_items?user_id=eq.${encodeURIComponent(user.id)}&media_id=eq.${encodeURIComponent(String(mediaId))}&provider=eq.${encodeURIComponent(provider)}`,
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


  if (!data || !data.length) {
    return null;
  }


  return normalizeRecord(
    data[0]
  );
}


// =========================================================
// REMOVE FROM LIBRARY
// =========================================================

export async function removeFromLibrary(
  mediaId,
  provider
) {

  const user =
    await requireUser();


  await supabaseRequest(
    `library_items?user_id=eq.${encodeURIComponent(user.id)}&media_id=eq.${encodeURIComponent(String(mediaId))}&provider=eq.${encodeURIComponent(provider)}`,
    {
      method: 'DELETE',
    }
  );
}


// =========================================================
// COMBINED LIBRARY VIEW
// =========================================================
//
// Берём:
//   1. записи пользователя из Supabase
//   2. информацию о медиа из localStorage
//
// И объединяем их.
//
// Если фильм есть в БД, но его медиа-данных
// нет в локальном кэше, такая запись пока
// не отображается.

function parseMediaId(mediaId, provider) {
  const value = String(mediaId);

  if (provider === 'tmdb') {
const match =
  value.match(
    /^tmdb-(movie|series|tv)-(.+)$/
  );

    if (!match) {
      return null;
    }

    return {
      providerId: match[2],

    type:
  match[1] === 'tv' ||
  match[1] === 'series'
    ? 'series'
    : 'movie',
    };
  }

  if (provider === 'rawg') {
    const match =
      value.match(
        /^rawg-game-(.+)$/
      );

    if (!match) {
      return null;
    }

    return {
      providerId: match[1],
      type: 'game',
    };
  }

  if (provider === 'shikimori') {
    const match =
      value.match(
        /^shikimori-anime-(.+)$/
      );

    if (!match) {
      return null;
    }

    return {
      providerId: match[1],
      type: 'anime',
    };
  }

  return null;
}


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
    providerId: parsed.providerId,
    type: parsed.type,

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
      !restored ||
      !restored.title
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

  } catch (err) {
    console.warn(
      '[storage] media restore failed:',
      mediaId,
      provider,
      err
    );

    return null;
  }
}


export async function getLibraryWithDetails() {
  const records =
    await getLibraryRecords();

  const items =
    await Promise.all(
      records.map(async (record) => {

        let media =
  getCachedMediaItem(
    record.mediaId,
    record.provider
  );

if (
  !media ||
  !Array.isArray(media.genres) ||
  media.genres.length === 0
) {
  media =
    await restoreMediaItem(
      record.mediaId,
      record.provider
    );
}

        if (!media) {
          return null;
        }

        return {
          ...media,
          ...record,
          id: media.id,
        };
      })
    );

  return items.filter(Boolean);
}

export async function getRandomLibraryCandidates() {
  const records =
    await getLibraryRecords();

  return records.filter(
    (record) =>
      record.status === STATUS.PLANNED ||
      record.status === STATUS.ON_HOLD
  );
}


export async function getLibraryItemWithDetails(
  record
) {
  if (!record) {
    return null;
  }

  const mediaId =
    String(record.mediaId || '');

  const provider =
    record.provider;

  if (!mediaId || !provider) {
    return null;
  }

  let media =
    getCachedMediaItem(
      mediaId,
      provider
    );

  // Кэш может быть старым или неполным.
  // Для random нам обязательно нужны
  // базовые поля карточки.
  const cacheIsValid =
    media &&
    media.id &&
    media.provider &&
    media.type &&
    media.title;

  if (!cacheIsValid) {
    media = null;
  }

  if (!media) {
    media =
      await restoreMediaItem(
        mediaId,
        provider
      );
  }

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