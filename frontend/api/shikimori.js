const BASE_URL = 'https://shikimori.one/api';

export default async function handler(req, res) {
  try {
    const { q, id } = req.query;

    let url;

    if (id) {
      url = `${BASE_URL}/animes/${id}`;
    } else if (q) {
      url = new URL(`${BASE_URL}/animes`);
      url.searchParams.set('search', q);
      url.searchParams.set('limit', '20');
    } else {
      return res.status(400).json({
        error: 'Missing q or id'
      });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WhatWeWatch'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Shikimori ${response.status}`
      });
    }

    const data = await response.json();

    res.status(200).json(data);

  } catch (error) {
    console.error('[api/shikimori]', error);

    res.status(500).json({
      error: 'Internal server error'
    });
  }
}