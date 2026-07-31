/**
 * SecurityStatusBadge.jsx
 * Colored badge for security check status with icon.
 */

import React from 'react';
import { FiCheckCircle, FiAlertTriangle, FiXCircle, FiClock, FiShield } from 'react-icons/fi';

const CONFIG = {
  pending:  { icon: FiClock,         color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',  label: 'Pending' },
  cleared:  { icon: FiCheckCircle,   color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Cleared' },
  flagged:  { icon: FiAlertTriangle, color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',  label: 'Flagged' },
  rejected: { icon: FiXCircle,       color: 'bg-red-500/10 text-red-400 border-red-500/20',           label: 'Rejected' },
};

export default function SecurityStatusBadge({ status, showIcon = true, size = 'sm' }) {
  const cfg = CONFIG[status] ?? { icon: FiShield, color: 'bg-dark-700 text-dark-400 border-dark-600', label: status };
  const Icon = cfg.icon;
  const textSize = size === 'lg' ? 'text-sm' : 'text-2xs';
  const iconSize = size === 'lg' ? 15 : 11;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium border ${cfg.color} ${textSize}`}>
      {showIcon && <Icon size={iconSize} />}
      {cfg.label}
    </span>
  );
}
