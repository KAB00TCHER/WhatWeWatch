// js/auth.js

import {
  signUp,
  signIn,
  signOut,
  getCurrentUser as supabaseGetCurrentUser,
  getProfile,
} from './supabase.js';

export async function register(email, password) {
  return signUp(email, password);
}

export async function login(email, password) {
  return signIn(email, password);
}

export async function logout() {
  return signOut();
}

export async function getCurrentUser() {
  return supabaseGetCurrentUser();
}


/* =========================================================
   AUTH UI
========================================================= */

let currentUser = null;
let currentProfile = null;

function getElements() {
  return {
    accountButton: document.getElementById('account-button'),
    accountLabel: document.getElementById('account-label'),

    authOverlay: document.getElementById('auth-overlay'),
    authModal: document.getElementById('auth-modal'),

    authForm: document.getElementById('auth-form'),
    authTitle: document.getElementById('auth-title'),

    authIdentifier: document.getElementById('auth-identifier'),
    authUsername: document.getElementById('auth-username'),
    authPassword: document.getElementById('auth-password'),
    authPasswordConfirm: document.getElementById('auth-password-confirm'),

    authSubmit: document.getElementById('auth-submit'),
    authSwitch: document.getElementById('auth-switch'),
    authSwitchText: document.getElementById('auth-switch-text'),

    authError: document.getElementById('auth-error'),

    accountEmail: document.getElementById('account-email'),
    accountLogout: document.getElementById('account-logout'),
  };
}

let mode = 'login';

function openAuthModal(nextMode = 'login') {
  const els = getElements();

  mode = nextMode;

  els.authTitle.textContent =
    mode === 'login'
      ? 'Вход'
      : 'Регистрация';

  els.authSubmit.textContent =
    mode === 'login'
      ? 'Войти'
      : 'Зарегистрироваться';

  els.authSwitchText.textContent =
    mode === 'login'
      ? 'Нет аккаунта?'
      : 'Уже есть аккаунт?';

  els.authSwitch.textContent =
    mode === 'login'
      ? 'Зарегистрироваться'
      : 'Войти';

    document.getElementById(
    'auth-password-confirm-field'
    ).hidden = mode === 'login';
        
    document.getElementById(
    'auth-username-field'
    ).hidden = mode === 'login';

  els.authError.hidden = true;
  els.authError.textContent = '';

  els.authForm.reset();

  els.authOverlay.hidden = false;

  setTimeout(() => {
        if (mode === 'login') {
    els.authIdentifier.focus();
    } else {
    els.authUsername.focus();
    }
  }, 0);
}

function closeAuthModal() {
  const els = getElements();

  els.authOverlay.hidden = true;
}

function openAccountModal() {
  const els = getElements();

  els.accountEmail.textContent =
    currentProfile?.username ||
    currentUser?.email ||
    '';

  els.authModal.hidden = false;
}

function closeAccountModal() {
  const els = getElements();

  els.authModal.hidden = true;
}

function updateAccountButton() {
  const els = getElements();

  if (!els.accountButton) return;

  if (currentUser) {

    els.accountButton.textContent =
      currentProfile?.username ||
      currentUser.email;

    els.accountButton.classList.add(
      'is-authenticated'
    );

  } else {

    els.accountButton.textContent = 'Войти';

    els.accountButton.classList.remove(
      'is-authenticated'
    );
  }
}

function showAuthError(message) {
  const els = getElements();

  els.authError.textContent = message;
  els.authError.hidden = false;
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const els = getElements();

    const identifier = els.authIdentifier.value.trim();
    const username = els.authUsername.value.trim();
    const password = els.authPassword.value;
    const passwordConfirm =
    els.authPasswordConfirm.value;

if (!identifier || !password) {
  showAuthError(
    'Заполни логин и пароль.'
  );

  return;
}

  if (mode === 'register') {
    if (username) {
  if (
    username.length < 3 ||
    username.length > 24
  ) {
    showAuthError(
      'Никнейм должен содержать от 3 до 24 символов.'
    );

    return;
  }

  if (
    /[\s@]/.test(username)
  ) {
    showAuthError(
      'Никнейм не должен содержать пробелы или @.'
    );

    return;
  }
}
  }

  els.authSubmit.disabled = true;
  els.authSubmit.textContent = 'Подождите...';

  els.authError.hidden = true;

  try {
    if (mode === 'login') {
      const data = await login(identifier, password);

      currentUser = data?.user || await getCurrentUser();
      if (currentUser) {
  currentProfile =
    await getProfile(currentUser.id);
}

      closeAuthModal();

      updateAccountButton();

    } else {
      const data = await register(identifier, password);

      currentUser = data?.user || await getCurrentUser();
      if (currentUser) {
  currentProfile =
    await getProfile(currentUser.id);
}

      closeAuthModal();

      updateAccountButton();
    }

  } catch (error) {
    console.error('[auth]', error);

    showAuthError(
      error?.message ||
      'Не удалось выполнить операцию.'
    );

  } finally {
    els.authSubmit.disabled = false;

    els.authSubmit.textContent =
      mode === 'login'
        ? 'Войти'
        : 'Зарегистрироваться';
  }
}

async function handleLogout() {
  const els = getElements();

  try {
    await logout();

    currentUser = null;
    currentProfile = null;
    closeAccountModal();

    updateAccountButton();

  } catch (error) {
    console.error('[auth] logout failed', error);
  }
}

export async function initAuthUI() {
  const els = getElements();

currentUser = await getCurrentUser();

if (currentUser) {
  currentProfile =
    await getProfile(currentUser.id);
} else {
  currentProfile = null;
}

updateAccountButton();

  els.accountButton.addEventListener('click', () => {
    if (currentUser) {
      openAccountModal();
    } else {
      openAuthModal('login');
    }
  });

  els.authForm.addEventListener(
    'submit',
    handleAuthSubmit
  );

  els.authSwitch.addEventListener('click', () => {
    openAuthModal(
      mode === 'login'
        ? 'register'
        : 'login'
    );
  });

  els.authOverlay.addEventListener('click', (event) => {
    if (event.target === els.authOverlay) {
      closeAuthModal();
    }
  });

  els.authModal.addEventListener('click', (event) => {
    if (event.target === els.authModal) {
      closeAccountModal();
    }
  });

  els.accountLogout.addEventListener(
    'click',
    handleLogout
  );
}