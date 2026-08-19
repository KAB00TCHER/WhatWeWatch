// js/app.js

import {
  register,
  login,
  logout,
  getUser,
} from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[auth] testing Supabase connection...');

  try {
    const user = await getUser();

    console.log('[auth] current user:', user);

    window.WhatWeWatchAuth = {
      register,
      login,
      logout,
      getUser,
    };

    console.log(
      '[auth] Auth API is ready. Use window.WhatWeWatchAuth in console.'
    );

  } catch (err) {
    console.error('[auth] initialization failed:', err);
  }
});