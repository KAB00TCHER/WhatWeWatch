// js/api.js
// The one door the rest of the app uses to search across every provider.
// Each provider module (tmdb.js today; shikimori.js and rawg.js join in
// roadmap stages 3 and 4) is responsible for converting its own response
// into the app's Unified Media Item shape:
//   { id, provider, providerId, title, originalTitle, type, year, rating,
//     poster, backdrop, description, runtime, episodes, playtime }
// api.js just fans out to every provider, merges what comes back, and falls

// even before any API key is configured.

import { searchTMDB, getTMDBDetails } from './tmdb.js';
import { searchShikimori, getShikimoriDetails } from './shikimori.js';
import { searchRAWG, getRAWGDetails } from './rawg.js';


// Add a new provider's search function here — nothing else in the app needs
// to change.
const PROVIDERS = [searchTMDB,searchShikimori,searchRAWG ]; //

// Search results don't carry every field (runtime, episode count,
// description) — each provider that can fill those in later registers a
// fetcher here, keyed by its own `provider` value.
const DETAIL_FETCHERS = {
  tmdb: (item) => getTMDBDetails(item.providerId, item.type),
shikimori: (item) => getShikimoriDetails(item.providerId),
rawg: (item) => getRAWGDetails(item.providerId),
};

// Fills in the fields a search result is missing (called right before a
// fresh result is shown in the detail modal or added to the library).
// Items already in the library skip this — they were enriched once when
// added and their full data lives in storage.js's cache.
export async function enrichDetails(item) {
  const fetchDetails = DETAIL_FETCHERS[item.provider];
  if (!fetchDetails) return item;
  try {
    const extra = await fetchDetails(item);
    return extra ? { ...item, ...extra } : item;
  } catch (err) {
    console.warn('[api] detail enrichment failed', err);
    return item;
  }
}



function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.provider}:${item.providerId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchAll(query) {
  const trimmed = (query || '').trim();
  if (!trimmed) return [];

  const settled = await Promise.allSettled(PROVIDERS.map((search) => search(trimmed)));
  const combined = settled
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value);

 

  return dedupe(combined);
}
whatwewatch-three.vercel.app/api/rawg?q=minecraft  выдал ошибку 404 почему то. При этом если я прям в поиске пишу майнкрафт, то находит и игры и фильмы как надо.  При этом если я пытаюсь добавить к себе карточку с игрой, сайт долго "что то грузит" как при поиске, когда было на локалке, а потом открывает карточку но без описания (возможно не может подтянуть из за разницы в форматах или типа того.)
ВНЕЗАПНО ПЕРЕСТАЛО РАБОТАТЬ РАВГ (а через 10 минут снова заработало, по крайней мере карточки создаются, хоть и пустые как я уже описал), снова выдает CORS. теперь по поводу консоли: при загрузке сайта сразу выдает вот это: [rawg] search error TypeError: NetworkError when attempting to fetch resource. rawg.js:72:13
[shikimori] search error TypeError: NetworkError when attempting to fetch resource. shikimori.js:58:13
а при поиске чего либо снова те же ошибки:
XHR 
GET
https://api.allorigins.win/raw?url=https://shikimori.one/api/animes?search=%D0%A4%D1%80%D0%B8%D1%80%D0%B5%D0%BD&limit=20
CORS Missing Allow Origin
XHR 
GET
https://api.allorigins.win/raw?url=https://api.rawg.io/api/games?key=824826cafeb541228ca96281cfb4f0d3&search=%D0%A4%D1%80%D0%B8%D1%80%D0%B5%D0%BD&page_size=20
CORS Missing Allow Origin
Запрос из постороннего источника заблокирован: Политика одного источника запрещает чтение удалённого ресурса на https://api.allorigins.win/raw?url=https%3A%2F%2Fapi.rawg.io%2Fapi%2Fgames%3Fkey%3D824826cafeb541228ca96281cfb4f0d3%26search%3D%25D0%25A4%25D1%2580%25D0%25B8%25D1%2580%25D0%25B5%25D0%25BD%26page_size%3D20. (Причина: отсутствует заголовок CORS «Access-Control-Allow-Origin»). Код состояния: 522.
[rawg] search error TypeError: NetworkError when attempting to fetch resource. rawg.js:72:13
Запрос из постороннего источника заблокирован: Политика одного источника запрещает чтение удалённого ресурса на https://api.allorigins.win/raw?url=https%3A%2F%2Fshikimori.one%2Fapi%2Fanimes%3Fsearch%3D%25D0%25A4%25D1%2580%25D0%25B8%25D1%2580%25D0%25B5%25D0%25BD%26limit%3D20. (Причина: отсутствует заголовок CORS «Access-Control-Allow-Origin»). Код состояния: 522.
[shikimori] search error TypeError: NetworkError when attempting to fetch resource. shikimori.js:58:13

Давай исправлять, мне надоело тыкаться