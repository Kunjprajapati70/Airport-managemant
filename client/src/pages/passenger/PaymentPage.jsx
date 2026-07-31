/**
 * PaymentPage.jsx
 * Shows payment status for a booking (accessed via /passenger/payment/:bookingId).
 * Useful when navigating back to check payment outcome.
 */

import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useBooking from '../../hooks/useBooking';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import PriceBreakdown from '../../components/booking/PriceBreakdown';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { FiCheckCircle, FiXCircle, FiArrowLeft, FiCheckSquare } from 'react-icons/fi';

export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate      = useNavigate();
  const { booking, loading, error } = useBooking(bookingId);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (error || !booking) return (
    <div className="text-center py-20">
      <p className="text-red-400 mb-4">{error || 'Booking not found'}</p>
      <button onClick={() => navigate(-1)} className="btn-secondary btn-sm">Go Back</button>
    </div>
  );

  const isConfirmed = booking.status === 'confirmed';
  const f = booking.flight;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-dark-400 hover:text-dark-200 text-sm">
        <FiArrowLeft size={15} /> Back
      </button>

      <h1 className="text-2xl font-bold text-dark-100">Payment Status</h1>

      {/* Status card */}
      <div className={`card text-center ${isConfirmed ? 'border-emerald-700/30 bg-emerald-900/10' : 'border-red-700/30 bg-red-900/10'}`}>
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${isConfirmed ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          {isConfirmed
            ? <FiCheckCircle size={28} className="text-emerald-400" />
            : <FiXCircle     size={28} className="text-red-400" />}
        </div>
        <h2 className="text-lg font-bold text-dark-100 mb-1">
          {isConfirmed ? 'Payment Successful' : 'Payment Failed'}
        </h2>
        <p className="text-dark-400 text-sm">
          {isConfirmed
            ? `Booking ${booking.pnr} is confirmed.`
            : 'Your payment was not processed. Please try booking again.'}
        </p>
      </div>

      {/* Booking summary */}
      <div className="card space-y-2">
        <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Booking Summary</p>
        {[
          ['PNR',        booking.pnr,                                    'font-mono text-primary-400 font-bold'],
          ['Flight',     f?.flightNumber,                                ''],
          ['Route',      `${f?.departureAirport?.code} → ${f?.arrivalAirport?.code}`, ''],
          ['Departure',  formatDateTime(f?.scheduledDeparture),          ''],
          ['Passengers', booking.passengers?.length,                     ''],
          ['Class',      booking.seatClass,                              'capitalize'],
          ['Status',     <StatusBadge status={booking.status} />,        ''],
        ].map(([label, value, cls]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-dark-400">{label}</span>
            <span className={`text-dark-200 ${cls}`}>{value ?? '—'}</span>
          </div>
        ))}
      </div>

      <PriceBreakdown
        basePrice={booking.basePrice}
        taxes={booking.taxes}
        fees={booking.fees}
        total={booking.totalAmount}
        passengerCount={booking.passengers?.length}
        seatClass={booking.seatClass}
      />

      {/* Actions */}
      <div className="flex gap-3">
        <Link to="/passenger/bookings" className="btn-primary flex-1 justify-center py-2.5">
          My Bookings
        </Link>
        {isConfirmed && (
          <Link to={`/passenger/checkin?pnr=${booking.pnr}`} className="btn-success flex-1 justify-center py-2.5">
            <FiCheckSquare size={15} /> Check-in
          </Link>
        )}
      </div>
    </div>
  );
}
