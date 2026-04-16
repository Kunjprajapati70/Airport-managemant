/**
 * MaintenanceStatusBadge.jsx
 * Colored badge for maintenance log status and aircraft status.
 */

import React from 'react';
import { FiClock, FiTool, FiCheckCircle, FiAlertTriangle, FiZapOff } from 'react-icons/fi';

const LOG_CONFIG = {
  scheduled:   { icon: FiClock,         color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',     label: 'Scheduled' },
  in_progress: { icon: FiTool,          color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',  label: 'In Progress' },
  completed:   { icon: FiCheckCircle,   color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Completed' },
  overdue:     { icon: FiAlertTriangle, color: 'bg-red-500/10 text-red-400 border-red-500/20',        label: 'Overdue' },
};

const AIRCRAFT_CONFIG = {
  available:   { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Available' },
  assigned:    { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',          label: 'Assigned' },
  maintenance: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',       label: 'Maintenance' },
  grounded:    { color: 'bg-red-500/10 text-red-400 border-red-500/20',             label: 'Grounded' },
  retired:     { color: 'bg-dark-600 text-dark-400 border-dark-500',                label: 'Retired' },
};

export default function MaintenanceStatusBadge({ status, type = 'log', showIcon = true }) {
  const config = type === 'aircraft'
    ? (AIRCRAFT_CONFIG[status] ?? { color: 'bg-dark-700 text-dark-400 border-dark-600', label: status })
    : (LOG_CONFIG[status]      ?? { color: 'bg-dark-700 text-dark-400 border-dark-600', label: status });

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      {showIcon && Icon && <Icon size={11} />}
      {config.label}
    </span>
  );
}
