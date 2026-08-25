const STEAM_STORE_URL =
  'https://store.steampowered.com';

const STEAM_CDN =
  'https://cdn.cloudflare.steamstatic.com/steam/apps';

const STEAM_TIMEOUT_MS = 5000;


async function fetchSteam(url) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      STEAM_TIMEOUT_MS
    );


  try {
    return await fetch(url, {
      signal:
        controller.signal,

      headers: {
        'User-Agent':
          'WhatWeWatch/1.0',
      },
    });

  } finally {
    clearTimeout(timeout);
  }
}


export default async function handler(
  req,
  res
) {
  try {

    /*
     * Steam image proxy
     */
    if (req.query.image) {

      const imageUrl =
        `${STEAM_CDN}/${req.query.image}`;


      const response =
        await fetch(imageUrl);


      if (!response.ok) {
        return res
          .status(
            response.status
          )
          .end();
      }


      const contentType =
        response.headers.get(
          'content-type'
        ) ||
        'image/jpeg';


      const buffer =
        Buffer.from(
          await response.arrayBuffer()
        );


      res.setHeader(
        'Content-Type',
        contentType
      );


      res.setHeader(
        'Cache-Control',
        'public, max-age=86400'
      );


      return res
        .status(200)
        .send(buffer);
    }


    const {
      q,
      id
    } = req.query;


    let url;


    /*
     * Получение подробностей игры
     */
    if (id) {

      url = new URL(
        `${STEAM_STORE_URL}/api/appdetails`
      );


      url.searchParams.set(
        'appids',
        id
      );


      url.searchParams.set(
        'l',
        'russian'
      );


      url.searchParams.set(
        'cc',
        'ru'
      );


    /*
     * Поиск игр
     */
    } else if (q) {

      url = new URL(
        `${STEAM_STORE_URL}/api/storesearch`
      );


      url.searchParams.set(
        'term',
        q
      );


      url.searchParams.set(
        'l',
        'russian'
      );


      url.searchParams.set(
        'cc',
        'ru'
      );


      url.searchParams.set(
        'count',
        '20'
      );


      url.searchParams.set(
        'category1',
        '998'
      );


    } else {

      return res.status(400).json({
        error:
          'Missing q or id',
      });
    }


    const response =
      await fetchSteam(url);


    if (!response.ok) {

      return res
        .status(
          response.status
        )
        .json({
          error:
            `Steam ${response.status}`,
        });
    }


    const data =
      await response.json();


    return res
      .status(200)
      .json(data);


  } catch (error) {

    if (
      error?.name ===
      'AbortError'
    ) {

      console.warn(
        '[steam] request timed out'
      );


      return res
        .status(504)
        .json({
          error:
            'Steam request timed out',
        });
    }


    console.error(
      '[steam] request failed',
      error
    );


    return res
      .status(502)
      .json({
        error:
          'Steam unavailable',
      });
  }
}