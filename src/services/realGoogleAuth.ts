import { CalendarEvent } from '../types/calendar';
import { AppUser } from './auth';
import { fetchGoogleCalendarEvents } from './googleCalendarSync';
import firebaseConfig from '../../firebase-applet-config.json';

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * Client ID resolution order (first non-empty wins):
 *   1. explicit argument (user typed it in the sync dialog)
 *   2. localStorage 'gcal_custom_client_id' (persisted from the dialog)
 *   3. VITE_GOOGLE_CLIENT_ID (build-time env, e.g. Vercel project settings)
 *   4. Firebase applet oAuthClientId (the shared sample client, which only
 *      authorizes its own registered origins)
 */
const ENV_GOOGLE_CLIENT_ID = (import.meta.env?.VITE_GOOGLE_CLIENT_ID as string | undefined) || '';

export const DEFAULT_GOOGLE_CLIENT_ID =
  ENV_GOOGLE_CLIENT_ID || firebaseConfig.oAuthClientId || '';

/**
 * Fetch real user profile from Google UserInfo endpoint
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<AppUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Lỗi lấy thông tin tài khoản Google: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return {
    uid: data.sub || `google-${Date.now()}`,
    email: data.email || null,
    displayName: data.name || data.email || 'Google User',
    photoURL: data.picture || null,
  };
}

/**
 * Request real Google OAuth 2.0 Access Token via Google Identity Services (GIS)
 */
export function requestRealGoogleOAuthToken(customClientId?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId =
      customClientId || localStorage.getItem('gcal_custom_client_id') || DEFAULT_GOOGLE_CLIENT_ID;

    if (!clientId) {
      reject(
        new Error(
          'Chưa có Google OAuth Client ID. Hãy nhập Client ID của bạn trong hộp thoại đồng bộ, hoặc dùng tab Access Token / URL iCal.'
        )
      );
      return;
    }

    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      reject(
        new Error(
          'Thư viện Google Identity Services chưa tải xong. Vui lòng kiểm tra kết nối mạng và thử lại sau 3 giây.'
        )
      );
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope:
          'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: (response: any) => {
          if (response.error) {
            reject(
              new Error(
                response.error_description ||
                  `Lỗi xác thực Google: ${response.error} (Có thể do origin localhost chưa được đăng ký trong Client ID)`
              )
            );
            return;
          }
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error('Google không trả về Access Token. Vui lòng thử lại.'));
          }
        },
        error_callback: (nonOAuthError: any) => {
          reject(new Error(nonOAuthError?.message || 'Người dùng đã đóng cửa sổ đăng nhập Google'));
        },
      });

      // Launch official Google OAuth consent popup
      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(err);
    }
  });
}

/**
 * Execute Full Real Google Sign-In and Calendar Synchronization
 */
export async function executeRealGoogleSync(
  customClientId?: string,
  providedToken?: string
): Promise<{ user: AppUser; accessToken: string; events: CalendarEvent[] }> {
  let token = providedToken;

  if (!token) {
    token = await requestRealGoogleOAuthToken(customClientId);
  }

  // 1. Fetch real Google User Profile
  const user = await fetchGoogleUserInfo(token);

  // 2. Fetch real Google Calendar Events
  const events = await fetchGoogleCalendarEvents(token);

  // 3. Persist session
  localStorage.setItem('gcal_active_user', JSON.stringify(user));
  localStorage.setItem('gcal_real_access_token', token);

  return { user, accessToken: token, events };
}
