import React from 'react';
import GifLoader from './GifLoader';

interface FullPageLoaderProps {
  label?: string;
  overlay?: boolean;
}

const FullPageLoader: React.FC<FullPageLoaderProps> = ({ label = 'Loading...', overlay = false }) => {
  if (overlay) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/20 backdrop-blur-[1px]">
        <div className="rounded-2xl border border-white/60 bg-white/90 px-8 py-6 shadow-xl">
          <GifLoader size="lg" label={label} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/70">
      <GifLoader size="lg" label={label} />
    </div>
  );
};

export default FullPageLoader;