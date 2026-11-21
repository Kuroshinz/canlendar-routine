import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccountStorageKey } from '../services/accountStorage';

/**
 * Account-isolated, localStorage-backed state.
 * Dev By Zenox Development
 *
 * Guarantees that Google accounts and Web-created accounts have
 * strictly separate, isolated data stores.
 */
export function usePersistentState<T>(
  baseKey: string,
  seed: T | (() => T)
): [T, (next: T | ((prev: T) => T)) => void] {
  const key = getAccountStorageKey(baseKey);

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      // Malformed stored value: fall through to the seed
    }
    return typeof seed === 'function' ? (seed as () => T)() : seed;
  });

  const isFirstRun = useRef(true);
  const prevKeyRef = useRef(key);

  // If user switches account (key changes), reload state immediately
  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          setValue(JSON.parse(raw) as T);
        } else {
          setValue(typeof seed === 'function' ? (seed as () => T)() : seed);
        }
      } catch {
        setValue(typeof seed === 'function' ? (seed as () => T)() : seed);
      }
      return;
    }

    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
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
