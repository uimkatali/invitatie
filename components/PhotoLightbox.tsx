'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  clampPan,
  distanceBetween,
  isDoubleTap,
  isTap,
  midpoint,
  nextDoubleTapScale,
  pinchScale,
  wheelScale,
  zoomAround,
  type Point,
  type Size,
  type TapRecord,
  type View,
} from '@/lib/zoom/pinch-zoom';

interface PhotoLightboxProps {
  photoId: string;
  onClose: () => void;
}

interface TapCandidate extends Point {
  time: number;
  onStage: boolean;
}

const INITIAL_VIEW: View = { scale: 1, pan: { x: 0, y: 0 } };

function stageSize(stage: HTMLElement): Size {
  const rect = stage.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

/** Punct de ecran -> pixeli relativi la centrul zonei (originea transformarii). */
function toAnchor(stage: HTMLElement, point: Point): Point {
  const rect = stage.getBoundingClientRect();
  return { x: point.x - rect.left - rect.width / 2, y: point.y - rect.top - rect.height / 2 };
}

export default function PhotoLightbox({ photoId, onClose }: PhotoLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [animating, setAnimating] = useState(false);
  const [failed, setFailed] = useState(false);

  // Oglinda starii, ca handlerele de gesturi si de rotita sa citeasca mereu valoarea curenta.
  const viewRef = useRef<View>(INITIAL_VIEW);
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{ startDistance: number; startScale: number } | null>(null);
  const dragLast = useRef<Point | null>(null);
  const tapCandidate = useRef<TapCandidate | null>(null);
  const lastTap = useRef<TapRecord | null>(null);

  const applyView = useCallback((next: View) => {
    viewRef.current = next;
    setView(next);
  }, []);

  // Deschide dialogul modal: focus blocat inauntru, Escape il inchide nativ, fundal intunecat.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    triggerRef.current ??= document.activeElement;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      // Nu apelam dialog.close() aici: ar emite evenimentul `close` (si deci onClose) in StrictMode.
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, []);

  // Rotita mouse-ului (si pinch-ul de pe trackpad): ascultator nativ non-pasiv, ca sa putem face preventDefault.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setAnimating(false);
      const anchor = toAnchor(stage, { x: event.clientX, y: event.clientY });
      const current = viewRef.current;
      applyView(zoomAround(current, wheelScale(current.scale, event.deltaY), anchor, stageSize(stage)));
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [applyView]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    // Clic dreapta: lasam browserul sa afiseze meniul contextual ("Salveaza imaginea").
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const stage = event.currentTarget;
    stage.setPointerCapture(event.pointerId);
    setAnimating(false);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { startDistance: distanceBetween(a, b), startScale: viewRef.current.scale };
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
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const scale = pinchScale(pinch.current.startDistance, distanceBetween(a, b), pinch.current.startScale);
      applyView(zoomAround(viewRef.current, scale, toAnchor(stage, midpoint(a, b)), stageSize(stage)));
      return;
    }

    const current = viewRef.current;
    if (pointers.current.size === 1 && dragLast.current && current.scale > 1) {
      const dx = event.clientX - dragLast.current.x;
      const dy = event.clientY - dragLast.current.y;
      dragLast.current = { x: event.clientX, y: event.clientY };
      applyView({
        scale: current.scale,
        pan: clampPan({ x: current.pan.x + dx, y: current.pan.y + dy }, current.scale, stageSize(stage)),
      });
    }
  }

  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const stage = event.currentTarget;
    pointers.current.delete(event.pointerId);
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);

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
      const current = viewRef.current;
      setAnimating(true);
      applyView(zoomAround(current, nextDoubleTapScale(current.scale), toAnchor(stage, up), stageSize(stage)));
    } else {
      lastTap.current = tap;
      // Un tap pe zona goala din jurul pozei inchide lightbox-ul.
      if (candidate.onStage) onClose();
    }
  }

  const zoomed = view.scale > 1;

  return (
    <dialog ref={dialogRef} className="lightbox" aria-label="Poza marita" onClose={onClose}>
      <button type="button" className="lightbox-close" aria-label="Inchide poza" onClick={onClose}>
        <span aria-hidden="true">×</span>
      </button>
      <div
        ref={stageRef}
        className={`lightbox-stage${zoomed ? ' is-zoomed' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        {failed ? (
          <p className="lightbox-error" role="alert">
            Poza nu se poate incarca acum.
          </p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- next/image nu trimite cookie-ul de sesiune
          <img
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
