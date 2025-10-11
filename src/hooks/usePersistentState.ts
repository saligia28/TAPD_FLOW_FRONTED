import { useCallback, useEffect, useRef, useState } from 'react';

type Serializer<T> = (value: T) => string;
type Deserializer<T> = (value: string) => T;

type UsePersistentStateOptions<T> = {
  defaultValue: T;
  storage?: Storage;
  serialize?: Serializer<T>;
  deserialize?: Deserializer<T>;
  writeDelayMs?: number;
  persist?: boolean;
  reduceBeforePersist?: (value: T) => T;
};

const safeJsonSerialize = <T,>(value: T): string => JSON.stringify(value);
const safeJsonDeserialize = <T,>(value: string): T => JSON.parse(value) as T;

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export function usePersistentState<T>(
  key: string,
  {
    defaultValue,
    storage,
    serialize = safeJsonSerialize,
    deserialize = safeJsonDeserialize,
    writeDelayMs = 0,
    persist = true,
    reduceBeforePersist,
  }: UsePersistentStateOptions<T>,
) {
  const resolvedStorage = persist ? storage ?? (isBrowser ? window.localStorage : undefined) : undefined;
  const [state, setState] = useState<T>(() => {
    if (!resolvedStorage) return defaultValue;
    try {
      const raw = resolvedStorage.getItem(key);
      if (raw === null) return defaultValue;
      return deserialize(raw);
    } catch {
      return defaultValue;
    }
  });

  const pendingRef = useRef<number | null>(null);
  const latestRef = useRef(state);
  latestRef.current = state;

  const flush = useCallback(() => {
    if (!resolvedStorage) return;
    try {
      const valueToWrite = reduceBeforePersist ? reduceBeforePersist(latestRef.current) : latestRef.current;
      resolvedStorage.setItem(key, serialize(valueToWrite));
    } catch {
      // ignore quota or serialization errors
    }
  }, [key, reduceBeforePersist, resolvedStorage, serialize]);

  useEffect(() => {
    if (!resolvedStorage) return undefined;
    if (writeDelayMs <= 0) {
      flush();
      return undefined;
    }
    if (pendingRef.current !== null) {
      window.clearTimeout(pendingRef.current);
    }
    pendingRef.current = window.setTimeout(() => {
      pendingRef.current = null;
      flush();
    }, writeDelayMs);
    return () => {
      if (pendingRef.current !== null) {
        window.clearTimeout(pendingRef.current);
        pendingRef.current = null;
      }
      flush();
    };
  }, [flush, resolvedStorage, state, writeDelayMs]);

  const clear = useCallback(() => {
    setState(defaultValue);
    if (!resolvedStorage) return;
    try {
      resolvedStorage.removeItem(key);
    } catch {
      // ignore remove errors
    }
  }, [defaultValue, key, resolvedStorage]);

  return [state, setState, clear] as const;
}
