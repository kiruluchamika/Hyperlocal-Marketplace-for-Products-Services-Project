import React from 'react';

interface ImageMagnifierProps {
  src: string;
  alt: string;
  className?: string;
  magnifierSize?: number;
  zoom?: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const ImageMagnifier: React.FC<ImageMagnifierProps> = ({
  src,
  alt,
  className = '',
  magnifierSize = 150,
  zoom = 2.2,
}) => {
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const [isActive, setIsActive] = React.useState(false);
  const [cursor, setCursor] = React.useState({ x: 0, y: 0 });
  const [bounds, setBounds] = React.useState({ width: 0, height: 0 });

  const updatePosition = (event: React.MouseEvent<HTMLDivElement>) => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    const rect = image.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);

    setBounds({ width: rect.width, height: rect.height });
    setCursor({ x, y });
  };

  const backgroundSize = `${bounds.width * zoom}px ${bounds.height * zoom}px`;
  const lensOffset = magnifierSize / 2;

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      onMouseEnter={(event) => {
        setIsActive(true);
        updatePosition(event);
      }}
      onMouseMove={updatePosition}
      onMouseLeave={() => setIsActive(false)}
    >
      <img ref={imageRef} src={src} alt={alt} className="h-full w-full object-cover" />

      {isActive && bounds.width > 0 && bounds.height > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full border-2 border-white shadow-[0_18px_45px_rgba(15,23,42,0.28)] ring-2 ring-primary-500/60"
          style={{
            width: magnifierSize,
            height: magnifierSize,
            left: clamp(cursor.x - lensOffset, 8, Math.max(8, bounds.width - magnifierSize - 8)),
            top: clamp(cursor.y - lensOffset, 8, Math.max(8, bounds.height - magnifierSize - 8)),
            backgroundImage: `url(${src})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize,
            backgroundPosition: `${-(cursor.x * zoom - lensOffset)}px ${-(cursor.y * zoom - lensOffset)}px`,
            backgroundColor: '#fff',
          }}
        />
      )}

      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-900/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        Hover to zoom
      </div>
    </div>
  );
};

export default ImageMagnifier;
