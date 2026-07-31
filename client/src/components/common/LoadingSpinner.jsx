/**
 * LoadingSpinner
 * Sizes: sm | md | lg
 * fullScreen: covers the entire viewport (used during app initialization)
 */

import React from 'react';

const SIZES = {
  sm: 'w-4 h-4 border-[1.5px]',
  md: 'w-7 h-7 border-2',
  lg: 'w-11 h-11 border-2',
};

export default function LoadingSpinner({ fullScreen = false, size = 'md', label }) {
  const spinner = (
    <div
      className={`${SIZES[size]} border-dark-600 border-t-primary-500 rounded-full animate-spin`}
      role="status"
      aria-label={label || 'Loading'}
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-dark-950 flex flex-col items-center justify-center z-50 gap-4">
        <div className="w-12 h-12 border-2 border-dark-700 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-dark-400 text-sm animate-pulse-soft">
          {label || 'Loading AeroManage…'}
        </p>
      </div>
    );
  }

  return spinner;
}
