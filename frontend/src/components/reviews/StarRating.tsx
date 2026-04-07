import React from 'react';
import { FiStar } from 'react-icons/fi';

interface StarRatingProps {
  rating: number;
  outOf?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
};

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  outOf = 5,
  size = 'md',
  interactive = false,
  onChange,
}) => {
  const roundedRating = Math.max(0, Math.min(outOf, rating));

  return (
    <div className={`inline-flex items-center gap-1 ${sizeClasses[size]}`}>
      {Array.from({ length: outOf }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= Math.round(roundedRating);

        return (
          <button
            key={starValue}
            type="button"
            onClick={() => interactive && onChange?.(starValue)}
            className={`transition-colors ${interactive ? 'cursor-pointer hover:scale-105' : 'cursor-default'} ${isFilled ? 'text-amber-400' : 'text-slate-300'}`}
            disabled={!interactive}
            aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
          >
            <FiStar className={isFilled ? 'fill-current' : ''} />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
