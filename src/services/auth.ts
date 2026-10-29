import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/calendar.readonly');

const REAL_TOKEN_KEY = 'gcal_real_access_token';

let cachedAccessToken: string | null = null;

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Restore a previously authorized session. Only a *real* Google access token
 * counts as a session; there is no synthetic/offline user.
 */
export const initAuth = (
  onAuthSuccess?: (user: AppUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  const savedUser = localStorage.getItem('gcal_active_user');
  const savedToken = localStorage.getItem(REAL_TOKEN_KEY);

  if (savedUser && savedToken) {
    try {
      const parsed = JSON.parse(savedUser) as AppUser;
      if (parsed?.email) {
        cachedAccessToken = savedToken;
        if (onAuthSuccess) onAuthSuccess(parsed, savedToken);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    } catch {
      localStorage.removeItem('gcal_active_user');
      localStorage.removeItem(REAL_TOKEN_KEY);
      if (onAuthFailure) onAuthFailure();
    }
  } else if (onAuthFailure) {
    onAuthFailure();
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (!user) return;
    // Firebase session alone carries no Calendar scope; keep it only when a real
    // access token was already obtained through the OAuth popup.
    const token = cachedAccessToken || localStorage.getItem(REAL_TOKEN_KEY);
    if (!token) return;

    const appUser: AppUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
    localStorage.setItem('gcal_active_user', JSON.stringify(appUser));
    if (onAuthSuccess) onAuthSuccess(appUser, token);
  });
};

/**
 * Firebase Google popup sign-in. Throws on failure — the caller must fall back to
 * the real OAuth / access-token / iCal-URL flows in CloudSyncModal. A fake local
 * session is never fabricated.
 */
export const googleSignIn = async (): Promise<{ user: AppUser; accessToken: string }> => {
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error(
      'Google không trả về access token. Vui lòng cấp quyền Calendar hoặc dùng Access Token / iCal URL trong hộp thoại đồng bộ.'
    );
  }

  cachedAccessToken = accessToken;
  const appUser: AppUser = {
    uid: result.user.uid,
    email: result.user.email,
    displayName: result.user.displayName,
    photoURL: result.user.photoURL,
  };

  localStorage.setItem('gcal_active_user', JSON.stringify(appUser));
  localStorage.setItem(REAL_TOKEN_KEY, accessToken);
  return { user: appUser, accessToken };
};

/** Store a token obtained through Google Identity Services / OAuth Playground. */
export const setAccessToken = (token: string) => {
  cachedAccessToken = token;
  localStorage.setItem(REAL_TOKEN_KEY, token);
};

/** Returns a real access token or null. Never returns a sentinel placeholder. */
export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  const stored = localStorage.getItem(REAL_TOKEN_KEY);
  cachedAccessToken = stored || null;
  return cachedAccessToken;
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch {}
  cachedAccessToken = null;
  localStorage.removeItem('gcal_active_user');
  localStorage.removeItem(REAL_TOKEN_KEY);
};
