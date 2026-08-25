// js/api.js


import {
  searchTMDB,
  getTMDBDetails,
} from './tmdb.js';


import {
  searchShikimori,
  getShikimoriDetails,
} from './shikimori.js';


import {
  searchRAWG,
  getRAWGDetails,
} from './rawg.js';


import {
  searchSteam,
  getSteamDetails,
} from './steam.js';



const DETAIL_FETCHERS = {

  tmdb: item =>
    getTMDBDetails(
      item.providerId,
      item.type
    ),

  shikimori: item =>
    getShikimoriDetails(
      item.providerId
    ),

  rawg: item =>
    getRAWGDetails(
      item.providerId
    ),

  steam: item =>
    getSteamDetails(
      item.providerId
    ),
};



export async function enrichDetails(
  item
) {
  const fetchDetails =
    DETAIL_FETCHERS[
      item?.provider
    ];


  if (!fetchDetails) {
    return item;
  }


  try {
    const details =
      await fetchDetails(item);


    return details
      ? {
          ...item,
          ...details,
        }
      : item;


  } catch (error) {

    console.warn(
      '[api] detail enrichment failed:',
      error
    );


    return item;
  }
}



function dedupe(items) {
  const seen =
    new Set();


  return items.filter(item => {

    const key =
      `${item.provider}:${item.providerId}`;


    if (seen.has(key)) {
      return false;
    }


    seen.add(key);

    return true;
  });
}



function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(
      /[^\p{L}\p{N}\s]+/gu,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}



function titlesMatch(a, b) {
  const wordsA =
    new Set(
      normalizeTitle(a)
    );


  const wordsB =
    new Set(
      normalizeTitle(b)
    );


  if (
    !wordsA.size ||
    !wordsB.size
  ) {
    return false;
  }


  let common = 0;


  for (
    const word of wordsA
  ) {
    if (
      wordsB.has(word)
    ) {
      common++;
    }
  }


  const smaller =
    Math.min(
      wordsA.size,
      wordsB.size
    );


  return (
    smaller >= 2 &&
    common / smaller >= 0.8
  );
}



function removeAnimeDuplicates(
  items
) {
  const anime =
    items.filter(
      item =>
        item.type ===
        'anime'
    );


  if (!anime.length) {
    return items;
  }


  return items.filter(item => {

    if (
      item.provider !==
        'tmdb' ||
      item.type !==
        'series'
    ) {
      return true;
    }


    return !anime.some(
      animeItem => {

        const sameTitle =
          titlesMatch(
            item.title,
            animeItem.title
          ) ||
          titlesMatch(
            item.title,
            animeItem.originalTitle
          ) ||
          titlesMatch(
            item.originalTitle,
            animeItem.title
          );


        return (
          sameTitle &&
          Number(item.year) >
            0 &&
          Number(item.year) ===
            Number(
              animeItem.year
            )
        );
      }
    );
  });
}



async function searchGames(
  query
) {
  const rawgResults =
    await searchRAWG(query);


  // RAWG нашёл игру.
  // Steam не трогаем.
  if (
    rawgResults.length
  ) {
    return rawgResults;
  }


  // RAWG ничего не нашёл.
  // Используем Steam.
  return searchSteam(
    query
  );
}



export async function searchAll(
  query,
  activeTypes = new Set()
) {
  const text =
    query.trim();


  if (!text) {
    return [];
  }


  const all =
    activeTypes.size === 0;


  const wants = type =>
    all ||
    activeTypes.has(type);


  const searches = [];


  if (
    wants('movie') ||
    wants('series')
  ) {

    searches.push(
      searchTMDB(text).then(
        results => {

          if (
            wants('movie') &&
            wants('series')
          ) {
            return results;
          }


          return results.filter(
            item =>
              activeTypes.has(
                item.type
              )
          );
        }
      )
    );
  }


  if (wants('anime')) {

    searches.push(
      searchShikimori(
        text
      )
    );
  }


  if (wants('game')) {

    searches.push(
      searchGames(text)
    );
  }


  const results =
    await Promise.allSettled(
      searches
    );


  const combined =
    results
      .filter(
        result =>
          result.status ===
          'fulfilled'
      )
      .flatMap(
        result =>
          result.value
      );


  return removeAnimeDuplicates(
    dedupe(combined)
  );
}