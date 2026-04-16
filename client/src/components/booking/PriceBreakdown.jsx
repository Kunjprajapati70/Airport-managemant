/**
 * PriceBreakdown.jsx
 * Itemised price breakdown shown in booking and payment pages.
 */

import React from 'react';
import { formatCurrency } from '../../utils/helpers';

export default function PriceBreakdown({ basePrice, taxes, fees, total, passengerCount, seatClass, rescheduleFee }) {
  const unitPrice = passengerCount > 0 ? basePrice / passengerCount : basePrice;

  return (
    <div className="bg-dark-700/40 border border-dark-600 rounded-xl p-4 space-y-2">
      <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Price Breakdown</p>

      <div className="flex justify-between text-sm">
        <span className="text-dark-400">
          Base fare ({passengerCount} × {formatCurrency(unitPrice)} · <span className="capitalize">{seatClass}</span>)
        </span>
        <span className="text-dark-200">{formatCurrency(basePrice)}</span>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-dark-400">Taxes &amp; surcharges (12%)</span>
        <span className="text-dark-200">{formatCurrency(taxes)}</span>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-dark-400">Service fee ({passengerCount} × $15)</span>
        <span className="text-dark-200">{formatCurrency(fees)}</span>
      </div>

      {rescheduleFee > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-dark-400">Reschedule fee</span>
          <span className="text-amber-400">{formatCurrency(rescheduleFee)}</span>
        </div>
      )}

      <div className="flex justify-between font-bold pt-2 border-t border-dark-600">
        <span className="text-dark-100">Total</span>
        <span className="text-primary-400 text-lg">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
