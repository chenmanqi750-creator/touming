import * as React from 'react';

type FusionLayerProps = {
  isExploding?: boolean;
  clickPoint?: { x: number; y: number } | null;
  intensity: number;
  style?: React.CSSProperties;
};

type FusionSpot = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
  angle: number;
  drift: number;
};

const SPOT_COUNT = 18;
const FLASH_DURATION = 220;
const DISSOLVE_DURATION = 1200;
const OUT_DURATION = 300;

function createFusionSpots(clickPoint: { x: number; y: number } | null): FusionSpot[] {
  const baseX = clickPoint?.x ?? 0.5;
  const baseY = clickPoint?.y ?? 0.5;
  const spots: FusionSpot[] = [];

  for (let i = 0; i < SPOT_COUNT; i += 1) {
    const offsetRadius = 0.05 + Math.random() * 0.18;
    const angle = Math.random() * Math.PI * 2;
    const x = baseX + Math.cos(angle) * offsetRadius + (Math.random() - 0.5) * 0.12;
    const y = baseY + Math.sin(angle) * offsetRadius + (Math.random() - 0.5) * 0.12;
    spots.push({
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      radius: 0.06 + Math.random() * 0.12,
      speed: 0.02 + Math.random() * 0.04,
      alpha: 0.18 + Math.random() * 0.18,
      angle: Math.random() * Math.PI * 2,
      drift: 0.25 + Math.random() * 0.5,
    });
  }

  return spots;
}

export function FusionLayer({ isExploding = false, clickPoint = null, intensity, style }: FusionLayerProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const activeRef = React.useRef(false);
  const startTimeRef = React.useRef<number>(0);
  const flashRef = React.useRef(false);
  const [spots, setSpots] = React.useState<FusionSpot[]>(() => createFusionSpots(clickPoint));

  React.useEffect(() => {
    if (!isExploding) return;
    setSpots(createFusionSpots(clickPoint));
    activeRef.current = true;
    flashRef.current = true;
    startTimeRef.current = performance.now();
    const flashTimeout = window.setTimeout(() => {
      flashRef.current = false;
    }, FLASH_DURATION);
    return () => {
      window.clearTimeout(flashTimeout);
    };
  }, [isExploding, clickPoint]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const draw = (now: number) => {
      const width = canvas.clientWidth * window.devicePixelRatio;
      const height = canvas.clientHeight * window.devicePixelRatio;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);
      if (!activeRef.current) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, width, height);
        rafId = window.requestAnimationFrame(draw);
        return;
      }

      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, elapsed / DISSOLVE_DURATION);
      const fade = Math.max(0, 1 - (elapsed - DISSOLVE_DURATION) / OUT_DURATION);
      const compositeOpacity = Math.max(0, fade);

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, width, height);

      if (flashRef.current) {
        const flashRadius = width * 0.18;
        const clickX = (clickPoint?.x ?? 0.5) * width;
        const clickY = (clickPoint?.y ?? 0.5) * height;
        const flashOpacity = 0.35 + intensity * 0.15;
        const grad = ctx.createRadialGradient(clickX, clickY, 0, clickX, clickY, flashRadius);
        grad.addColorStop(0, `rgba(255,255,255,${flashOpacity})`);
        grad.addColorStop(0.55, 'rgba(255,255,255,0.18)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.globalCompositeOperation = 'screen';
      ctx.filter = 'blur(1px)';
      spots.forEach((spot, index) => {
        const drift = spot.drift * progress * 0.9;
        const angle = spot.angle + elapsed * 0.0006 * (index % 2 === 0 ? 1 : -1);
        const px = Math.max(0, Math.min(1, spot.x + Math.cos(angle) * drift));
        const py = Math.max(0, Math.min(1, spot.y + Math.sin(angle) * drift));
        const radius = (spot.radius + Math.sin(elapsed * 0.002 + index) * 0.02) * width;
        const alpha = spot.alpha * (1 - progress) * compositeOpacity;
        const grad = ctx.createRadialGradient(px * width, py * height, 0, px * width, py * height, radius);
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(0.4, `rgba(255,255,255,${alpha * 0.2})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px * width, py * height, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      const edgeGlow = ctx.createRadialGradient(width * 0.5, height * 0.5, width * 0.1, width * 0.5, height * 0.5, width * 0.55);
      edgeGlow.addColorStop(0, `rgba(255,255,255,${0.02 * (1 - progress)})`);
      edgeGlow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = edgeGlow;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,255,255,${0.02 * (1 - progress)})`;
      ctx.fillRect(0, 0, width, height);

      if (elapsed > DISSOLVE_DURATION + OUT_DURATION) {
        activeRef.current = false;
      }

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [clickPoint, intensity, spots]);

  React.useEffect(() => {
    if (!isExploding) {
      const delay = DISSOLVE_DURATION + OUT_DURATION;
      const timeout = window.setTimeout(() => {
        activeRef.current = false;
      }, delay);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [isExploding]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 11,
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        opacity: isExploding ? 1 : 0,
        transition: 'opacity 220ms ease',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          opacity: 0.85,
        }}
      />
    </div>
  );
}
