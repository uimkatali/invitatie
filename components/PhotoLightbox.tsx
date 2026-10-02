'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  DOUBLE_TAP_MAX_GAP_MS,
  distanceBetween,
  isDoubleTap,
  isTap,
  keyboardView,
  midpoint,
  nextDoubleTapScale,
  pinchView,
  wheelScale,
  zoomAround,
  clampPan,
  type PinchStart,
  type Point,
  type Size,
  type TapRecord,
  type View,
} from '@/lib/zoom/pinch-zoom';

interface PhotoLightboxProps {
  photoId: string;
  onClose: () => void;
  /** Elementul care a deschis lightbox-ul; primeste din nou focusul la inchidere (Safari nu focuseaza butoanele la clic). */
  returnFocusTo?: HTMLElement | null;
}

interface TapCandidate extends Point {
  time: number;
  onStage: boolean;
}

const INITIAL_VIEW: View = { scale: 1, pan: { x: 0, y: 0 } };

function elementSize(element: HTMLElement): Size {
  const rect = element.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

/** Punct de ecran -> pixeli relativi la centrul scenei (originea transformarii). */
function toAnchor(stage: HTMLElement, point: Point): Point {
  const rect = stage.getBoundingClientRect();
  return { x: point.x - rect.left - rect.width / 2, y: point.y - rect.top - rect.height / 2 };
}

export default function PhotoLightbox({ photoId, onClose, returnFocusTo = null }: PhotoLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(returnFocusTo);

  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [animating, setAnimating] = useState(false);
  const [failed, setFailed] = useState(false);

  // Oglinda starii, ca handlerele de gesturi si de rotita sa citeasca mereu valoarea curenta.
  const viewRef = useRef<View>(INITIAL_VIEW);
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<PinchStart | null>(null);
  const dragLast = useRef<Point | null>(null);
  const tapCandidate = useRef<TapCandidate | null>(null);
  const lastTap = useRef<TapRecord | null>(null);
  const closeTimer = useRef<number | null>(null);

  const applyView = useCallback((next: View) => {
    viewRef.current = next;
    setView(next);
  }, []);

  /** Marimea scenei si cea reala a imaginii (fara transformare): limiteaza tragerea pe poza, nu pe scena. */
  const measure = useCallback((): { content: Size; container: Size } | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const container = elementSize(stage);
    const img = imgRef.current;
    const content = img ? { width: img.offsetWidth || container.width, height: img.offsetHeight || container.height } : container;
    return { content, container };
  }, []);

  const cancelPendingClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  // Deschide dialogul modal: focus blocat inauntru, Escape il inchide nativ, fundal intunecat.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    triggerRef.current ??= document.activeElement;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', ''); // browsere vechi: afisat nemodal, tot utilizabil
    }
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      cancelPendingClose();
      // Nu apelam dialog.close() aici: ar emite evenimentul `close` (si deci onClose) in StrictMode.
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [cancelPendingClose]);

  // Rotita mouse-ului, pinch-ul de pe trackpad (wheel cu ctrlKey) si gesturile Safari: ascultatori nativi non-pasivi.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const sizes = measure();
      if (!sizes) return;
      setAnimating(false);
      const current = viewRef.current;
      const scale = wheelScale(current.scale, event.deltaY, event.deltaMode, event.ctrlKey);
      const anchor = toAnchor(stage, { x: event.clientX, y: event.clientY });
      applyView(zoomAround(current, scale, anchor, sizes.content, sizes.container));
    };
    // Safari (macOS/iOS) trimite gesturile de pinch ca evenimente proprii si ar mari toata pagina.
    const stopGesture = (event: Event) => event.preventDefault();
    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('gesturestart', stopGesture, { passive: false });
    stage.addEventListener('gesturechange', stopGesture, { passive: false });
    return () => {
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('gesturestart', stopGesture);
      stage.removeEventListener('gesturechange', stopGesture);
    };
  }, [applyView, measure]);

  function beginPinch(stage: HTMLElement) {
    const [a, b] = [...pointers.current.values()];
    pinch.current = {
      distance: distanceBetween(a, b),
      scale: viewRef.current.scale,
      mid: toAnchor(stage, midpoint(a, b)),
      pan: viewRef.current.pan,
    };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    // Clic dreapta: lasam browserul sa afiseze meniul contextual ("Salveaza imaginea").
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const stage = event.currentTarget;
    cancelPendingClose();
    // Primul contact al unei secvente noi: orice deget ramas din secventa anterioara (de ex. dupa meniul de salvare) e uitat.
    if (event.isPrimary) {
      pointers.current.clear();
      pinch.current = null;
    }
    try {
      stage.setPointerCapture(event.pointerId);
    } catch {
      // pointer deja inactiv: gestul va fi oricum anulat
    }
    setAnimating(false);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2) {
      beginPinch(stage);
      tapCandidate.current = null;
      lastTap.current = null;
      dragLast.current = null;
    } else if (pointers.current.size === 1) {
      tapCandidate.current = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
        onStage: event.target === stage,
      };
      dragLast.current = { x: event.clientX, y: event.clientY };
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const stage = event.currentTarget;
    const sizes = measure();
    if (!sizes) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      applyView(pinchView(pinch.current, distanceBetween(a, b), toAnchor(stage, midpoint(a, b)), sizes.content, sizes.container));
      return;
    }

    const current = viewRef.current;
    if (pointers.current.size === 1 && dragLast.current && current.scale > 1) {
      const dx = event.clientX - dragLast.current.x;
      const dy = event.clientY - dragLast.current.y;
      dragLast.current = { x: event.clientX, y: event.clientY };
      applyView({
        scale: current.scale,
        pan: clampPan({ x: current.pan.x + dx, y: current.pan.y + dy }, current.scale, sizes.content, sizes.container),
      });
    }
  }

  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const stage = event.currentTarget;
    pointers.current.delete(event.pointerId);
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);

    if (pointers.current.size === 2) {
      // Au ramas doua degete dintre trei: pinch-ul continua de la pozitiile lor, fara salt de scala.
      beginPinch(stage);
      return;
    }
    if (pointers.current.size === 1) {
      // A ramas un deget dupa pinch: continuam cu tragerea, fara sa numaram un tap.
      pinch.current = null;
      tapCandidate.current = null;
      dragLast.current = [...pointers.current.values()][0];
      return;
    }
    if (pointers.current.size > 0) return;

    pinch.current = null;
    dragLast.current = null;
    const candidate = tapCandidate.current;
    tapCandidate.current = null;
    if (event.type !== 'pointerup' || !candidate) return;

    const now = performance.now();
    const up = { x: event.clientX, y: event.clientY };
    if (!isTap(candidate, up, now - candidate.time)) return;

    const tap: TapRecord = { time: now, x: up.x, y: up.y };
    if (isDoubleTap(lastTap.current, tap)) {
      lastTap.current = null;
      const sizes = measure();
      if (!sizes) return;
      const current = viewRef.current;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setAnimating(!reduceMotion);
      applyView(zoomAround(current, nextDoubleTapScale(current.scale), toAnchor(stage, up), sizes.content, sizes.container));
    } else {
      lastTap.current = tap;
      // Un tap pe zona goala din jurul pozei inchide lightbox-ul, dar cu o mica intarziere: astfel un al doilea tap
      // (dublu-tap) il anuleaza, iar click-ul sintetic al browserului aterizeaza inca pe lightbox, nu pe pagina de dedesubt.
      if (candidate.onStage) closeTimer.current = window.setTimeout(onClose, DOUBLE_TAP_MAX_GAP_MS);
    }
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDialogElement>) {
    const sizes = measure();
    if (!sizes || event.ctrlKey || event.metaKey || event.altKey) return;
    const next = keyboardView(viewRef.current, event.key, sizes.content, sizes.container);
    if (!next) return;
    event.preventDefault();
    setAnimating(false);
    applyView(next);
  }

  const zoomed = view.scale > 1;

  return (
    <dialog ref={dialogRef} className="lightbox" aria-label="Poza marita" onClose={onClose} onKeyDown={onKeyDown}>
      <button ref={closeButtonRef} type="button" className="lightbox-close" aria-label="Inchide poza" onClick={onClose}>
        <span aria-hidden="true">×</span>
      </button>
      <div
        ref={stageRef}
        className={`lightbox-stage${zoomed ? ' is-zoomed' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
      >
        {failed ? (
          <p className="lightbox-error" role="alert">
            Poza nu se poate incarca acum.
          </p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- next/image nu trimite cookie-ul de sesiune
          <img
            ref={imgRef}
            className="lightbox-img"
            src={`/api/photos/${photoId}`}
            alt="Poza din amintire"
            style={{
              transform: `translate(${view.pan.x}px, ${view.pan.y}px) scale(${view.scale})`,
              transition: animating ? 'transform 200ms ease' : 'none',
            }}
            onTransitionEnd={() => setAnimating(false)}
            // Doar tragerea nativa a imaginii e oprita (ar anula gestul de pan); meniul contextual ramane.
            onDragStart={(event) => event.preventDefault()}
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </dialog>
  );
}
