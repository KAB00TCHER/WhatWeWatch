// js/auth.js

import {
  signUp,
  signIn,
  signOut,
  getCurrentUser as supabaseGetCurrentUser,
} from './supabase.js';


// =========================================================
// AUTH API
// =========================================================

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


// =========================================================
// AUTH UI
// =========================================================

let currentUser = null;

let mode = 'login';


function getElements() {
  return {
    // Account button
    accountButton:
      document.getElementById('account-button'),

    // Authentication modal
    authOverlay:
      document.getElementById('auth-overlay'),

    authForm:
      document.getElementById('auth-form'),

    authTitle:
      document.getElementById('auth-title'),

    authEmail:
      document.getElementById('auth-email'),

    authPassword:
      document.getElementById('auth-password'),

    authPasswordConfirm:
      document.getElementById(
        'auth-password-confirm'
      ),

    authPasswordConfirmField:
      document.getElementById(
        'auth-password-confirm-field'
      ),

    authSubmit:
      document.getElementById('auth-submit'),

    authSwitch:
      document.getElementById('auth-switch'),

    authSwitchText:
      document.getElementById('auth-switch-text'),

    authError:
      document.getElementById('auth-error'),

    // Account modal
    accountModal:
      document.getElementById('auth-modal'),

    accountEmail:
      document.getElementById('account-email'),

    accountLogout:
      document.getElementById('account-logout'),
  };
}


// =========================================================
// MODALS
// =========================================================

function openAuthModal(nextMode = 'login') {
  const els = getElements();

  mode = nextMode;

  const isLogin = mode === 'login';

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

  // Поле подтверждения пароля нужно
  // только при регистрации.
  if (els.authPasswordConfirmField) {
    els.authPasswordConfirmField.hidden =
      isLogin;
  }

  // При входе подтверждение пароля
  // не участвует в форме.
  if (els.authPasswordConfirm) {
    els.authPasswordConfirm.required =
      !isLogin;
  }

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

  els.accountModal.hidden = false;
}


function closeAccountModal() {
  const els = getElements();

  els.accountModal.hidden = true;
}


// =========================================================
// ACCOUNT BUTTON
// =========================================================

function updateAccountButton() {
  const els = getElements();

  if (!els.accountButton) {
    return;
  }

  if (currentUser) {
    els.accountButton.textContent =
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


// =========================================================
// ERROR
// =========================================================

function showAuthError(message) {
  const els = getElements();

  els.authError.textContent = message;
  els.authError.hidden = false;
}


// =========================================================
// FORM SUBMIT
// =========================================================

async function handleAuthSubmit(event) {
  event.preventDefault();

  const els = getElements();

  const email =
    els.authEmail.value.trim();

  const password =
    els.authPassword.value;

  const passwordConfirm =
    els.authPasswordConfirm.value;


  // -----------------------------------------
  // Basic validation
  // -----------------------------------------

  if (!email || !password) {
    showAuthError(
      'Заполни email и пароль.'
    );

    return;
  }


  // -----------------------------------------
  // Registration validation
  // -----------------------------------------

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


  // -----------------------------------------
  // Disable button
  // -----------------------------------------

  els.authSubmit.disabled = true;

  els.authSubmit.textContent =
    'Подождите...';

  els.authError.hidden = true;


  try {

    // ---------------------------------------
    // LOGIN
    // ---------------------------------------

    if (mode === 'login') {

      const data =
        await login(
          email,
          password
        );

          currentUser =
            data?.user ||
            await getCurrentUser();

          closeAuthModal();

          updateAccountButton();

          window.dispatchEvent(
            new CustomEvent('authchange', {
              detail: {
                user: currentUser,
              },
            })
          );

          console.log(
            '[auth] Login successful:',
            currentUser
          );

    }


    // ---------------------------------------
    // REGISTRATION
    // ---------------------------------------

    else {

      const data =
        await register(
          email,
          password
        );

              currentUser =
          data?.user ||
          await getCurrentUser();

        closeAuthModal();

        updateAccountButton();

        window.dispatchEvent(
          new CustomEvent('authchange', {
            detail: {
              user: currentUser,
            },
          })
        );

        console.log(
          '[auth] Registration successful:',
          currentUser
        );
    }


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

    els.authSubmit.disabled = false;

    els.authSubmit.textContent =
      mode === 'login'
        ? 'Войти'
        : 'Зарегистрироваться';
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

window.dispatchEvent(
  new CustomEvent('authchange', {
    detail: {
      user: null,
    },
  })
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

  const els = getElements();


  // -----------------------------------------
  // Check existing session
  // -----------------------------------------

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


  // -----------------------------------------
  // Account button
  // -----------------------------------------

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


  // -----------------------------------------
  // Auth form
  // -----------------------------------------

  els.authForm.addEventListener(
    'submit',
    handleAuthSubmit
  );


  // -----------------------------------------
  // Switch login / registration
  // -----------------------------------------

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


  // -----------------------------------------
  // Close auth modal by clicking backdrop
  // -----------------------------------------

  els.authOverlay.addEventListener(
    'click',
    (event) => {

      if (
        event.target ===
        els.authOverlay
      ) {
        closeAuthModal();
      }

    }
  );


  // -----------------------------------------
  // Close account modal by clicking backdrop
  // -----------------------------------------

  els.accountModal.addEventListener(
    'click',
    (event) => {

      if (
        event.target ===
        els.accountModal
      ) {
        closeAccountModal();
      }

    }
  );


  // -----------------------------------------
  // Logout
  // -----------------------------------------

  els.accountLogout.addEventListener(
    'click',
    handleLogout
  );


  console.log(
    '[auth] UI initialized'
  );
}