'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseFetchOptions {
  immediate?: boolean;
}

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFetch<T>(
  url: string | (() => string),
  options: UseFetchOptions = { immediate: true }
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(options.immediate !== false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const resolvedUrl = typeof url === 'function' ? url() : url;
      const res = await fetch(resolvedUrl);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fetch failed'));
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (options.immediate !== false) {
      fetchData();
    }
  }, [fetchData, options.immediate]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Fetch multiple URLs in parallel
 */
export function useMultiFetch<T extends Record<string, unknown>>(
  urls: { [K in keyof T]: string }
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Serialize URLs for dependency tracking
  const urlsKey = JSON.stringify(urls);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const entries = Object.entries(urls);
      const results = await Promise.all(
        entries.map(async ([key, url]) => {
          const res = await fetch(url as string);
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${key}`);
          return [key, await res.json()] as const;
        })
      );

      setData(Object.fromEntries(results) as T);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fetch failed'));
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsKey]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, isLoading, error, refetch: fetchAll };
}

interface UseMutateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseMutateResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | null>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for POST/PUT/PATCH/DELETE operations with loading state management
 */
export function useMutate<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutateOptions<TData> = {}
): UseMutateResult<TData, TVariables> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await mutationFn(variables);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Mutation failed');
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn, options]
  );

  return { mutate, isLoading, error };
}
