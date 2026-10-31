import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * localStorage-backed state, matching the existing persistence pattern used by
 * `gcal_events`, `gcal_categories`, `gcal_weekly_goals`, … in this project.
 *
 * A stored value is only trusted when it parses; otherwise the seed value wins.
 */
export function usePersistentState<T>(key: string, seed: T | (() => T)): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      // Malformed stored value: fall through to the seed and let the effect below
      // overwrite the corrupt entry.
    }
    return typeof seed === 'function' ? (seed as () => T)() : seed;
  });

  // Skip the first write so a corrupt entry is not re-persisted before it is replaced.
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota or privacy-mode failures must not break the UI.
    }
  }, [key, value]);

  const update = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => (typeof next === 'function' ? (next as (p: T) => T)(prev) : next));
  }, []);

  return [value, update];
}

