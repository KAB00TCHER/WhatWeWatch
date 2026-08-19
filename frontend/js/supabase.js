// js/supabase.js

const SUPABASE_URL =
  'https://ppakdykkaocmvfncabun.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_pi8y8cdWltiYD8SIrHJ2cQ_LZ9e_Aao';


const AUTH_URL =
  `${SUPABASE_URL}/auth/v1`;


function authHeaders(accessToken = null) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,

    Authorization:
      `Bearer ${
        accessToken ||
        SUPABASE_PUBLISHABLE_KEY
      }`,

    'Content-Type': 'application/json',
  };
}


async function authRequest(
  path,
  options = {}
) {
  const response = await fetch(
    `${AUTH_URL}${path}`,
    {
      ...options,

      headers: {
        ...authHeaders(
          options.accessToken
        ),

        ...(options.headers || {}),
      },
    }
  );


  const text =
    await response.text();


  let data = null;


  try {
    data = text
      ? JSON.parse(text)
      : null;

  } catch {
    data = text;
  }


  if (!response.ok) {

    const message =
      data?.msg ||
      data?.message ||
      data?.error_description ||
      data?.error ||
      `Supabase Auth error ${response.status}`;


    throw new Error(message);
  }


  return data;
}


// =========================================================
// SIGN UP
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


  if (data?.access_token) {

    localStorage.setItem(
      'whatwewatch:session',
      JSON.stringify(data)
    );
  }


  return data;
}


// =========================================================
// SIGN IN
// =========================================================

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


  if (data?.access_token) {

    localStorage.setItem(
      'whatwewatch:session',
      JSON.stringify(data)
    );
  }


  return data;
}


// =========================================================
// SIGN OUT
// =========================================================

export async function signOut() {

  const session =
    getSession();


  if (session?.access_token) {

    try {

      await authRequest(
        '/logout',
        {
          method: 'POST',

          accessToken:
            session.access_token,
        }
      );

    } catch (err) {

      console.warn(
        '[auth] logout request failed',
        err
      );
    }
  }


  localStorage.removeItem(
    'whatwewatch:session'
  );
}


// =========================================================
// SESSION
// =========================================================

export function getSession() {

  try {

    const raw =
      localStorage.getItem(
        'whatwewatch:session'
      );


    return raw
      ? JSON.parse(raw)
      : null;

  } catch {

    return null;
  }
}


export function getAccessToken() {

  return (
    getSession()?.access_token ||
    null
  );
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

  } catch (err) {

    console.warn(
      '[auth] session is invalid:',
      err
    );


    localStorage.removeItem(
      'whatwewatch:session'
    );


    return null;
  }
}


// =========================================================
// SUPABASE DATABASE REQUEST
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


  const response =
    await fetch(
      `${SUPABASE_URL}/rest/v1/${path}`,

      {
        ...options,

        headers: {

          apikey:
            SUPABASE_PUBLISHABLE_KEY,

          Authorization:
            `Bearer ${token}`,

          'Content-Type':
            'application/json',

          ...(options.headers || {}),
        },
      }
    );


  const text =
    await response.text();


  let data = null;


  try {

    data = text
      ? JSON.parse(text)
      : null;

  } catch {

    data = text;
  }


  if (!response.ok) {

    throw new Error(
      `Supabase ${response.status}: ${text}`
    );
  }


  return data;
}