// js/auth.js
import {
  signUp,
  signIn,
  signOut,
  getAccessToken,
  getCurrentUser as supabaseGetCurrentUser,
} from './supabase.js';

// =========================================================
// AUTH API
// =========================================================

export function register(
  email,
  password
) {
  return signUp(
    email,
    password
  );
}


export function login(
  email,
  password
) {
  return signIn(
    email,
    password
  );
}


export function logout() {
  return signOut();
}


export function getCurrentUser() {
  return supabaseGetCurrentUser();
}


// =========================================================
// STATE
// =========================================================

let currentUser = null;
let mode = 'login';
let telegramLinked = false;

let elements = null;


// =========================================================
// DOM
// =========================================================

function getElements() {
  if (elements) {
    return elements;
  }

  elements = {
    accountButton:
      document.getElementById(
        'account-button'
      ),

    authOverlay:
      document.getElementById(
        'auth-overlay'
      ),

    authForm:
      document.getElementById(
        'auth-form'
      ),

    authTitle:
      document.getElementById(
        'auth-title'
      ),

    authEmail:
      document.getElementById(
        'auth-email'
      ),

    authPassword:
      document.getElementById(
        'auth-password'
      ),

    authPasswordConfirm:
      document.getElementById(
        'auth-password-confirm'
      ),

    authPasswordConfirmField:
      document.getElementById(
        'auth-password-confirm-field'
      ),

    authSubmit:
      document.getElementById(
        'auth-submit'
      ),

    authSwitch:
      document.getElementById(
        'auth-switch'
      ),

    authSwitchText:
      document.getElementById(
        'auth-switch-text'
      ),

    authError:
      document.getElementById(
        'auth-error'
      ),

    accountModal:
      document.getElementById(
        'auth-modal'
      ),

    accountEmail:
      document.getElementById(
        'account-email'
      ),

    accountLogout:
      document.getElementById(
        'account-logout'
      ),

      telegramLinkButton:
  document.getElementById(
    'telegram-link-button'
  ),

telegramLinkStatus:
  document.getElementById(
    'telegram-link-status'
  ),
  };

  return elements;
}


// =========================================================
// AUTH CHANGE EVENT
// =========================================================

function dispatchAuthChange(
  user
) {
  window.dispatchEvent(
    new CustomEvent(
      'authchange',
      {
        detail: {
          user,
        },
      }
    )
  );
}


// =========================================================
// MODALS
// =========================================================

function openAuthModal(
  nextMode = 'login'
) {
  const els =
    getElements();

  mode = nextMode;

  const isLogin =
    mode === 'login';

  els.authTitle.textContent =
    isLogin
      ? 'Вход'
      : 'Регистрация';

  els.authSubmit.textContent =
    isLogin
      ? 'Войти'
      : 'Зарегистрироваться';

  els.authSwitchText.textContent =
    isLogin
      ? 'Нет аккаунта?'
      : 'Уже есть аккаунт?';

  els.authSwitch.textContent =
    isLogin
      ? 'Зарегистрироваться'
      : 'Войти';

  els.authPasswordConfirmField.hidden =
    isLogin;

  els.authPasswordConfirm.required =
    !isLogin;

  els.authError.hidden = true;
  els.authError.textContent = '';

  els.authForm.reset();

  els.authOverlay.hidden = false;

  requestAnimationFrame(() => {
    els.authEmail.focus();
  });
}


function closeAuthModal() {
  getElements()
    .authOverlay
    .hidden = true;
}


function openAccountModal() {
  const els =
    getElements();

  els.accountEmail.textContent =
    currentUser?.email || '';

  const telegramAvailable =
    Boolean(
      window.Telegram?.WebApp?.initData
    );

  els.telegramLinkButton.hidden =
    !telegramAvailable;

  els.telegramLinkButton.disabled =
    telegramLinked;

  els.telegramLinkButton.textContent =
    telegramLinked
      ? 'Telegram привязан'
      : 'Привязать Telegram';

  els.telegramLinkStatus.hidden =
    !telegramLinked;

  els.telegramLinkStatus.textContent =
    telegramLinked
      ? 'Telegram успешно привязан к этому аккаунту.'
      : '';

  els.accountModal.hidden = false;
}


function closeAccountModal() {
  getElements()
    .accountModal
    .hidden = true;
}


// =========================================================
// ACCOUNT BUTTON
// =========================================================

function updateAccountButton() {
  const button =
    getElements()
      .accountButton;

  if (!button) {
    return;
  }

  if (currentUser) {
    button.textContent =
      currentUser.email;

    button.classList.add(
      'is-authenticated'
    );

    return;
  }

  button.textContent =
    'Войти';

  button.classList.remove(
    'is-authenticated'
  );
}


// =========================================================
// ERROR
// =========================================================

function showAuthError(
  message
) {
  const error =
    getElements()
      .authError;

  error.textContent =
    message;

  error.hidden = false;
}


