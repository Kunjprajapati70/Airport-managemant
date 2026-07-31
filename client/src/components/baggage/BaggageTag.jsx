/**
 * BaggageTag.jsx
 * Visual baggage tag card — shows tag number, weight, status, and type.
 */

import React from 'react';
import StatusBadge from '../common/StatusBadge';
import { formatCurrency } from '../../utils/helpers';
import { FiPackage, FiAlertTriangle } from 'react-icons/fi';

const TYPE_ICONS = {
  checked:   '🧳',
  carry_on:  '👜',
  oversized: '📦',
  fragile:   '🔮',
  special:   '⭐',
};

const STATUS_COLORS = {
  registered:       'border-blue-500/30 bg-blue-900/10',
  checked_in:       'border-cyan-500/30 bg-cyan-900/10',
  security_scanned: 'border-purple-500/30 bg-purple-900/10',
  loaded:           'border-indigo-500/30 bg-indigo-900/10',
  in_transit:       'border-cyan-500/30 bg-cyan-900/10',
  arrived:          'border-emerald-500/30 bg-emerald-900/10',
  claimed:          'border-emerald-500/30 bg-emerald-900/10',
  missing:          'border-orange-500/30 bg-orange-900/10',
  lost:             'border-red-500/30 bg-red-900/10',
};

export default function BaggageTag({ baggage, compact = false }) {
  if (!baggage) return null;

  const borderColor = STATUS_COLORS[baggage.status] ?? 'border-dark-600 bg-dark-800';

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-3 rounded-xl border ${borderColor}`}>
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{TYPE_ICONS[baggage.type] ?? '📦'}</span>
          <div>
            <p className="font-mono font-semibold text-dark-100 text-sm">{baggage.tagNumber}</p>
            <p className="text-2xs text-dark-400">{baggage.weight}kg · <span className="capitalize">{baggage.type}</span></p>
          </div>
        </div>
        <StatusBadge status={baggage.status} />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-5 ${borderColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-dark-700 border border-dark-600 flex items-center justify-center text-2xl">
            {TYPE_ICONS[baggage.type] ?? '📦'}
          </div>
          <div>
            <p className="font-mono font-bold text-primary-400 text-xl leading-none">{baggage.tagNumber}</p>
            <p className="text-dark-400 text-sm mt-0.5 capitalize">{baggage.type} baggage</p>
          </div>
        </div>
        <StatusBadge status={baggage.status} />
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-2xs text-dark-500 uppercase tracking-wider">Weight</p>
          <p className="text-dark-200 font-medium mt-0.5">{baggage.weight}kg</p>
        </div>
        <div>
          <p className="text-2xs text-dark-500 uppercase tracking-wider">Allowance</p>
          <p className="text-dark-200 font-medium mt-0.5">{baggage.allowedWeight}kg</p>
        </div>
        {baggage.color && (
          <div>
            <p className="text-2xs text-dark-500 uppercase tracking-wider">Color</p>
            <p className="text-dark-200 font-medium mt-0.5 capitalize">{baggage.color}</p>
          </div>
        )}
        {baggage.flight?.flightNumber && (
          <div>
            <p className="text-2xs text-dark-500 uppercase tracking-wider">Flight</p>
            <p className="text-dark-200 font-mono font-medium mt-0.5">{baggage.flight.flightNumber}</p>
          </div>
        )}
      </div>

      {/* Excess fee */}
      {baggage.excessWeight > 0 && (
        <div className={`mt-3 flex items-center justify-between p-2.5 rounded-xl border ${
          baggage.excessFeePaid
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-amber-500/10 border-amber-500/20'
        }`}>
          <div className="flex items-center gap-2">
            <FiAlertTriangle size={13} className={baggage.excessFeePaid ? 'text-emerald-400' : 'text-amber-400'} />
            <span className="text-xs text-dark-300">
              Excess: {baggage.excessWeight}kg · Fee: {formatCurrency(baggage.excessFee)}
            </span>
          </div>
          <span className={`text-2xs font-medium ${baggage.excessFeePaid ? 'text-emerald-400' : 'text-amber-400'}`}>
            {baggage.excessFeePaid ? 'Paid' : 'Unpaid'}
          </span>
        </div>
      )}

      {/* Lost alert */}
      {baggage.isLost && (
        <div className="mt-3 flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
          <FiAlertTriangle size={13} className="text-red-400" />
          <p className="text-xs text-red-400">Reported as lost. Contact airline for assistance.</p>
        </div>
      )}
    </div>
  );
}
