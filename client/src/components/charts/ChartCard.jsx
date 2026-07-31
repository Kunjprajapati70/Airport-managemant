/**
 * ChartCard.jsx
 * Wrapper card for all chart components with consistent styling.
 */

import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

export default function ChartCard({ title, subtitle, children, loading, action, className = '' }) {
  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-dark-100 text-sm">{title}</h3>
          {subtitle && <p className="text-2xs text-dark-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><LoadingSpinner size="md" /></div>
      ) : (
        children
      )}
    </div>
  );
}
