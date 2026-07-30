# WhatWeWatch

**Document version:** 1.0

## 1. Concept

WhatWeWatch is a web application for managing a personal or family library of
movies, TV series, anime, and games.

The main idea is to automate adding titles as much as possible: the user
enters a title, selects an option, and all information is filled in
automatically.

## 2. Goals

**Key**
- Minimal manual input
- Works on PCs and mobile devices
- Modern interface
- Free to use
- Multi-user mode

**Not included**
- Forum
- Comments
- Chat
- Content downloading

## 3. Technologies

**Frontend**
- HTML5
- CSS3
- Vanilla JavaScript (ES Modules)

**Backend**
- Firebase Hosting
- Firebase Authentication
- Firebase Firestore

**APIs**
- TMDB
- RAWG
- Shikimori

## 4. Architecture

```
frontend/
  index.html
  css/
    style.css
  js/
    app.js
    home.js
    api.js
    ui.js
    storage.js
    demoData.js
    tmdb.js
docs/
  PROJECT.md
```

## 5. File purpose

| File | Purpose |
|---|---|
| `app.js` | Application launch |
| `home.js` | Page logic |
| `api.js` | Working with all APIs and data conversion |
| `ui.js` | All interface rendering |
| `storage.js` | Local and cloud storage |
| `demoData.js` | Test database |
| `tmdb.js` | Working with TMDB |

## 6. Unified object model

Every title, regardless of provider, is represented the same way:

```
id, provider, providerId, title, originalTitle, type, year, rating,
poster, backdrop, description, runtime, episodes, playtime
```

## 7. Types

`movie` · `series` · `anime` · `game`

## 8. Search

Search should work:
- by Russian title
- by English title
- by partial match
- across multiple APIs simultaneously

## 9. User record

A user's relationship to a title (kept separate from the title's own data):

```
mediaId, provider, status, userRating, note, addedAt
```

## 10. Firebase

```
users/
  {uid}/
    library/
```

## 11. Development roadmap

1. Basic Architecture
2. TMDB
3. Shikimori
4. RAWG
5. General Search
6. Library
7. Authorization
8. Adaptivity
9. Optimization
10. Release

## 12. Principles

- The UI is independent of the API.
- Every API is aligned to a single model.
- One file, one area of responsibility.
- The project remains fully functional after each stage.

---

## Status

**Stages 1–4 — Basic Architecture, TMDB, Shikimori, RAWG: done.** Movies,
series, anime, and games all search against real providers now, normalized
into the same shape and stored the same way:

- `storage.js` implements the library (add / update / remove / list) against
  `localStorage`, but only through the functions it exports — when Stage 7
  swaps in Firestore, nothing in `home.js`, `ui.js`, or `api.js` needs to
  change.
- `tmdb.js` — real search + details. Fires an English and a Russian search
  in parallel and merges them, which covers Section 8's bilingual
  requirement reasonably well for movies/series (TMDB decides what matches
  in each language, so it's a heuristic, not a guarantee).
- `shikimori.js` — real search + details for anime. **Needs no API key at
  all** — Shikimori's read endpoints are open. Its own search already
  matches both romaji and Russian titles in one request.
- `rawg.js` — real search + details for games.
- `api.js` fans out to all three, merges + dedupes the results, and falls
  back to the demo catalogue only if every provider is unconfigured or
  fails — so the app degrades gracefully rather than showing nothing.
- **Two technical findings that shaped this:**
  - *CORS:* Shikimori's and RAWG's APIs don't send the browser headers
    needed for direct client-side `fetch()` calls (confirmed against both
    directly) — TMDB does. Both files route through a free CORS proxy
    (AllOrigins) as a zero-setup fix. It has no uptime SLA, so if searches
    for anime/games get flaky, that proxy is the first thing to check —
    swapping in your own relay (e.g. a Firebase Cloud Function) is a
    drop-in replacement, see the comment at the top of `shikimori.js`.
  - *Russia access:* TMDB deliberately blocks Russian and Belarusian IP
    addresses (their own policy since 2022, confirmed still active) — no
    code change fixes this, a VPN is the only workaround for TMDB
    specifically. Shikimori and RAWG (via the proxy) aren't affected.
- Authorization, adaptivity polish, and optimization (Stages 7–9) are not
  started.

### Getting started

1. **Run it locally.** The JS files are ES Modules, so opening `index.html`
   directly (`file://`) won't work — browsers block module imports over
   `file://`. Serve the `frontend/` folder instead, e.g.:
   ```
   npx serve frontend
   ```
   or use any static server / editor extension (VS Code's Live Server, etc.).

2. **TMDB (movies & series)** — free key, ~2 minutes:
   1. Create an account at [themoviedb.org](https://www.themoviedb.org/).
   2. Go to your account **Settings → API** → request an API key (choose
      the "Developer" option, fill in the short form — any description of
      a personal project is fine).
   3. Copy the **"API Key (v3 auth)"** value (not the longer "Read Access
      Token").
   4. Open `frontend/js/tmdb.js` and replace `TMDB_API_KEY` with it.

3. **RAWG (games)** — free key, ~2 minutes:
   1. Go to [rawg.io/apidocs](https://rawg.io/apidocs) and sign up.
   2. Fill in the short developer-info form.
   3. Copy the key shown at the bottom of the page.
   4. Open `frontend/js/rawg.js` and replace `RAWG_API_KEY` with it.

4. **Shikimori (anime)** — nothing to do, it already works.

5. **Everything else works with no configuration**: the library, status/
   rating/note editing, and type filters all run on `localStorage` already.
