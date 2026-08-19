// js/auth.js

import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
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

export async function getUser() {
  return getCurrentUser();
}