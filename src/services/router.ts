/**
 * ZENOX Unified Route & Flow Controller
 * Dev By Zenox Development
 * 
 * Separates application layers cleanly:
 * - Landing Page: root domain / (zenox.vercel.app)
 * - Workspace: /workspace (zenox.vercel.app/workspace)
 * - Anti-Bypass security enforcement
 */

export type AppRoute = 'landing' | 'workspace';

export function getCurrentRoute(): AppRoute {
  if (typeof window === 'undefined') return 'landing';

  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  // If URL explicitly requests workspace:
  if (
    pathname.startsWith('/workspace') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/dashboard') ||
    hash === '#workspace' ||
    hash === '#app' ||
    hash === '#dashboard'
  ) {
    return 'workspace';
  }

  // All other URLs (root '/', '/landing', '#landing', etc.) default to landing page
  return 'landing';
}

export function navigateToRoute(
  route: AppRoute,
  options: { replace?: boolean } = {}
): void {
  if (typeof window === 'undefined') return;

  const targetPath = route === 'workspace' ? '/workspace' : '/';
  
  try {
    if (options.replace) {
      window.history.replaceState({ route }, '', targetPath);
    } else {
      window.history.pushState({ route }, '', targetPath);
    }
  } catch (e) {
    console.warn('History navigation error:', e);
  }

  // Also maintain clean hash state for compatibility
  if (route === 'workspace') {
    if (window.location.hash === '#landing') {
      window.location.hash = '#workspace';
    }
  } else {
    if (
      window.location.hash === '#workspace' ||
      window.location.hash === '#app' ||
      window.location.hash === '#dashboard'
    ) {
      window.location.hash = '';
    }
  }

  // Notify listeners (App component)
  window.dispatchEvent(new CustomEvent('zenox-route-change', { detail: { route } }));
}
