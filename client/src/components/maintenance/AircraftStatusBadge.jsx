/**
 * AircraftStatusBadge.jsx
 * Colored badge for aircraft operational status.
 */

import React from 'react';
import { FiCheckCircle, FiTool, FiAlertTriangle, FiXCircle, FiSend } from 'react-icons/fi';

const CONFIG = {
  available:   { icon: FiCheckCircle,   color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Available' },
  assigned:    { icon: FiSend,          color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',          label: 'Assigned' },
  maintenance: { icon: FiTool,          color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',       label: 'Maintenance' },
  grounded:    { icon: FiAlertTriangle, color: 'bg-red-500/10 text-red-400 border-red-500/20',             label: 'Grounded' },
  retired:     { icon: FiXCircle,       color: 'bg-dark-600 text-dark-400 border-dark-500',                label: 'Retired' },
};

export default function AircraftStatusBadge({ status, showIcon = true }) {
  const cfg = CONFIG[status] ?? { icon: FiCheckCircle, color: 'bg-dark-700 text-dark-400 border-dark-600', label: status };
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {showIcon && <Icon size={11} />}
      {cfg.label}
    </span>
  );
}
