"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";

export type ViewBox = { x: number; y: number; w: number; h: number };
type Size = { width: number; height: number };

const MIN_VIEW_WIDTH = 150;
const TAP_TOLERANCE_PX = 8;
const ANIMATION_MS = 280;

/**
 * Pan/zoom ringan untuk SVG: drag (mouse/1 jari), pinch (2 jari), wheel, tombol & keyboard.
 * viewBox diubah langsung lewat ref (tanpa re-render React) agar tetap halus di HP.
 * Tombol (zoom/fit/fokus) dianimasikan singkat; gestur langsung mengikuti jari tanpa animasi.
 * `onViewChange` dipanggil setiap viewBox berubah (mis. untuk memposisikan tooltip HTML).
 */
export function usePanZoom(
  svgRef: RefObject<SVGSVGElement | null>,
  content: Size,
  onTap: (target: Element | null) => void,
  onViewChange?: (view: ViewBox, container: Size) => void,
) {
  const view = useRef<ViewBox>({ x: 0, y: 0, w: content.width, h: content.height });
  const container = useRef<Size>({ width: 1, height: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; target: Element | null; pinchDistance: number | null }>({
    moved: 0,
    target: null,
    pinchDistance: null,
  });
  const animation = useRef<number | null>(null);
  /** Tujuan akhir animasi yang sedang berjalan (null bila tidak ada animasi). */
  const goal = useRef<ViewBox | null>(null);
  const onTapRef = useRef(onTap);
  const onViewChangeRef = useRef(onViewChange);
  useEffect(() => {
    onTapRef.current = onTap;
    onViewChangeRef.current = onViewChange;
  });

  const maxWidth = useCallback(() => {
    // Batas zoom-out: seluruh blok terlihat (dengan sedikit ruang).
    const aspect = container.current.height / container.current.width;
    return Math.max(content.width, content.height / aspect) * 1.1;
  }, [content.width, content.height]);

  /** Batasi zoom & posisi agar area blok tetap memenuhi layar (tidak menampilkan ruang kosong di luar denah). */
  const constrain = useCallback(
    (next: ViewBox): ViewBox => {
      const aspect = container.current.height / container.current.width;
      const w = clamp(next.w, Math.min(MIN_VIEW_WIDTH, maxWidth()), maxWidth());
      const h = w * aspect;
      const cx = w >= content.width ? content.width / 2 : clamp(next.x + next.w / 2, w / 2, content.width - w / 2);
      const cy = h >= content.height ? content.height / 2 : clamp(next.y + next.h / 2, h / 2, content.height - h / 2);
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    },
    [content.width, content.height, maxWidth],
  );

  const commit = useCallback(
    (next: ViewBox) => {
      view.current = next;
      svgRef.current?.setAttribute("viewBox", `${next.x} ${next.y} ${next.w} ${next.h}`);
      onViewChangeRef.current?.(next, container.current);
    },
    [svgRef],
  );

  const stopAnimation = useCallback(() => {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
    goal.current = null;
  }, []);

  /** Terapkan langsung (gestur) atau dengan transisi singkat (tombol). */
  const apply = useCallback(
    (next: ViewBox, animate = false) => {
      stopAnimation();
      const to = constrain(next);
      const from = view.current;
      if (!animate || prefersReducedMotion()) return commit(to);
      // Frame pertama dijalankan langsung agar tombol terasa responsif.
      const start = performance.now() - 16;
      const step = (now: number) => {
        const t = Math.min((now - start) / ANIMATION_MS, 1);
        const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
        commit({
          x: from.x + (to.x - from.x) * e,
          y: from.y + (to.y - from.y) * e,
          w: from.w + (to.w - from.w) * e,
          h: from.h + (to.h - from.h) * e,
        });
        if (t < 1) {
          animation.current = requestAnimationFrame(step);
        } else {
          animation.current = null;
          goal.current = null;
        }
      };
      goal.current = to;
      step(performance.now());
    },
    [commit, constrain, stopAnimation],
  );

  /** Tampilkan seluruh persegi (unit SVG) di layar, mis. area makam yang sudah terisi. */
  const fitRect = useCallback(
    (rect: ViewBox, animate = true) => {
      const aspect = container.current.height / container.current.width;
      const w = Math.max(rect.w, rect.h / aspect) * 1.02;
      apply({ x: rect.x + rect.w / 2 - w / 2, y: rect.y + rect.h / 2 - (w * aspect) / 2, w, h: w * aspect }, animate);
    },
    [apply],
  );

  const fitAll = useCallback(
    (animate = true) => fitRect({ x: 0, y: 0, w: content.width, h: content.height }, animate),
    [fitRect, content.width, content.height],
  );

  const focusOn = useCallback(
    (x: number, y: number, width: number, animate = false) => {
      const aspect = container.current.height / container.current.width;
      apply({ x: x - width / 2, y: y - (width * aspect) / 2, w: width, h: width * aspect }, animate);
    },
    [apply],
  );

  const zoomBy = useCallback(
    (factor: number, anchor?: { x: number; y: number }, animate = false) => {
      // Saat animasi berjalan, zoom dihitung dari tujuan akhir agar klik beruntun tetap konsisten.
      const v = goal.current ?? view.current;
      const ax = anchor?.x ?? v.x + v.w / 2;
      const ay = anchor?.y ?? v.y + v.h / 2;
      apply({ x: ax - (ax - v.x) * factor, y: ay - (ay - v.y) * factor, w: v.w * factor, h: v.h * factor }, animate);
    },
    [apply],
  );

  const panBy = useCallback(
    (dxUnits: number, dyUnits: number, animate = false) => {
      const v = goal.current ?? view.current;
      apply({ ...v, x: v.x + dxUnits, y: v.y + dyUnits }, animate);
    },
    [apply],
  );

  /** Konversi koordinat layar -> koordinat SVG. */
  const toSvgPoint = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const v = view.current;
    if (!rect) return { x: v.x, y: v.y };
    return { x: v.x + ((clientX - rect.left) / rect.width) * v.w, y: v.y + ((clientY - rect.top) / rect.height) * v.h };
  }, [svgRef]);

  const measure = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) container.current = { width: Math.max(rect.width, 1), height: Math.max(rect.height, 1) };
  }, [svgRef]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    measure();
    const observer = new ResizeObserver(() => {
      const center = { x: view.current.x + view.current.w / 2, y: view.current.y + view.current.h / 2 };
      measure();
      focusOn(center.x, center.y, view.current.w);
    });
    observer.observe(svg);

    const onPointerDown = (event: PointerEvent) => {
      stopAnimation();
      svg.setPointerCapture(event.pointerId);
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.current.size === 1) {
        gesture.current = {
          moved: 0,
          target: (event.target as Element | null)?.closest("[data-grave-id],[data-cell]") ?? null,
          pinchDistance: null,
        };
      } else {
        gesture.current.moved = Number.POSITIVE_INFINITY; // multi-touch bukan tap
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const previous = pointers.current.get(event.pointerId);
      if (!previous) return;
      const current = { x: event.clientX, y: event.clientY };
      pointers.current.set(event.pointerId, current);

      if (pointers.current.size === 1) {
        const dx = current.x - previous.x;
        const dy = current.y - previous.y;
        gesture.current.moved += Math.abs(dx) + Math.abs(dy);
        if (gesture.current.moved < TAP_TOLERANCE_PX) return;
        svg.dataset.dragging = "true";
        const scale = view.current.w / container.current.width;
        panBy(-dx * scale, -dy * scale);
      } else if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const previousDistance = gesture.current.pinchDistance;
        gesture.current.pinchDistance = distance;
        if (previousDistance && distance > 0) {
          zoomBy(previousDistance / distance, toSvgPoint((a.x + b.x) / 2, (a.y + b.y) / 2));
        }
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      const wasSingle = pointers.current.size === 1;
      pointers.current.delete(event.pointerId);
      if (pointers.current.size < 2) gesture.current.pinchDistance = null;
      if (pointers.current.size === 0) delete svg.dataset.dragging;
      if (wasSingle && gesture.current.moved < TAP_TOLERANCE_PX && event.type === "pointerup") {
        onTapRef.current(gesture.current.target);
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(Math.max(-60, Math.min(60, event.deltaY)) * 0.004);
      zoomBy(factor, toSvgPoint(event.clientX, event.clientY));
    };

    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerup", onPointerUp);
    svg.addEventListener("pointercancel", onPointerUp);
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      stopAnimation();
      svg.removeEventListener("pointerdown", onPointerDown);
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointerup", onPointerUp);
      svg.removeEventListener("pointercancel", onPointerUp);
      svg.removeEventListener("wheel", onWheel);
    };
  }, [svgRef, focusOn, panBy, zoomBy, toSvgPoint, measure, stopAnimation]);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      const step = view.current.w * 0.15;
      const actions: Record<string, () => void> = {
        ArrowLeft: () => panBy(-step, 0, true),
        ArrowRight: () => panBy(step, 0, true),
        ArrowUp: () => panBy(0, -step, true),
        ArrowDown: () => panBy(0, step, true),
        "+": () => zoomBy(0.8, undefined, true),
        "=": () => zoomBy(0.8, undefined, true),
        "-": () => zoomBy(1.25, undefined, true),
      };
      const action = actions[event.key];
      if (action) {
        event.preventDefault();
        action();
      }
    },
    [panBy, zoomBy],
  );

  return {
    zoomIn: () => zoomBy(0.7, undefined, true),
    zoomOut: () => zoomBy(1.4, undefined, true),
    fitAll,
    fitRect,
    focusOn,
    panBy,
    onKeyDown,
    measure,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
