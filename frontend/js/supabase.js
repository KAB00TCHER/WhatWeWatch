// js/supabase.js
//
// Единая точка работы с:
// - Supabase Auth
// - Supabase REST API
// - локальной сессией
// =========================================================


const SUPABASE_URL =
  'https://ppakdykkaocmvfncabun.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_pi8y8cdWltiYD8SIrHJ2cQ_LZ9e_Aao';

const SESSION_KEY =
  'whatwewatch:session';

const AUTH_URL =
  `${SUPABASE_URL}/auth/v1`;

const REST_URL =
  `${SUPABASE_URL}/rest/v1`;


// =========================================================
// HEADERS
// =========================================================

function authHeaders(accessToken = null) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,

    Authorization:
      `Bearer ${
        accessToken ||
        SUPABASE_PUBLISHABLE_KEY
      }`,

    'Content-Type':
      'application/json',
  };
}


// =========================================================
// RESPONSE PARSING
// =========================================================

async function parseResponse(response) {
  const text =
    await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}


function getErrorMessage(
  data,
  fallback
) {
  return (
    data?.msg ||
    data?.message ||
    data?.error_description ||
    data?.error ||
    fallback
  );
}


// =========================================================
// AUTH REQUEST
// =========================================================

async function authRequest(
  path,
  options = {}
) {
  const {
    accessToken,
    headers,
    ...fetchOptions
  } = options;

  const response =
    await fetch(
      `${AUTH_URL}${path}`,
      {
        ...fetchOptions,

        headers: {
          ...authHeaders(accessToken),
          ...(headers || {}),
        },
      }
    );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        `Supabase Auth error ${response.status}`
      )
    );
  }

  return data;
}


// =========================================================
// SESSION
// =========================================================

export function getSession() {
  try {
    const raw =
      localStorage.getItem(
        SESSION_KEY
      );

    return raw
      ? JSON.parse(raw)
      : null;

  } catch (error) {
    console.warn(
      '[supabase] failed to read session:',
      error
    );

    return null;
  }
}


function saveSession(data) {
  if (!data?.access_token) {
    return;
  }

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(data)
  );
}


function clearSession() {
  localStorage.removeItem(
    SESSION_KEY
  );
}


export function getAccessToken() {
  return (
    getSession()?.access_token ||
    null
  );
}


// =========================================================
// AUTH
// =========================================================

export async function signUp(
  email,
  password
) {
  const data =
    await authRequest(
      '/signup',
      {
        method: 'POST',

        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

  saveSession(data);

  return data;
}


export async function signIn(
  email,
  password
) {
  const data =
    await authRequest(
      '/token?grant_type=password',
      {
        method: 'POST',

        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

  saveSession(data);

  return data;
}


export async function signOut() {
  const token =
    getAccessToken();

  if (token) {
    try {
      await authRequest(
        '/logout',
        {
          method: 'POST',
          accessToken: token,
        }
      );

    } catch (error) {
      console.warn(
        '[supabase] logout request failed:',
        error
      );
    }
  }

  clearSession();
}


// =========================================================
// CURRENT USER
// =========================================================

export async function getCurrentUser() {
  const token =
    getAccessToken();

  if (!token) {
    return null;
  }

  try {
    return await authRequest(
      '/user',
      {
        method: 'GET',
        accessToken: token,
      }
    );

  } catch (error) {
    console.warn(
      '[supabase] session is invalid:',
      error
    );

    clearSession();

    return null;
  }
}


// =========================================================
// DATABASE REQUEST
// =========================================================

export async function supabaseRequest(
  path,
  options = {}
) {
  const token =
    getAccessToken();

  if (!token) {
    throw new Error(
      'Not authenticated'
    );
  }

  const {
    headers,
    ...fetchOptions
  } = options;

  const response =
    await fetch(
      `${REST_URL}/${path}`,
      {
        ...fetchOptions,

        headers: {
          apikey:
            SUPABASE_PUBLISHABLE_KEY,

          Authorization:
            `Bearer ${token}`,

          'Content-Type':
            'application/json',

          ...(headers || {}),
        },
      }
    );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        `Supabase ${response.status}`
      )
    );
  }

  return data;
}