/**
 * AircraftCard.jsx
 * Compact aircraft status card used in the maintenance dashboard.
 */

import React from 'react';
import MaintenanceStatusBadge from './MaintenanceStatusBadge';
import { formatDate } from '../../utils/helpers';
import { FiAlertTriangle, FiTool } from 'react-icons/fi';

export default function AircraftCard({ aircraft, onClick }) {
  const isDue = aircraft.isMaintenanceDue || aircraft.nextMaintenanceDue
    ? new Date(aircraft.nextMaintenanceDue) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false;

  const isOverdue = aircraft.nextMaintenanceDue
    ? new Date(aircraft.nextMaintenanceDue) < new Date()
    : false;

  return (
    <button
      onClick={onClick}
      className={`card-hover w-full text-left transition-all ${
        aircraft.status === 'grounded'    ? 'border-red-500/30' :
        aircraft.status === 'maintenance' ? 'border-amber-500/30' :
        isOverdue                         ? 'border-red-500/20' :
        isDue                             ? 'border-amber-500/20' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-mono font-bold text-dark-100">{aircraft.registrationNumber}</p>
          <p className="text-xs text-dark-400 mt-0.5">{aircraft.model}</p>
          <p className="text-2xs text-dark-500">{aircraft.airline?.name}</p>
        </div>
        <MaintenanceStatusBadge status={aircraft.status} type="aircraft" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-dark-500">Flight Hours</p>
          <p className="text-dark-200 font-medium">{aircraft.totalFlightHours?.toLocaleString() ?? 0}h</p>
        </div>
        <div>
          <p className="text-dark-500">Last Service</p>
          <p className="text-dark-200 font-medium">
            {aircraft.lastMaintenanceDate ? formatDate(aircraft.lastMaintenanceDate) : '—'}
          </p>
        </div>
      </div>

      {/* Next service */}
      {aircraft.nextMaintenanceDue && (
        <div className={`mt-3 flex items-center gap-1.5 p-2 rounded-lg border text-xs ${
          isOverdue ? 'bg-red-500/10 border-red-500/20 text-red-400' :
          isDue     ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
          'bg-dark-700/40 border-dark-600 text-dark-400'
        }`}>
          {(isOverdue || isDue) && <FiAlertTriangle size={11} />}
          {!isOverdue && !isDue && <FiTool size={11} />}
          <span>
            {isOverdue ? 'Overdue: ' : 'Due: '}
            {formatDate(aircraft.nextMaintenanceDue)}
          </span>
        </div>
      )}

      {/* Grounding reason */}
      {aircraft.status === 'grounded' && aircraft.groundingReason && (
        <p className="mt-2 text-2xs text-red-400 truncate">{aircraft.groundingReason}</p>
      )}
    </button>
  );
}
