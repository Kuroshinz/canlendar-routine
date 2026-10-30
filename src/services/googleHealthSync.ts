/**
 * Google Health / Google Fit integration.
 *
 * The module follows the same shape as `googleCalendarSync.ts`: a thin `fetch`
 * wrapper over the REST API that throws a tagged error on failure, plus a
 * deterministic mock so the Health dashboard is always usable when no OAuth
 * token or env flag is configured.
 *
 * Real endpoint used: Fitness REST API `dataset:aggregate`
 * https://developers.google.com/fit/rest/v1/users.dataset.aggregate
 *
 * The returned `source` is always reported to the UI so a mock sync can never
 * be mistaken for real Google data.
 */

export type HealthSyncSource = 'google-fit' | 'mock';

export interface GoogleHealthMetrics {
  date: string; // YYYY-MM-DD
  steps?: number;
  caloriesBurned?: number;
  heartRateBpm?: number;
  sleepHours?: number;
  weightKg?: number;
}

export interface GoogleHealthSyncResult {
  source: HealthSyncSource;
  metrics: GoogleHealthMetrics;
  /** Present when the real API was attempted and failed. */
  error?: string;
}

const FITNESS_API = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate';

const ENABLED_FLAG = (import.meta.env?.VITE_GOOGLE_HEALTH_ENABLED as string | undefined) || '';

/**
 * Health sync is opt-in: it needs the Fitness API scope on the access token,
 * which the default calendar sign-in does not request.
 */
export function isGoogleHealthConfigured(): boolean {
  if (ENABLED_FLAG === 'true' || ENABLED_FLAG === '1') return true;
  return false;
}

/** Midnight (local) epoch millis for a `YYYY-MM-DD` string. */
function dayBounds(date: string): { start: number; end: number } {
  const [y, m, d] = date.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0).getTime();
  return { start, end };
}

interface AggregateBucket {
  startTimeMillis?: string;
  endTimeMillis?: string;
  dataset?: Array<{
    dataSourceId?: string;
    point?: Array<{
      value?: Array<{ intVal?: number; fpVal?: number }>;
    }>;
  }>;
}

/** Sums the first value of every point inside an aggregate bucket. */
function sumBucket(bucket: AggregateBucket): number {
  let total = 0;
  for (const ds of bucket.dataset || []) {
    for (const point of ds.point || []) {
      const v = point.value?.[0];
      if (!v) continue;
      total += v.intVal ?? v.fpVal ?? 0;
    }
  }
  return total;
}

/**
 * Fetch real metrics for a single day. Throws when the token lacks the Fitness
 * scope or the network call fails — callers fall back to `mockGoogleHealthMetrics`.
 */
export async function fetchGoogleHealthMetrics(
  accessToken: string,
  date: string
): Promise<GoogleHealthMetrics> {
  const { start, end } = dayBounds(date);

  const body = {
    aggregateBy: [
      { dataTypeName: 'com.google.step_count.delta' },
      { dataTypeName: 'com.google.calories.expired' },
      { dataTypeName: 'com.google.heart_rate.bpm' },
      { dataTypeName: 'com.google.sleep.segment' },
      { dataTypeName: 'com.google.weight' },
    ],
    bucketByTime: { durationMillis: end - start },
    startTimeMillis: start,
    endTimeMillis: end,
  };

  const res = await fetch(FITNESS_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('Google Fitness aggregate error:', detail);
    throw new Error(`Google Health API Error: ${res.status}`);
  }

  const data = await res.json();
  const buckets: AggregateBucket[] = data.bucket || [];
  const metrics: GoogleHealthMetrics = { date };

  for (const bucket of buckets) {
    for (const ds of bucket.dataset || []) {
      const id = ds.dataSourceId || '';
      const points = ds.point || [];
      if (id.includes('step_count')) {
        metrics.steps = Math.round(sumBucket({ dataset: [ds] }));
      } else if (id.includes('calories.expired')) {
        metrics.caloriesBurned = Math.round(sumBucket({ dataset: [ds] }));
      } else if (id.includes('heart_rate.bpm')) {
        const values = points
          .map((p) => p.value?.[0]?.fpVal)
          .filter((v): v is number => typeof v === 'number');
        if (values.length > 0) {
          metrics.heartRateBpm = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        }
      } else if (id.includes('sleep.segment')) {
        // Sleep segments arrive in milliseconds; convert to hours.
        metrics.sleepHours = Math.round((sumBucket({ dataset: [ds] }) / 3_600_000) * 10) / 10;
      } else if (id.includes('weight')) {
        const last = points[points.length - 1]?.value?.[0]?.fpVal;
        if (typeof last === 'number') metrics.weightKg = Math.round(last * 10) / 10;
      }
    }
  }

  return metrics;
}

/**
 * Deterministic mock so the dashboard renders believable numbers with no
 * credentials. Values vary by date so the trend chart is not a flat line.
 */
export function mockGoogleHealthMetrics(date: string): GoogleHealthMetrics {
  const [y, m, d] = date.split('-').map(Number);
  const seed = (y * 372 + m * 31 + d) % 97;
  const weekday = new Date(y, m - 1, d).getDay();
  const isWeekend = weekday === 0 || weekday === 6;

  return {
    date,
    steps: isWeekend ? 4200 + seed * 55 : 7100 + seed * 62,
    caloriesBurned: isWeekend ? 1650 + seed * 6 : 2050 + seed * 7,
    heartRateBpm: 62 + (seed % 11),
    sleepHours: Math.round((6.2 + (seed % 20) / 10) * 10) / 10,
    weightKg: Math.round((65.4 + (seed % 14) / 10) * 10) / 10,
  };
}

/**
 * Single entry point used by the Health dashboard.
 *
 * - `accessToken` present **and** `VITE_GOOGLE_HEALTH_ENABLED` on → real API.
 * - Real call fails → mock, with `error` explaining why.
 * - No token → mock immediately, labelled as such.
 */
export async function syncGoogleHealth(opts: {
  date: string;
  accessToken?: string | null;
}): Promise<GoogleHealthSyncResult> {
  const { date, accessToken } = opts;

  if (!accessToken) {
    return { source: 'mock', metrics: mockGoogleHealthMetrics(date) };
  }

  if (!isGoogleHealthConfigured()) {
    return { source: 'mock', metrics: mockGoogleHealthMetrics(date) };
  }

  try {
    const metrics = await fetchGoogleHealthMetrics(accessToken, date);
    return { source: 'google-fit', metrics };
  } catch (err: any) {
    return {
      source: 'mock',
      metrics: mockGoogleHealthMetrics(date),
      error: err?.message || 'Google Health sync failed',
    };
  }
}

/** Human readable label for the source badge shown in the UI. */
export function healthSourceLabel(source: HealthSyncSource, lang: 'vi' | 'en'): string {
  if (source === 'google-fit') return lang === 'vi' ? 'Google Fit' : 'Google Fit';
  return lang === 'vi' ? 'Dữ liệu mô phỏng' : 'Simulated data';
}
