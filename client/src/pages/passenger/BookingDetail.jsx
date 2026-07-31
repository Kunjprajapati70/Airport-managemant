/**
 * BookingDetail.jsx
 * Full booking detail page — accessible via /passenger/bookings/:id
 */

import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useBooking from '../../hooks/useBooking';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FlightSummaryCard from '../../components/booking/FlightSummaryCard';
import PriceBreakdown from '../../components/booking/PriceBreakdown';
import { formatDateTime, formatCurrency, formatDate } from '../../utils/helpers';
import {
  FiArrowLeft, FiCheckSquare, FiDownload, FiUsers,
  FiCreditCard, FiInfo, FiRefreshCw,
} from 'react-icons/fi';

const Row = ({ label, value, mono, highlight }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-dark-700/40 last:border-0">
    <span className="text-dark-500 text-xs flex-shrink-0 w-36">{label}</span>
    <span className={`text-sm text-right ${mono ? 'font-mono' : ''} ${highlight ? 'text-primary-400 font-bold' : 'text-dark-200'}`}>
      {value ?? '—'}
    </span>
  </div>
);

export default function BookingDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { booking, loading, error } = useBooking(id);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (error)   return (
    <div className="text-center py-20">
      <p className="text-red-400 mb-4">{error}</p>
      <button onClick={() => navigate(-1)} className="btn-secondary btn-sm">Go Back</button>
    </div>
  );
  if (!booking) return null;

  const f = booking.flight;
  const isUpcoming = f && new Date(f.scheduledDeparture) > new Date();
  const canCheckin = booking.status === 'confirmed' && isUpcoming;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-dark-400 hover:text-dark-200 text-sm transition-colors">
        <FiArrowLeft size={15} /> Back to bookings
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xl font-bold text-primary-400">{booking.pnr}</span>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-dark-400 text-sm">Booked {formatDateTime(booking.bookedAt)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canCheckin && (
            <Link to={`/passenger/checkin?pnr=${booking.pnr}`} className="btn-success btn-sm">
              <FiCheckSquare size={14} /> Check-in
            </Link>
          )}
        </div>
      </div>

      {/* Flight summary */}
      {f && <FlightSummaryCard flight={f} seatClass={booking.seatClass} passengerCount={booking.passengers?.length} />}

      {/* Booking info */}
      <div className="card">
        <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Booking Information</p>
        <Row label="PNR"               value={booking.pnr}              mono highlight />
        <Row label="Reference"         value={booking.bookingReference} mono />
        <Row label="Status"            value={<StatusBadge status={booking.status} />} />
        <Row label="Seat Class"        value={booking.seatClass}        />
        <Row label="Passengers"        value={booking.passengers?.length} />
        <Row label="Booked At"         value={formatDateTime(booking.bookedAt)} />
        <Row label="Source"            value={booking.source}           />
        {booking.rescheduledAt && (
          <Row label="Rescheduled At"  value={formatDateTime(booking.rescheduledAt)} />
        )}
        {booking.status === 'cancelled' && (
          <>
            <Row label="Cancelled At"  value={formatDateTime(booking.cancelledAt)} />
            <Row label="Cancel Reason" value={booking.cancellationReason} />
            <Row label="Refund Amount" value={formatCurrency(booking.refundAmount)} highlight />
          </>
        )}
      </div>

      {/* Passengers */}
      <div className="card">
        <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FiUsers size={13} /> Passengers
        </p>
        <div className="space-y-3">
          {booking.passengers?.map((p, i) => (
            <div key={i} className="bg-dark-700/40 rounded-xl p-4 border border-dark-600">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold text-dark-100">{p.firstName} {p.lastName}</p>
                  {p.passportNumber && (
                    <p className="text-2xs text-dark-500 font-mono mt-0.5">Passport: {p.passportNumber}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {p.seatNumber && (
                    <span className="font-mono text-sm text-dark-100 bg-dark-600 px-2.5 py-1 rounded-lg border border-dark-500">
                      {p.seatNumber}
                    </span>
                  )}
                  <StatusBadge status={p.checkinStatus} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-2xs text-dark-500">
                {p.dateOfBirth  && <span>DOB: {formatDate(p.dateOfBirth)}</span>}
                {p.nationality  && <span>Nationality: {p.nationality}</span>}
                {p.mealPreference && <span className="capitalize">Meal: {p.mealPreference.replace(/_/g, ' ')}</span>}
                {p.specialAssistance && <span className="text-amber-400">Special assistance</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price breakdown */}
      <PriceBreakdown
        basePrice={booking.basePrice}
        taxes={booking.taxes}
        fees={booking.fees}
        total={booking.totalAmount}
        passengerCount={booking.passengers?.length}
        seatClass={booking.seatClass}
        rescheduleFee={booking.rescheduleFee}
      />

      {/* Flight details */}
      {f && (
        <div className="card">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FiInfo size={13} /> Flight Details
          </p>
          <Row label="Flight Number"   value={f.flightNumber}                    mono />
          <Row label="Airline"         value={f.airline?.name}                   />
          <Row label="Aircraft"        value={f.aircraft?.model}                 />
          <Row label="Departure"       value={formatDateTime(f.scheduledDeparture)} />
          <Row label="Arrival"         value={formatDateTime(f.scheduledArrival)}   />
          <Row label="Terminal"        value={f.departureTerminal?.name}         />
          <Row label="Gate"            value={f.departureGate?.gateNumber ? `Gate ${f.departureGate.gateNumber}` : null} />
          <Row label="Check-in Opens"  value={f.checkInOpenTime  ? formatDateTime(f.checkInOpenTime)  : null} />
          <Row label="Check-in Closes" value={f.checkInCloseTime ? formatDateTime(f.checkInCloseTime) : null} />
        </div>
      )}
    </div>
  );
}
