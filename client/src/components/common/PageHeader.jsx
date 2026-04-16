/**
 * PageHeader
 * Consistent page title + subtitle + optional action button row.
 *
 * Props:
 *   title    - string
 *   subtitle - string (optional)
 *   actions  - ReactNode (optional — buttons on the right)
 */

import React from 'react';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-xl font-bold text-dark-100">{title}</h1>
        {subtitle && <p className="text-dark-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}
