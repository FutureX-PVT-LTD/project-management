import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a fast-changing value (e.g. search query, filter inputs)
 * @param value The value to debounce
 * @param delay Milliseconds to wait after last change before updating (default: 250ms)
 */
export function useDebounce<T>(value: T, delay: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // If string value is completely cleared, update immediately without waiting
    if (typeof value === 'string' && value.trim() === '') {
      setDebouncedValue(value);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
