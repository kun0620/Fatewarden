import { ReactNode, useRef, useState } from 'react';

type TooltipProps = {
  label: string;
  children: ReactNode;
};

export function Tooltip({ label, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  function clearTimer() {
    if (timerRef.current !== null) {
      globalThis.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handleTouchStart() {
    clearTimer();
    timerRef.current = globalThis.setTimeout(() => setShow(true), 350);
  }

  function handleTouchEnd() {
    clearTimer();
    setShow(false);
  }

  return (
    <span
      onBlur={() => setShow(false)}
      onFocus={() => setShow(true)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      tabIndex={0}
    >
      <span>{children}</span>
      <span className="fw-tooltip" data-show={show ? 'true' : undefined} role="tooltip">
        {label}
      </span>
    </span>
  );
}
