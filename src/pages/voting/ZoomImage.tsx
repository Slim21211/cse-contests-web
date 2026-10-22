import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import s from './voting.module.scss';

interface Props {
  src: string;
  alt: string;
  rotation: number;
  /** Свайп вниз без увеличения — закрыть просмотр. */
  onSwipeClose: () => void;
  /** Сдвиг при свайпе вниз (0…1) — чтобы затемнять фон. */
  onDrag?: (progress: number) => void;
}

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const CLOSE_DISTANCE = 120;

type Point = { x: number; y: number };

/**
 * Фото на весь экран: увеличение двумя пальцами, колёсиком и двойным тапом/кликом,
 * перетаскивание увеличенного, свайп вниз — закрыть. Без сторонних библиотек.
 */
const ZoomImage = ({ src, alt, rotation, onSwipeClose, onDrag }: Props) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const view = useRef({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    startScale: number;
    startX: number;
    startY: number;
    startDist: number;
    startMid: Point;
    startPoint: Point;
    startTime: number;
    moved: boolean;
    swiping: boolean;
  } | null>(null);
  const lastTap = useRef(0);

  const render = (animate = false) => {
    const el = layerRef.current;
    if (!el) return;
    const { scale, x, y } = view.current;
    el.style.transition = animate ? 'transform 0.22s ease' : 'none';
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  };

  /** Не даём увести увеличенное фото за край. */
  const clamp = () => {
    const box = boxRef.current;
    if (!box) return;
    const v = view.current;
    const maxX = ((v.scale - 1) * box.clientWidth) / 2;
    const maxY = ((v.scale - 1) * box.clientHeight) / 2;
    v.x = Math.max(-maxX, Math.min(maxX, v.x));
    v.y = Math.max(-maxY, Math.min(maxY, v.y));
  };

  /** Координата относительно центра области просмотра. */
  const local = (p: Point): Point => {
    const r = boxRef.current!.getBoundingClientRect();
    return { x: p.x - (r.left + r.width / 2), y: p.y - (r.top + r.height / 2) };
  };

  const zoomAt = (p: Point, nextScale: number, animate: boolean) => {
    const v = view.current;
    const k = nextScale / v.scale;
    v.x = p.x - (p.x - v.x) * k;
    v.y = p.y - (p.y - v.y) * k;
    v.scale = nextScale;
    if (v.scale <= 1.01) Object.assign(v, { scale: 1, x: 0, y: 0 });
    clamp();
    render(animate);
  };

  // Колёсико мыши на десктопе (passive: false — чтобы не прокручивать страницу).
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const next = Math.min(MAX_SCALE, Math.max(1, view.current.scale * Math.exp(-e.deltaY / 300)));
      zoomAt(local({ x: e.clientX, y: e.clientY }), next, false);
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, []);

  const begin = () => {
    const pts = [...pointers.current.values()];
    const v = view.current;
    const mid =
      pts.length > 1 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : pts[0];
    gesture.current = {
      startScale: v.scale,
      startX: v.x,
      startY: v.y,
      startDist: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
      startMid: local(mid),
      startPoint: pts[0],
      startTime: gesture.current?.startTime ?? Date.now(),
      moved: gesture.current?.moved ?? false,
      swiping: false,
    };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    begin();
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const v = view.current;
    const pts = [...pointers.current.values()];

    if (pts.length > 1) {
      g.moved = true;
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = local({ x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 });
      const scale = Math.min(MAX_SCALE, Math.max(1, (g.startScale * dist) / g.startDist));
      const k = scale / g.startScale;
      v.scale = scale;
      v.x = mid.x - (g.startMid.x - g.startX) * k;
      v.y = mid.y - (g.startMid.y - g.startY) * k;
      clamp();
      render();
      return;
    }

    const dx = e.clientX - g.startPoint.x;
    const dy = e.clientY - g.startPoint.y;
    if (Math.hypot(dx, dy) > 8) g.moved = true;

    if (v.scale > 1) {
      v.x = g.startX + dx;
      v.y = g.startY + dy;
      clamp();
      render();
    } else if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
      g.swiping = true;
      v.y = dy;
      render();
      onDrag?.(Math.min(1, dy / (CLOSE_DISTANCE * 2)));
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const g = gesture.current;
    const point = pointers.current.get(e.pointerId)!;
    pointers.current.delete(e.pointerId);
    const v = view.current;

    if (pointers.current.size > 0) {
      begin(); // остался один палец — продолжаем как перетаскивание
      return;
    }

    if (g?.swiping) {
      if (v.y > CLOSE_DISTANCE) {
        onSwipeClose();
        return;
      }
      v.y = 0;
      render(true);
      onDrag?.(0);
      return;
    }

    // Двойной тап / двойной клик — увеличить или вернуть.
    if (g && !g.moved && Date.now() - g.startTime < 300) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        lastTap.current = 0;
        zoomAt(local(point), v.scale > 1 ? 1 : DOUBLE_TAP_SCALE, true);
      } else {
        lastTap.current = now;
      }
    }
    gesture.current = null;
  };

  const sideways = rotation % 180 !== 0;

  return (
    <div
      ref={boxRef}
      className={s.zoomBox}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div ref={layerRef} className={s.zoomLayer}>
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={sideways ? s.zoomImgSideways : s.zoomImg}
          style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
        />
      </div>
    </div>
  );
};

export default ZoomImage;
