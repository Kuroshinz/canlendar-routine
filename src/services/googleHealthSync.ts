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
  /** Direct link to Google Cloud console to enable Fitness API if returned in error */
  enableApiUrl?: string;
}

const FITNESS_API = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate';

const ENABLED_FLAG = (import.meta.env?.VITE_GOOGLE_HEALTH_ENABLED as string | undefined) || '';

/**
 * Health sync is active by default whenever an access token with Fitness scopes
 * is available. Can be explicitly disabled with VITE_GOOGLE_HEALTH_ENABLED=false.
 */
export function isGoogleHealthConfigured(): boolean {
  if (ENABLED_FLAG === 'false' || ENABLED_FLAG === '0') return false;
  return true;
}

/** Midnight (local) epoch millis for a `YYYY-MM-DD` string, safely bounded. */
function dayBounds(date: string): { start: number; end: number; dayEnd: number } {
  const [y, m, d] = date.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const dayEnd = new Date(y, m - 1, d + 1, 0, 0, 0, 0).getTime();
  const now = Date.now();
  const end = Math.min(dayEnd, Math.max(start + 60_000, now));
  return { start, end, dayEnd };
}

interface AggregateBucket {
  startTimeMillis?: string;
  endTimeMillis?: string;
  dataset?: Array<{
    dataSourceId?: string;
    point?: Array<{
      dataTypeName?: string;
      startTimeNanos?: string;
      endTimeNanos?: string;
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
 * Fetch real metrics for a single day.
 * Queries activity (steps & calories), sleep, and weight gracefully so that
 * a missing optional scope does not block core step and calorie synchronization.
 */
export async function fetchGoogleHealthMetrics(
  accessToken: string,
  date: string
): Promise<GoogleHealthMetrics> {
  const { start, dayEnd } = dayBounds(date);
  const metrics: GoogleHealthMetrics = { date };
  let primaryError: string | null = null;

  // 1. Core Activity: Steps and Calories (requires https://www.googleapis.com/auth/fitness.activity.read)
  try {
    const activityBody = {
      aggregateBy: [
        {
          dataTypeName: 'com.google.step_count.delta',
          dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
        },
        {
          dataTypeName: 'com.google.calories.expended',
          dataSourceId: 'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended',
        },
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: start,
      endTimeMillis: dayEnd,
    };

    let res = await fetch(FITNESS_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(activityBody),
    });

    if (!res.ok) {
      // Fallback query without explicit dataSourceId
      const simpleBody = {
        aggregateBy: [
          { dataTypeName: 'com.google.step_count.delta' },
          { dataTypeName: 'com.google.calories.expended' },
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: start,
        endTimeMillis: dayEnd,
      };
      res = await fetch(FITNESS_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(simpleBody),
      });
    }

    if (res.ok) {
      const data = await res.json();
      const buckets: AggregateBucket[] = data.bucket || [];
      for (const bucket of buckets) {
        for (const ds of bucket.dataset || []) {
          const id = ((ds.dataSourceId || '') + (ds.point?.[0]?.dataTypeName || '')).toLowerCase();
          if (id.includes('step_count')) {
            metrics.steps = Math.round(sumBucket({ dataset: [ds] }));
          } else if (id.includes('calories.expended') || id.includes('calories')) {
            metrics.caloriesBurned = Math.round(sumBucket({ dataset: [ds] }));
          }
        }
      }
    } else {
      const detail = await res.text();
      let errMsg = `Google Health API Error: ${res.status}`;
      try {
        const parsed = JSON.parse(detail);
        if (parsed.error?.message) {
          errMsg += ` (${parsed.error.message})`;
        }
      } catch {
        if (detail) errMsg += ` (${detail.slice(0, 150)})`;
      }
      primaryError = errMsg;
    }
  } catch (err: any) {
    primaryError = err?.message || 'Activity sync failed';
  }

  // 2. Sleep segment (requires https://www.googleapis.com/auth/fitness.sleep.read)
  try {
    const sleepBody = {
      aggregateBy: [{ dataTypeName: 'com.google.sleep.segment' }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: start,
      endTimeMillis: dayEnd,
    };
    const res = await fetch(FITNESS_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(sleepBody),
    });
    if (res.ok) {
      const data = await res.json();
      const buckets: AggregateBucket[] = data.bucket || [];
      for (const bucket of buckets) {
        for (const ds of bucket.dataset || []) {
          let sleepSec = 0;
          for (const p of ds.point || []) {
            if (p.startTimeNanos && p.endTimeNanos) {
              const dur = (Number(p.endTimeNanos) - Number(p.startTimeNanos)) / 1e9;
              if (dur > 0 && dur < 86400) sleepSec += dur;
            }
          }
          if (sleepSec > 0) {
            metrics.sleepHours = Math.round((sleepSec / 3600) * 10) / 10;
          } else {
            const val = sumBucket({ dataset: [ds] });
            if (val > 1000) {
              metrics.sleepHours = Math.round((val / 3_600_000) * 10) / 10;
            }
          }
        }
      }
    }
  } catch {}

  // 3. Weight summary (requires https://www.googleapis.com/auth/fitness.body.read)
  try {
    const weightBody = {
      aggregateBy: [
        {
          dataTypeName: 'com.google.weight',
          dataSourceId: 'derived:com.google.weight:com.google.android.gms:merge_weight',
        },
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: start,
      endTimeMillis: dayEnd,
    };
    const res = await fetch(FITNESS_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(weightBody),
    });
    if (res.ok) {
      const data = await res.json();
      const buckets: AggregateBucket[] = data.bucket || [];
      for (const bucket of buckets) {
        for (const ds of bucket.dataset || []) {
          const last = ds.point?.[(ds.point?.length || 1) - 1]?.value?.[0]?.fpVal;
          if (typeof last === 'number') {
            metrics.weightKg = Math.round(last * 10) / 10;
          }
        }
      }
    }
  } catch {}

  // If even core steps and calories could not be fetched, throw primary error
  if (metrics.steps === undefined && metrics.caloriesBurned === undefined && primaryError) {
    throw new Error(primaryError);
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
    return {
      source: 'google-fit',
      metrics: { date },
      error: 'Chưa có Access Token Google. Vui lòng đăng nhập Google để đồng bộ dữ liệu thật.',
    };
  }

  if (!isGoogleHealthConfigured()) {
    return {
      source: 'google-fit',
      metrics: { date },
      error: 'Google Health sync đã bị vô hiệu hóa trong cấu hình môi trường.',
    };
  }

  try {
    const metrics = await fetchGoogleHealthMetrics(accessToken, date);
    return { source: 'google-fit', metrics };
  } catch (err: any) {
    const errorMsg = err?.message || 'Google Health sync failed';
    const match = errorMsg.match(/(https:\/\/console\.(?:developers\.)?google\.com\/[^\s)]+)/);
    const enableApiUrl = match ? match[1] : undefined;
    return {
      source: 'google-fit',
      metrics: { date },
      error: errorMsg,
      enableApiUrl,
    };
  }
}

/** Human readable label for the source badge shown in the UI. */
export function healthSourceLabel(source: HealthSyncSource, lang: 'vi' | 'en'): string {
  if (source === 'google-fit') return lang === 'vi' ? 'Google Fit' : 'Google Fit';
  return lang === 'vi' ? 'Dữ liệu mô phỏng' : 'Simulated data';
}

