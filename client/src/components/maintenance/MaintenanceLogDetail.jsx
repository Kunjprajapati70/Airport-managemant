/**
 * MaintenanceLogDetail.jsx
 * Read-only detail view of a maintenance log.
 */

import React from 'react';
import MaintenanceStatusBadge from './MaintenanceStatusBadge';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/helpers';
import { FiTool, FiClock, FiDollarSign, FiPackage, FiUser } from 'react-icons/fi';

const Row = ({ label, value, mono }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-dark-700/40 last:border-0">
    <span className="text-dark-500 text-xs flex-shrink-0 w-36">{label}</span>
    <span className={`text-dark-200 text-sm text-right ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
  </div>
);

const PRIORITY_COLORS = {
  low:      'bg-blue-500/10 text-blue-400',
  normal:   'bg-dark-700 text-dark-400',
  high:     'bg-orange-500/10 text-orange-400',
  critical: 'bg-red-500/10 text-red-400',
};

export default function MaintenanceLogDetail({ log }) {
  if (!log) return null;

  const partsCost = (log.parts ?? []).reduce((s, p) => s + (p.unitCost * p.quantity), 0);
  const totalCost = (log.labourCost ?? 0) + partsCost;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-dark-100 text-lg">{log.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <MaintenanceStatusBadge status={log.status} />
            <span className={`badge text-2xs capitalize ${PRIORITY_COLORS[log.priority] ?? ''}`}>
              {log.priority} priority
            </span>
            <span className="badge bg-dark-700 text-dark-400 text-2xs capitalize">{log.type}</span>
          </div>
        </div>
      </div>

      {/* Aircraft */}
      <div className="card">
        <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FiTool size={13} /> Aircraft
        </p>
        <Row label="Registration" value={log.aircraft?.registrationNumber} mono />
        <Row label="Model"        value={log.aircraft?.model} />
        <Row label="Airline"      value={log.aircraft?.airline?.name} />
        <Row label="Status"       value={<MaintenanceStatusBadge status={log.aircraft?.status} type="aircraft" />} />
        <Row label="Flight Hours" value={`${log.aircraft?.totalFlightHours?.toLocaleString() ?? 0}h`} />
      </div>

      {/* Schedule */}
      <div className="card">
        <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FiClock size={13} /> Schedule
        </p>
        <Row label="Scheduled"       value={formatDate(log.scheduledDate)} />
        <Row label="Started"         value={log.startedAt   ? formatDateTime(log.startedAt)   : null} />
        <Row label="Completed"       value={log.completedAt ? formatDateTime(log.completedAt) : null} />
        <Row label="Est. Hours"      value={log.estimatedHours ? `${log.estimatedHours}h` : null} />
        <Row label="Actual Hours"    value={log.actualHours    ? `${log.actualHours}h`    : null} />
        <Row label="Next Service"    value={log.nextServiceDue ? formatDate(log.nextServiceDue) : null} />
        <Row label="Next Type"       value={log.nextServiceType} />
      </div>

      {/* Staff */}
      <div className="card">
        <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FiUser size={13} /> Staff
        </p>
        <Row label="Assigned To"  value={log.assignedTo  ? `${log.assignedTo.firstName} ${log.assignedTo.lastName}`   : null} />
        <Row label="Performed By" value={log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : null} />
        <Row label="Signed Off By"value={log.signedOffBy ? `${log.signedOffBy.firstName} ${log.signedOffBy.lastName}` : null} />
        <Row label="Signed Off At"value={log.signedOffAt ? formatDateTime(log.signedOffAt) : null} />
      </div>

      {/* Cost */}
      <div className="card">
        <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FiDollarSign size={13} /> Cost
        </p>
        <Row label="Labour Cost" value={formatCurrency(log.labourCost ?? 0)} />
        <Row label="Parts Cost"  value={formatCurrency(partsCost)} />
        <div className="flex justify-between pt-2 border-t border-dark-700 mt-1">
          <span className="text-dark-400 text-sm font-semibold">Total</span>
          <span className="text-primary-400 font-bold">{formatCurrency(totalCost)}</span>
        </div>
      </div>

      {/* Parts */}
      {log.parts?.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FiPackage size={13} /> Parts ({log.parts.length})
          </p>
          <div className="space-y-2">
            {log.parts.map((part, i) => (
              <div key={i} className="flex items-center justify-between bg-dark-700/40 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm text-dark-200 font-medium">{part.name}</p>
                  {part.partNumber && <p className="text-2xs text-dark-500 font-mono">{part.partNumber}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-dark-200">×{part.quantity}</p>
                  <p className="text-2xs text-dark-400">{formatCurrency(part.unitCost)} each</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description / Notes */}
      {log.description && (
        <div className="card">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Description</p>
          <p className="text-sm text-dark-300 leading-relaxed">{log.description}</p>
        </div>
      )}
      {log.notes && (
        <div className="card">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Completion Notes</p>
          <p className="text-sm text-dark-300 leading-relaxed">{log.notes}</p>
        </div>
      )}
    </div>
  );
}
