/**
 * ZENOX Secure Authentication & Account Vault
 * Dev By Zenox Development
 * Cryptographic SHA-256 Salted Password Verification & Anti-Bypass Session Management
 */

export interface ZenoxAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface ZenoxUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  authMethod: 'zenox_vault' | 'google';
}

export interface ZenoxSession {
  token: string;
  uid: string;
  email: string;
  displayName: string;
  authTime: number;
  expiresAt: number;
}

const VAULT_ACCOUNTS_KEY = 'zenox_vault_accounts';
const ACTIVE_SESSION_KEY = 'zenox_auth_session';
const ACTIVE_USER_KEY = 'gcal_active_user';
const WORKSPACE_ENTERED_KEY = 'zenox_workspace_entered';

/** SHA-256 Cryptographic Hash Helper */
async function hashWithSalt(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder().encode(`${salt}:#zenox_secure:${password}`);
  const hashBuf = await window.crypto.subtle.digest('SHA-256', enc);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateRandomSalt(): string {
  const arr = new Uint8Array(16);
  window.crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSessionToken(): string {
  const arr = new Uint8Array(32);
  window.crypto.getRandomValues(arr);
  return (
    'zenox_st_' +
    Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Get all registered accounts from local vault */
export function getVaultAccounts(): ZenoxAccount[] {
  try {
    const raw = localStorage.getItem(VAULT_ACCOUNTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse vault accounts:', e);
  }
  return [];
}

function saveVaultAccounts(accounts: ZenoxAccount[]) {
  localStorage.setItem(VAULT_ACCOUNTS_KEY, JSON.stringify(accounts));
}

// Clean up any legacy test accounts if present from early development
if (typeof window !== 'undefined') {
  try {
    const accounts = getVaultAccounts();
    const cleaned = accounts.filter(
      (a) => a.id !== 'zenox-usr-admin' && a.email.toLowerCase() !== 'admin@zenox.io'
    );
    if (cleaned.length !== accounts.length) {
      saveVaultAccounts(cleaned);
    }
  } catch {}
}

/** Register a brand new ZENOX personal account */
export async function registerZenoxAccount(
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: ZenoxUser }> {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: 'Họ và tên phải có ít nhất 2 ký tự.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Địa chỉ Email không hợp lệ.' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'Mật khẩu bảo mật phải có tối thiểu 6 ký tự.' };
  }

  const accounts = getVaultAccounts();
  const existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
  if (existing) {
    return {
      success: false,
      error: 'Email này đã tồn tại trên hệ thống. Vui lòng chuyển sang Đăng Nhập.',
    };
  }

  const salt = generateRandomSalt();
  const passwordHash = await hashWithSalt(password, salt);
  const newAccount: ZenoxAccount = {
    id: 'zenox-usr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  accounts.push(newAccount);
  saveVaultAccounts(accounts);

  // Auto-login upon registration
  const user: ZenoxUser = {
    uid: newAccount.id,
    displayName: cleanName,
    email: cleanEmail,
    photoURL: null,
    authMethod: 'zenox_vault',
  };

  const session: ZenoxSession = {
    token: generateSessionToken(),
    uid: user.uid,
    email: cleanEmail,
    displayName: cleanName,
    authTime: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
  sessionStorage.setItem(WORKSPACE_ENTERED_KEY, 'true');

  return { success: true, user };
}

/** Authenticate existing user with email and password */
export async function loginZenoxAccount(
  email: string,
  password: string,
  rememberMe: boolean = true
): Promise<{ success: boolean; error?: string; user?: ZenoxUser }> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail) {
    return { success: false, error: 'Vui lòng nhập Email tài khoản.' };
  }
  if (!password) {
    return { success: false, error: 'Vui lòng nhập Mật khẩu bảo mật.' };
  }

  const accounts = getVaultAccounts();
  const account = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

  if (!account) {
    return {
      success: false,
      error: 'Tài khoản không tồn tại trên hệ thống ZENOX. Vui lòng Đăng Ký.',
    };
  }

  const inputHash = await hashWithSalt(password, account.salt);
  if (inputHash !== account.passwordHash) {
    return {
      success: false,
      error: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.',
    };
  }

  // Update last login
  account.lastLoginAt = new Date().toISOString();
  saveVaultAccounts(accounts);

  const user: ZenoxUser = {
    uid: account.id,
    displayName: account.name,
    email: account.email,
    photoURL: null,
    authMethod: 'zenox_vault',
  };

  const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const session: ZenoxSession = {
    token: generateSessionToken(),
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    authTime: Date.now(),
    expiresAt: Date.now() + sessionDuration,
  };

  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
  sessionStorage.setItem(WORKSPACE_ENTERED_KEY, 'true');

  return { success: true, user };
}

/** Terminate current session */
export function logoutZenoxSession() {
  localStorage.removeItem(ACTIVE_SESSION_KEY);
  localStorage.removeItem(ACTIVE_USER_KEY);
  sessionStorage.removeItem(WORKSPACE_ENTERED_KEY);
}

/** Verify if there is an active, valid session (anti-bypass verification) */
export function verifyZenoxSession(): ZenoxUser | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawSession = localStorage.getItem(ACTIVE_SESSION_KEY);
    const rawUser = localStorage.getItem(ACTIVE_USER_KEY);

    if (!rawSession || !rawUser) return null;

    const session: ZenoxSession = JSON.parse(rawSession);
    const user: ZenoxUser = JSON.parse(rawUser);

    if (!session.token || !session.expiresAt) return null;

    // Check expiration
    if (Date.now() > session.expiresAt) {
      logoutZenoxSession();
      return null;
    }

    if (session.uid !== user.uid) {
      logoutZenoxSession();
      return null;
    }

    return user;
  } catch (e) {
    logoutZenoxSession();
    return null;
  }
}

/**
 * Sign in or authenticate with a Google Account
 * Dev By Zenox Development
 */
export async function loginWithGoogleAccount(): Promise<{
  success: boolean;
  error?: string;
  user?: ZenoxUser;
}> {
  try {
    let appUser: { uid: string; email: string | null; displayName: string | null; photoURL: string | null } | null = null;
    let accessToken: string | null = null;

    // 1. Launch real official Google OAuth popup via Firebase Auth
    try {
      const { googleSignIn } = await import('./auth');
      const res = await googleSignIn();
      if (res?.user?.email) {
        appUser = res.user;
        accessToken = res.accessToken;
      }
    } catch (fbErr: any) {
      console.warn('Firebase popup encounter:', fbErr?.code || fbErr?.message);
      if (fbErr?.code === 'auth/popup-closed-by-user' || fbErr?.message?.includes('closed-by-user')) {
        return {
          success: false,
          error: 'Cửa sổ đăng nhập Google đã bị đóng. Vui lòng bấm đăng nhập lại để tiếp tục.',
        };
      }

      // 2. Secondary fallback via Google Identity Services (GIS)
      try {
        const { executeRealGoogleSync } = await import('./realGoogleAuth');
        const gisRes = await executeRealGoogleSync();
        if (gisRes?.user?.email) {
          appUser = gisRes.user;
          accessToken = gisRes.accessToken;
        }
      } catch (gisErr: any) {
        console.warn('GIS fallback encounter:', gisErr?.message);
        throw new Error(
          fbErr?.message || gisErr?.message || 'Không thể mở cửa sổ đăng nhập Google.'
        );
      }
    }

    if (!appUser || !appUser.email) {
      return { success: false, error: 'Không nhận được thông tin tài khoản từ Google.' };
    }

    const cleanEmail = appUser.email.trim().toLowerCase();
    const cleanName = appUser.displayName?.trim() || cleanEmail.split('@')[0];
    const safeSub = appUser.uid || 'g_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
    const googleUid = 'google-' + safeSub;

    // 3. Register or update account in local vault
    const accounts = getVaultAccounts();
    let existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

    if (!existing) {
      existing = {
        id: googleUid,
        name: cleanName,
        email: cleanEmail,
        passwordHash: 'google_oauth_managed',
        salt: 'google_salt',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      accounts.push(existing);
      saveVaultAccounts(accounts);
    } else {
      existing.lastLoginAt = new Date().toISOString();
      saveVaultAccounts(accounts);
    }

    const user: ZenoxUser = {
      uid: existing.id || googleUid,
      displayName: cleanName,
      email: cleanEmail,
      photoURL: appUser.photoURL || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(cleanName) + '&background=0284c7&color=fff'),
      authMethod: 'google',
    };

    const session: ZenoxSession = {
      token: generateSessionToken(),
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      authTime: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
    if (accessToken) {
      localStorage.setItem('gcal_real_access_token', accessToken);
    }
    sessionStorage.setItem(WORKSPACE_ENTERED_KEY, 'true');

    // 4. Fetch and synchronize real Google Calendar events with web workspace
    if (accessToken) {
      try {
        const { fetchGoogleCalendarEvents } = await import('./googleCalendarSync');
        const googleEvents = await fetchGoogleCalendarEvents(accessToken);
        if (googleEvents && googleEvents.length > 0) {
          const { accountStorage } = await import('./accountStorage');
          const rawExisting = accountStorage.getItem('gcal_events', user.uid) || localStorage.getItem('gcal_events');
          const existingEvents: any[] = rawExisting ? JSON.parse(rawExisting) : [];
          const incomingIds = new Set(googleEvents.map((e) => e.id));
          const merged = [...googleEvents, ...existingEvents.filter((e) => !incomingIds.has(e.id))];
          accountStorage.setItem('gcal_events', JSON.stringify(merged), user.uid);
          localStorage.setItem('gcal_events', JSON.stringify(merged));
        }
      } catch (syncErr) {
        console.warn('Google Calendar auto-fetch note:', syncErr);
      }
    }

    return { success: true, user };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Lỗi xác thực máy chủ Google.',
    };
  }
}
