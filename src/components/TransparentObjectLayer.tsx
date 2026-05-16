import * as React from 'react';
import * as THREE from 'three';

const SOURCE_CANVAS_SIZE = 240;
const MAX_SOURCE_POINTS = 1800;
const DEFAULT_FILTER_INTENSITY = 0.24;
const DEFAULT_DROP_SHADOW = 'drop-shadow(0 0 12px rgba(56, 189, 248, 0.14))';

export type TransparentImageConfig = {
  opacity?: number;
  scale?: number;
  filterIntensity?: number;
  mixBlendMode?: string;
  dropShadow?: string;
  glow?: string;
};

export type TransparentObjectLayerProps = {
  imageSrc: string;
  imageConfig?: TransparentImageConfig;
  isFadedOut?: boolean;
  fadeDurationMs?: number;
  onSourceReady?: (points: THREE.Vector3[]) => void;
  style?: React.CSSProperties;
};

export function TransparentObjectLayer({
  imageSrc,
  imageConfig,
  isFadedOut = false,
  fadeDurationMs = 1200,
  onSourceReady,
  style,
}: TransparentObjectLayerProps) {
  const [opacity, setOpacity] = React.useState(imageConfig?.opacity ?? 1);

  React.useEffect(() => {
    setOpacity(isFadedOut ? 0 : imageConfig?.opacity ?? 1);
  }, [isFadedOut, imageConfig?.opacity]);

  React.useEffect(() => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = SOURCE_CANVAS_SIZE;
      canvas.height = SOURCE_CANVAS_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx || !onSourceReady) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      try {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const points: THREE.Vector3[] = [];

        const getLuminance = (px: number, py: number) => {
          if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return 0;
          const index = (py * canvas.width + px) * 4;
          const r2 = data[index];
          const g2 = data[index + 1];
          const b2 = data[index + 2];
          return (0.299 * r2 + 0.587 * g2 + 0.114 * b2) / 255;
        };

        for (let y = 0; y < canvas.height; y += 2) {
          for (let x = 0; x < canvas.width; x += 2) {
            const idx = (y * canvas.width + x) * 4;
            const alpha = data[idx + 3];
            if (alpha < 50) continue;

            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            if (lum < 0.14 && alpha < 110) continue;

            const gradient = (
              Math.abs(lum - getLuminance(x - 2, y)) +
              Math.abs(lum - getLuminance(x + 2, y)) +
              Math.abs(lum - getLuminance(x, y - 2)) +
              Math.abs(lum - getLuminance(x, y + 2))
            ) / 4;
            const edgeBoost = Math.min(1, gradient * 3.2);
            const weight = Math.min(1, (alpha / 255) * (0.2 + lum * 0.8) + edgeBoost * 0.65);
            if (Math.random() > weight) continue;

            const nx = (x / canvas.width - 0.5) * 18;
            const ny = -(y / canvas.height - 0.5) * 18;
            const nz = (Math.random() - 0.5) * 2.5;
            points.push(new THREE.Vector3(nx, ny, nz));
          }
        }

        if (points.length > MAX_SOURCE_POINTS) {
          const reduced: THREE.Vector3[] = [];
          const step = points.length / MAX_SOURCE_POINTS;
          for (let i = 0; i < MAX_SOURCE_POINTS; i += 1) {
            reduced.push(points[Math.floor(i * step)]);
          }
          onSourceReady(reduced);
        } else if (points.length > 0) {
          onSourceReady(points);
        }
      } catch (error) {
        console.warn('TransparentObjectLayer image sampling failed', error);
      }
    };

    return () => {
      image.onload = null;
    };
  }, [imageSrc, onSourceReady]);

  const filterIntensity = imageConfig?.filterIntensity ?? DEFAULT_FILTER_INTENSITY;
  const filterString = `invert(${filterIntensity}) grayscale(${filterIntensity * 100}%) contrast(${1 + filterIntensity}) brightness(${1 + filterIntensity * 0.5})`;
  const additionalFilter = [imageConfig?.dropShadow ?? DEFAULT_DROP_SHADOW, imageConfig?.glow].filter(Boolean).join(' ');
  const combinedFilter = `${filterString}${additionalFilter ? ` ${additionalFilter}` : ''}`;
  const blendMode = imageConfig?.mixBlendMode ?? 'screen';
  const scale = imageConfig?.scale ?? 1;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 12,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '72rem',
          maxHeight: '82vh',
          padding: '2rem',
          boxSizing: 'border-box',
          opacity,
          transition: `opacity ${fadeDurationMs}ms ease`,
          filter: combinedFilter,
          transform: `translateZ(0) scale(${scale})`,
          mixBlendMode: blendMode,
        }}
      >
        <img
          src={imageSrc}
          alt="Transparent object"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            mixBlendMode: 'inherit',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
}
