/**
 * CustomTooltip.jsx
 * Reusable dark-themed tooltip for all Recharts charts.
 */

import React from 'react';
import { formatCurrency, formatNumber } from '../../utils/helpers';

export function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 shadow-card-lg">
      <p className="text-dark-400 text-2xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {p.name?.toLowerCase().includes('revenue') || p.name?.toLowerCase().includes('amount')
            ? formatCurrency(p.value)
            : formatNumber(p.value)}
        </p>
      ))}
    </div>
  );
}

export function CountTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 shadow-card-lg">
      <p className="text-dark-400 text-2xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {formatNumber(p.value)}
        </p>
      ))}
    </div>
  );
}

export function DefaultTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 shadow-card-lg">
      <p className="text-dark-400 text-2xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {formatter ? formatter(p.value, p.name) : p.value}
        </p>
      ))}
    </div>
  );
}
