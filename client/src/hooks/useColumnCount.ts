import { useLayoutEffect, useState, type RefObject } from 'react';

export function useColumnCount(ref: RefObject<HTMLElement | null>, minWidthForTwo: number) {
  const [columns, setColumns] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setColumns(el.clientWidth >= minWidthForTwo ? 2 : 1);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, minWidthForTwo]);

  return columns;
}
