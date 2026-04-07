import React from 'react';
import GifLoader from './GifLoader';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const gifSize = size === 'sm' ? 'xs' : size === 'md' ? 'sm' : 'md';

  return (
    <GifLoader
      size={gifSize}
      className={className}
      imageClassName={sizeClasses[size]}
    />
  );
};

export default Spinner;