// =========================================================
// SUBMIT
// =========================================================

async function handleAuthSubmit(
  event
) {
  event.preventDefault();

  const els =
    getElements();

  const email =
    els.authEmail.value.trim();

  const password =
    els.authPassword.value;

  const passwordConfirm =
    els.authPasswordConfirm.value;

  if (!email || !password) {
    showAuthError(
      'Заполни email и пароль.'
    );

    return;
  }

  if (mode === 'register') {
    if (password.length < 6) {
      showAuthError(
        'Пароль должен содержать минимум 6 символов.'
      );

      return;
    }

    if (
      password !==
      passwordConfirm
    ) {
      showAuthError(
        'Пароли не совпадают.'
      );

      return;
    }
  }

  els.authSubmit.disabled =
    true;

  els.authSubmit.textContent =
    'Подождите...';

  els.authError.hidden =
    true;

  try {
    const request =
      mode === 'login'
        ? login
        : register;

    const data =
      await request(
        email,
        password
      );

    currentUser =
      data?.user ||
      await getCurrentUser();

    closeAuthModal();
    updateAccountButton();

    dispatchAuthChange(
      currentUser
    );

    console.log(
      `[auth] ${
        mode === 'login'
          ? 'Login'
          : 'Registration'
      } successful:`,
      currentUser
    );

  } catch (error) {
    console.error(
      '[auth] Error:',
      error
    );

    showAuthError(
      error?.message ||
      'Не удалось выполнить операцию.'
    );

  } finally {
    els.authSubmit.disabled =
      false;

    els.authSubmit.textContent =
      mode === 'login'
        ? 'Войти'
        : 'Зарегистрироваться';
  }
}


// =========================================================
// TELEGRAM LINK
// =========================================================

async function handleTelegramLink() {
  const els = getElements();

  const telegram = window.Telegram?.WebApp;
  const initData = telegram?.initData;
  const accessToken = getAccessToken();

  if (!initData || !accessToken) {
    els.telegramLinkStatus.textContent =
      'Не удалось получить данные Telegram или сессию аккаунта.';

    els.telegramLinkStatus.hidden = false;
    return;
  }

  els.telegramLinkButton.disabled = true;
  els.telegramLinkButton.textContent = 'Привязываем...';

  els.telegramLinkStatus.hidden = true;

  try {
    const response = await fetch('/api/telegram-link', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },

      body: JSON.stringify({
        initData,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error || 'Не удалось привязать Telegram.'
      );
    }

    telegramLinked = true;

    els.telegramLinkButton.textContent =
      'Telegram привязан';

    els.telegramLinkStatus.textContent =
      data.alreadyLinked
        ? 'Этот Telegram уже привязан к вашему аккаунту.'
        : 'Telegram успешно привязан к вашему аккаунту.';

    els.telegramLinkStatus.hidden = false;

    console.log('[auth] Telegram linked');

  } catch (error) {
    console.error('[auth] Telegram linking failed:', error);

    els.telegramLinkStatus.textContent =
      error?.message ||
      'Не удалось привязать Telegram.';

    els.telegramLinkStatus.hidden = false;

    els.telegramLinkButton.disabled = false;
    els.telegramLinkButton.textContent =
      'Привязать Telegram';
  }
}

// =========================================================
// LOGOUT
// =========================================================

async function handleLogout() {
  try {
    await logout();

    currentUser = null;

    closeAccountModal();
    updateAccountButton();

    dispatchAuthChange(
      null
    );

    console.log(
      '[auth] Logged out'
    );

  } catch (error) {
    console.error(
      '[auth] Logout failed:',
      error
    );
  }
}


// =========================================================
// INITIALIZATION
// =========================================================

export async function initAuthUI() {
  const els =
    getElements();

  try {
    currentUser =
      await getCurrentUser();

  } catch (error) {
    console.error(
      '[auth] Failed to restore session:',
      error
    );

    currentUser = null;
  }

  updateAccountButton();

  els.accountButton.addEventListener(
    'click',
    () => {
      if (currentUser) {
        openAccountModal();
      } else {
        openAuthModal('login');
      }
    }
  );

  els.authForm.addEventListener(
    'submit',
    handleAuthSubmit
  );

  els.authSwitch.addEventListener(
    'click',
    () => {
      openAuthModal(
        mode === 'login'
          ? 'register'
          : 'login'
      );
    }
  );

  els.authOverlay.addEventListener(
    'click',
    event => {
      if (
        event.target ===
        els.authOverlay
      ) {
        closeAuthModal();
      }
    }
  );

  els.accountModal.addEventListener(
    'click',
    event => {
      if (
        event.target ===
        els.accountModal
      ) {
        closeAccountModal();
      }
    }
  );

  els.accountLogout.addEventListener(
    'click',
    handleLogout
  );

  els.telegramLinkButton.addEventListener(
  'click',
  handleTelegramLink
);

  console.log(
    '[auth] UI initialized'
  );
}