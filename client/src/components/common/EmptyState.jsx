/**
 * EmptyState
 * Shown when a list or table has no data.
 *
 * Props:
 *   title       - heading text
 *   description - subtext
 *   icon        - react-icons component
 *   action      - ReactNode (e.g. a button)
 */

import React from 'react';
import { FiInbox } from 'react-icons/fi';

export default function EmptyState({
  title       = 'No data found',
  description,
  icon: Icon  = FiInbox,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-dark-700/60 border border-dark-600 flex items-center justify-center mb-4">
        <Icon size={26} className="text-dark-500" />
      </div>
      <h3 className="text-dark-200 font-semibold text-sm mb-1">{title}</h3>
      {description && (
        <p className="text-dark-500 text-xs max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
