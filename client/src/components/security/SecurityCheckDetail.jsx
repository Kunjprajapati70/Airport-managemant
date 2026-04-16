/**
 * SecurityCheckDetail.jsx
 * Read-only detail view of a security check record.
 * Shows passenger info, verification status, incidents, restricted items.
 */

import React from 'react';
import SecurityStatusBadge from './SecurityStatusBadge';
import { formatDateTime } from '../../utils/helpers';
import { FiAlertTriangle, FiCheckCircle, FiShield, FiPackage, FiFileText } from 'react-icons/fi';

const Row = ({ label, value, mono }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-dark-700/40 last:border-0">
    <span className="text-dark-500 text-xs flex-shrink-0 w-36">{label}</span>
    <span className={`text-dark-200 text-sm text-right ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
  </div>
);

const CheckItem = ({ checked, label }) => (
  <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${
    checked ? 'border-emerald-500/20 bg-emerald-900/10' : 'border-dark-600 bg-dark-700/30'
  }`}>
    {checked
      ? <FiCheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
      : <div className="w-3 h-3 rounded-full border border-dark-500 flex-shrink-0" />}
    <span className={`text-xs font-medium ${checked ? 'text-emerald-300' : 'text-dark-400'}`}>{label}</span>
  </div>
);

export default function SecurityCheckDetail({ check }) {
  if (!check) return null;

  const SEVERITY_COLORS = {
    low:      'text-blue-400',
    medium:   'text-amber-400',
    high:     'text-orange-400',
    critical: 'text-red-400',
  };

  const ACTION_COLORS = {
    confiscated: 'text-red-400',
    returned:    'text-amber-400',
    allowed:     'text-emerald-400',
    escalated:   'text-orange-400',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-dark-100 text-lg">{check.passengerName}</p>
          <p className="text-dark-400 text-sm mt-0.5">
            {check.flight?.flightNumber} · {check.booking?.pnr}
          </p>
          {check.seatNumber && (
            <p className="text-dark-500 text-xs mt-0.5">Seat {check.seatNumber} · {check.seatClass}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <SecurityStatusBadge status={check.status} size="lg" />
          {check.isWatchlisted && (
            <span className="badge bg-red-500/10 text-red-400 border-red-500/20 text-2xs">
              ⚠️ Watchlisted
            </span>
          )}
          {check.boardingOverride && (
            <span className="badge bg-purple-500/10 text-purple-400 border-purple-500/20 text-2xs">
              Override Applied
            </span>
          )}
        </div>
      </div>

      {/* Boarding block alert */}
      {(check.status === 'rejected' || check.status === 'flagged') && !check.boardingOverride && (
        <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border ${
          check.status === 'rejected'
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-orange-500/10 border-orange-500/20'
        }`}>
          <FiAlertTriangle size={15} className={check.status === 'rejected' ? 'text-red-400' : 'text-orange-400'} />
          <div>
            <p className={`text-sm font-semibold ${check.status === 'rejected' ? 'text-red-400' : 'text-orange-400'}`}>
              {check.status === 'rejected' ? 'Boarding Denied' : 'Boarding Blocked — Pending Review'}
            </p>
            {check.flagReason && (
              <p className="text-xs text-dark-300 mt-0.5">{check.flagReason}</p>
            )}
          </div>
        </div>
      )}

      {/* Override info */}
      {check.boardingOverride && (
        <div className="flex items-start gap-2.5 p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <FiShield size={15} className="text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-purple-400">Boarding Override Applied</p>
            <p className="text-xs text-dark-300 mt-0.5">{check.boardingOverrideReason}</p>
            <p className="text-2xs text-dark-500 mt-0.5">
              By {check.boardingOverrideBy?.firstName} {check.boardingOverrideBy?.lastName}
              {' · '}{formatDateTime(check.boardingOverrideAt)}
            </p>
          </div>
        </div>
      )}

      {/* Passenger info */}
      <div className="card">
        <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Passenger Information</p>
        <Row label="Passport No."  value={check.passportNumber} mono />
        <Row label="Nationality"   value={check.nationality} />
        <Row label="Seat"          value={check.seatNumber ? `${check.seatNumber} (${check.seatClass})` : null} />
        <Row label="Checked By"    value={check.checkedBy ? `${check.checkedBy.firstName} ${check.checkedBy.lastName}` : null} />
        <Row label="Cleared At"    value={check.clearedAt  ? formatDateTime(check.clearedAt)  : null} />
        <Row label="Rejected At"   value={check.rejectedAt ? formatDateTime(check.rejectedAt) : null} />
      </div>

      {/* Verification checklist */}
      <div className="card">
        <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Verification Checklist</p>
        <div className="grid grid-cols-2 gap-2">
          <CheckItem checked={check.documentVerified}  label="Documents Verified" />
          <CheckItem checked={check.baggageCleared}    label="Baggage Cleared" />
          <CheckItem checked={check.biometricVerified} label="Biometric Verified" />
          <CheckItem checked={check.visaVerified}      label="Visa Verified" />
        </div>
      </div>

      {/* Restricted items */}
      {check.restrictedItems?.length > 0 && (
        <div className="card border-amber-700/30 bg-amber-900/5">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FiPackage size={13} /> Restricted Items ({check.restrictedItems.length})
          </p>
          <div className="space-y-2">
            {check.restrictedItems.map((item) => (
              <div key={item._id} className="flex items-start justify-between gap-3 p-2.5 bg-dark-700/40 rounded-lg border border-dark-600">
                <div>
                  <p className="text-sm font-medium text-dark-100">{item.item}</p>
                  {item.description && <p className="text-xs text-dark-400 mt-0.5">{item.description}</p>}
                  <p className="text-2xs text-dark-500 mt-0.5">{formatDateTime(item.loggedAt)}</p>
                </div>
                <span className={`text-xs font-medium capitalize flex-shrink-0 ${ACTION_COLORS[item.action] ?? 'text-dark-400'}`}>
                  {item.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incidents */}
      {check.incidents?.length > 0 && (
        <div className="card border-red-700/30 bg-red-900/5">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FiFileText size={13} /> Incidents ({check.incidents.length})
          </p>
          <div className="space-y-2">
            {check.incidents.map((inc) => (
              <div key={inc._id} className="p-2.5 bg-dark-700/40 rounded-lg border border-dark-600">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-dark-100 capitalize">{inc.type.replace(/_/g, ' ')}</p>
                  <span className={`text-2xs font-semibold capitalize ${SEVERITY_COLORS[inc.severity] ?? 'text-dark-400'}`}>
                    {inc.severity}
                  </span>
                </div>
                <p className="text-xs text-dark-300">{inc.description}</p>
                <p className="text-2xs text-dark-500 mt-1">{formatDateTime(inc.loggedAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {check.incidentNotes && (
        <div className="card">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Officer Notes</p>
          <p className="text-sm text-dark-300 leading-relaxed">{check.incidentNotes}</p>
        </div>
      )}

      {/* Watchlist */}
      {check.isWatchlisted && check.watchlistReason && (
        <div className="card border-red-700/30 bg-red-900/10">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Watchlist Reason</p>
          <p className="text-sm text-dark-300">{check.watchlistReason}</p>
        </div>
      )}
    </div>
  );
}
