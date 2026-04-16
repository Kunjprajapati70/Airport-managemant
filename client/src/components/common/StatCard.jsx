/**
 * StatCard
 * KPI metric card used in dashboards.
 *
 * Props:
 *   title    - metric label
 *   value    - primary value (string or number)
 *   subtitle - secondary line (e.g. "vs last month")
 *   icon     - react-icons component
 *   color    - 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'cyan' | 'amber'
 *   trend    - number (positive = up, negative = down, undefined = hidden)
 *   onClick  - optional click handler
 */

import React from 'react';

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20' },
  green:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  orange: { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/20' },
  red:    { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20' },
  purple: { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/20' },
  cyan:   { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/20' },
  amber:  { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
  indigo: { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/20' },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color   = 'blue',
  trend,
  onClick,
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;

  return (
    <div
      className={`stat-card ${onClick ? 'cursor-pointer hover:border-dark-600 transition-colors' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${c.bg} ${c.border}`}>
        {Icon && <Icon size={20} className={c.text} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-dark-500 text-xs font-medium uppercase tracking-wider truncate">
          {title}
        </p>
        <p className="text-2xl font-bold text-dark-100 mt-0.5 leading-none">
          {value ?? '—'}
        </p>
        {subtitle && (
          <p className="text-dark-500 text-xs mt-1 truncate">{subtitle}</p>
        )}
      </div>

      {/* Trend indicator */}
      {trend !== undefined && (
        <div className={`text-xs font-semibold flex-shrink-0 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}
