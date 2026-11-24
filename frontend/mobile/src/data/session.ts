// Session of the client app (RF-M01, RNF-G03), on the accounts of the
// database shared with the web panel (frontend/shared/auth.ts). It lasts
// 8 hours. On the web it is kept in localStorage; on a phone, in memory.
import { useSyncExternalStore } from 'react';
import * as auth from '@shared/auth';
import { subscribe as onDataChange } from '@shared/store';
import type { Account } from '@shared/types';
import { DEMO_CLIENT, setClient } from './demo';
import { loadClientShop } from './shop';
import { loadClientNotifications } from './notifications';

let lastEmail: string | null | undefined;

// Keeps `client` and the client's in-memory data in step with the session.
function sync() {
  const account = auth.sessionAccount('app');
  const email = account?.email ?? null;
  if (email === lastEmail) return account;
  lastEmail = email;
  setClient(account);
  // Orders, points and notifications of the sample data are Andrea's.
  const samples = email === DEMO_CLIENT.email;
  loadClientShop(samples);
  loadClientNotifications(samples);
  return account;
}

// Before any screen renders, and again whenever the session or the data
// change (outside rendering, since it updates other stores).
sync();
function subscribe(listener: () => void) {
  const changed = () => {
    sync();
    listener();
  };
  const offSession = auth.onSessionChange(changed);
  const offData = onDataChange(changed);
  return () => {
    offSession();
    offData();
  };
}

const current = () => auth.sessionAccount('app');
export function useSessionAccount(): Account | null {
  return useSyncExternalStore(subscribe, current, current);
}

export async function signIn(email: string, password: string) {
  const account = await auth.signIn('app', email, password);
  sync();
  return account;
}

export async function signUp(form: { name: string; email: string; phone: string; password: string }) {
  const account = await auth.signUpClient(form);
  sync();
  return account;
}

export function signOut() {
  auth.signOut('app');
  sync();
}
