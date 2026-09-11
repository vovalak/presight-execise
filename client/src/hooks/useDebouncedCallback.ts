import { useCallback, useEffect, useMemo, useRef } from 'react';

export interface Debounced<A extends unknown[]> {
  call: (...args: A) => void;
  flush: (...args: A) => void;
  cancel: () => void;
}

export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number,
): Debounced<A> {
  const fnRef = useRef(fn);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const cancel = useCallback(() => {
    if (timer.current !== undefined) {
      window.clearTimeout(timer.current);
      timer.current = undefined;
    }
  }, []);

  const call = useCallback(
    (...args: A) => {
      cancel();
      timer.current = window.setTimeout(() => {
        timer.current = undefined;
        fnRef.current(...args);
      }, delayMs);
    },
    [cancel, delayMs],
  );

  const flush = useCallback(
    (...args: A) => {
      cancel();
      fnRef.current(...args);
    },
    [cancel],
  );

  useEffect(() => cancel, [cancel]);

  return useMemo(() => ({ call, flush, cancel }), [call, flush, cancel]);
}
