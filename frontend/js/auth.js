// js/auth.js

import {
  register as supabaseRegister,
  login as supabaseLogin,
  logout as supabaseLogout,
  getUser,
} from './supabase.js';

export async function register(email, password) {
  return supabaseRegister(email, password);
}

export async function login(email, password) {
  return supabaseLogin(email, password);
}

export async function logout() {
  return supabaseLogout();
}

export async function getCurrentUser() {
  return getUser();
}


/* =========================================================
   AUTH UI
========================================================= */

let currentUser = null;

function getElements() {
  return {
    accountButton: document.getElementById('account-button'),
    accountLabel: document.getElementById('account-label'),

    authOverlay: document.getElementById('auth-overlay'),
    authModal: document.getElementById('auth-modal'),

    authForm: document.getElementById('auth-form'),
    authTitle: document.getElementById('auth-title'),

    authEmail: document.getElementById('auth-email'),
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

  els.authError.hidden = true;
  els.authError.textContent = '';

  els.authForm.reset();

  els.authOverlay.hidden = false;

  setTimeout(() => {
    els.authEmail.focus();
  }, 0);
}

function closeAuthModal() {
  const els = getElements();

  els.authOverlay.hidden = true;
}

function openAccountModal() {
  const els = getElements();

  els.accountEmail.textContent =
    currentUser?.email || '';

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
    els.accountButton.textContent = currentUser.email;
    els.accountButton.classList.add('is-authenticated');
  } else {
    els.accountButton.textContent = 'Войти';
    els.accountButton.classList.remove('is-authenticated');
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

  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  const passwordConfirm = els.authPasswordConfirm.value;

  if (!email || !password) {
    showAuthError('Заполни email и пароль.');
    return;
  }

  if (mode === 'register') {
    if (password.length < 6) {
      showAuthError(
        'Пароль должен содержать минимум 6 символов.'
      );
      return;
    }

    if (password !== passwordConfirm) {
      showAuthError(
        'Пароли не совпадают.'
      );
      return;
    }
  }

  els.authSubmit.disabled = true;
  els.authSubmit.textContent = 'Подождите...';

  els.authError.hidden = true;

  try {
    if (mode === 'login') {
      const data = await login(email, password);

      currentUser = data?.user || await getCurrentUser();

      closeAuthModal();

      updateAccountButton();

    } else {
      const data = await register(email, password);

      currentUser = data?.user || await getCurrentUser();

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

    closeAccountModal();

    updateAccountButton();

  } catch (error) {
    console.error('[auth] logout failed', error);
  }
}

export async function initAuthUI() {
  const els = getElements();

  currentUser = await getCurrentUser();

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