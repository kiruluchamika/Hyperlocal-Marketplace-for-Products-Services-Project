import React from 'react';
import bloadGif from '@/assets/load/bload.gif';

interface GifLoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  imageClassName?: string;
}

const sizeClasses: Record<NonNullable<GifLoaderProps['size']>, string> = {
  xs: 'h-4 w-4',
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

const GifLoader: React.FC<GifLoaderProps> = ({
  size = 'md',
  label,
  className = '',
  imageClassName = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <img
        src={bloadGif}
        alt={label || 'Loading'}
        className={`${sizeClasses[size]} object-contain ${imageClassName}`}
      />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
};

export default GifLoader;