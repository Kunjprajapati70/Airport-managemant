/**
 * BookingCard.jsx
 * Compact booking summary card used in My Bookings list.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import { formatDateTime, formatTime, formatCurrency, getFlightDuration } from '../../utils/helpers';
import { FiSend, FiClock, FiUsers, FiEye, FiX, FiCheckSquare, FiRefreshCw } from 'react-icons/fi';

export default function BookingCard({ booking, onCancel, onReschedule }) {
  const f = booking.flight;
  const isUpcoming  = f && new Date(f.scheduledDeparture) > new Date();
  const canCancel   = booking.status === 'confirmed' && isUpcoming;
  const canCheckin  = booking.status === 'confirmed' && isUpcoming;
  const canReschedule = booking.status === 'confirmed' && isUpcoming;

  return (
    <div className="card-hover">
      {/* Top row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left: flight info */}
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-sm flex-shrink-0">
            {f?.airline?.code ?? '?'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-sm font-bold text-primary-400">{booking.pnr}</span>
              <StatusBadge status={booking.status} />
              {booking.rescheduledAt && (
                <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20 text-2xs">
                  Rescheduled
                </span>
              )}
            </div>
            <p className="text-dark-100 font-semibold">
              {f?.departureAirport?.code} → {f?.arrivalAirport?.code}
            </p>
            <p className="text-dark-400 text-xs mt-0.5">
              {f?.airline?.name} · {f?.flightNumber}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-2xs text-dark-500">
              <span className="flex items-center gap-1">
                <FiClock size={11} />
                {formatDateTime(f?.scheduledDeparture)}
              </span>
              <span>{getFlightDuration(f?.scheduledDeparture, f?.scheduledArrival)}</span>
              <span className="flex items-center gap-1">
                <FiUsers size={11} />
                {booking.passengers?.length} pax
              </span>
              <span className="capitalize">{booking.seatClass}</span>
            </div>
          </div>
        </div>

        {/* Right: price + actions */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-lg font-bold text-dark-100">{formatCurrency(booking.totalAmount)}</p>
            <p className="text-2xs text-dark-500">
              {booking.passengers?.length} × {booking.seatClass}
            </p>
          </div>

          <div className="flex gap-1.5 flex-wrap justify-end">
            <Link
              to={`/passenger/bookings/${booking._id}`}
              className="btn-secondary btn-sm"
            >
              <FiEye size={13} /> Details
            </Link>

            {canCheckin && (
              <Link
                to={`/passenger/checkin?pnr=${booking.pnr}`}
                className="btn-success btn-sm"
              >
                <FiCheckSquare size={13} /> Check-in
              </Link>
            )}

            {canReschedule && onReschedule && (
              <button onClick={() => onReschedule(booking)} className="btn-secondary btn-sm">
                <FiRefreshCw size={13} /> Reschedule
              </button>
            )}

            {canCancel && onCancel && (
              <button onClick={() => onCancel(booking)} className="btn-danger btn-sm">
                <FiX size={13} /> Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seat assignments */}
      {booking.passengers?.some((p) => p.seatNumber) && (
        <div className="mt-3 pt-3 border-t border-dark-700/40 flex flex-wrap gap-2">
          {booking.passengers.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-dark-700/50 rounded-lg px-2.5 py-1">
              <span className="text-2xs text-dark-400">{p.firstName}</span>
              {p.seatNumber && (
                <span className="text-2xs font-mono text-dark-200 bg-dark-600 px-1.5 py-0.5 rounded">
                  {p.seatNumber}
                </span>
              )}
              <StatusBadge status={p.checkinStatus} />
            </div>
          ))}
        </div>
      )}

      {/* Cancellation info */}
      {booking.status === 'cancelled' && booking.refundAmount > 0 && (
        <div className="mt-3 pt-3 border-t border-dark-700/40 flex items-center justify-between text-xs">
          <span className="text-dark-500">Refund: {formatCurrency(booking.refundAmount)}</span>
          {booking.cancellationFee > 0 && (
            <span className="text-dark-500">Fee: {formatCurrency(booking.cancellationFee)}</span>
          )}
        </div>
      )}
    </div>
  );
}
