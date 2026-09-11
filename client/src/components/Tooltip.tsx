import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export interface TooltipTriggerProps {
  ref: (element: HTMLElement | null) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onClick: () => void;
}

interface Props {
  content: ReactNode;
  children: (trigger: TooltipTriggerProps) => ReactNode;
}

const GAP = 6;
const EDGE = 4;

// Portaled into document.body: virtualized rows are transformed and overflow-clipped,
// so an inline tooltip would be cut off.
export function Tooltip({ content, children }: Props) {
  const id = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  const setTrigger = useCallback((element: HTMLElement | null) => {
    triggerRef.current = element;
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;
    const rect = trigger.getBoundingClientRect();
    const size = tooltip.getBoundingClientRect();
    const fitsAbove = rect.top - size.height - GAP >= EDGE;
    const top = fitsAbove ? rect.top - size.height - GAP : rect.bottom + GAP;
    const centred = rect.left + rect.width / 2 - size.width / 2;
    const left = Math.max(EDGE, Math.min(centred, window.innerWidth - size.width - EDGE));
    setPosition({ top, left });
  }, [open, content]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node)) hide();
    };
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, hide]);

  return (
    <>
      {children({
        ref: setTrigger,
        onMouseEnter: show,
        onMouseLeave: hide,
        onFocus: show,
        onBlur: hide,
        onClick: show,
      })}
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            id={id}
            role="tooltip"
            className="pointer-events-none fixed z-50 max-w-64 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs leading-snug text-white shadow-lg"
            style={{ top: position.top, left: position.left }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
