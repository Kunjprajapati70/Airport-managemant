/**
 * CheckinWindow.jsx
 * Shows check-in window status with countdown.
 */

import React, { useState, useEffect } from 'react';
import { formatDateTime } from '../../utils/helpers';
import { FiClock, FiCheckCircle, FiAlertTriangle, FiXCircle } from 'react-icons/fi';

export default function CheckinWindow({ status }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  if (!status) return null;

  const { checkInOpen, checkInEarly, checkInLate, windowOpensAt, windowClosesAt } = status;

  if (checkInOpen) {
    const minsLeft = windowClosesAt
      ? Math.max(0, Math.round((new Date(windowClosesAt) - now) / 60000))
      : null;
    return (
      <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
        <FiCheckCircle size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-emerald-400 font-semibold text-sm">Check-in is Open</p>
          {minsLeft !== null && (
            <p className="text-emerald-400/70 text-xs mt-0.5">
              Closes in {minsLeft > 60
                ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m`
                : `${minsLeft} minute${minsLeft !== 1 ? 's' : ''}`}
              {windowClosesAt && ` · ${formatDateTime(windowClosesAt)}`}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (checkInEarly) {
    const minsUntil = windowOpensAt
      ? Math.max(0, Math.round((new Date(windowOpensAt) - now) / 60000))
      : null;
    return (
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <FiClock size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-400 font-semibold text-sm">Check-in Not Open Yet</p>
          {minsUntil !== null && (
            <p className="text-blue-400/70 text-xs mt-0.5">
              Opens in {minsUntil > 60
                ? `${Math.floor(minsUntil / 60)}h ${minsUntil % 60}m`
                : `${minsUntil} minute${minsUntil !== 1 ? 's' : ''}`}
              {windowOpensAt && ` · ${formatDateTime(windowOpensAt)}`}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (checkInLate) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
        <FiXCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-red-400 font-semibold text-sm">Check-in Closed</p>
          <p className="text-red-400/70 text-xs mt-0.5">
            Online check-in closed at {formatDateTime(windowClosesAt)}.
            Please proceed to the airport check-in counter.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
