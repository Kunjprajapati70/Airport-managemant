/**
 * FlightDetailPanel.jsx
 * Read-only detail view of a single flight.
 * Shown in a slide-over or modal when a row is clicked.
 */

import React from 'react';
import StatusBadge from '../common/StatusBadge';
import { formatDateTime, formatTime, formatCurrency, getFlightDuration } from '../../utils/helpers';
import { FiSend, FiClock, FiMapPin, FiUsers, FiDollarSign, FiInfo } from 'react-icons/fi';

const Row = ({ label, value, mono }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-dark-700/40 last:border-0">
    <span className="text-dark-500 text-xs flex-shrink-0 w-36">{label}</span>
    <span className={`text-dark-200 text-sm text-right ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
  </div>
);

export default function FlightDetailPanel({ flight, onClose }) {
  if (!flight) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl font-bold text-dark-100 font-mono">{flight.flightNumber}</span>
            <StatusBadge status={flight.status} />
          </div>
          <p className="text-dark-400 text-sm">{flight.airline?.name} ({flight.airline?.code})</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-dark-500">Duration</p>
          <p className="text-dark-200 font-medium">{getFlightDuration(flight.scheduledDeparture, flight.scheduledArrival)}</p>
        </div>
      </div>

      {/* Route visual */}
      <div className="flex items-center gap-3 p-4 bg-dark-700/40 rounded-xl border border-dark-600">
        <div className="text-center flex-1">
          <p className="text-2xl font-bold text-dark-100">{flight.departureAirport?.code}</p>
          <p className="text-xs text-dark-400 mt-0.5">{flight.departureAirport?.city}</p>
          <p className="text-sm font-semibold text-primary-400 mt-1">{formatTime(flight.scheduledDeparture)}</p>
          {flight.estimatedDeparture && flight.status === 'delayed' && (
            <p className="text-xs text-orange-400">Est. {formatTime(flight.estimatedDeparture)}</p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="w-16 h-px bg-dark-600" />
          <FiSend size={14} className="text-primary-400" />
          <div className="w-16 h-px bg-dark-600" />
        </div>
        <div className="text-center flex-1">
          <p className="text-2xl font-bold text-dark-100">{flight.arrivalAirport?.code}</p>
          <p className="text-xs text-dark-400 mt-0.5">{flight.arrivalAirport?.city}</p>
          <p className="text-sm font-semibold text-primary-400 mt-1">{formatTime(flight.scheduledArrival)}</p>
        </div>
      </div>

      {/* Schedule */}
      <div>
        <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">Schedule</p>
        <Row label="Scheduled Departure" value={formatDateTime(flight.scheduledDeparture)} />
        <Row label="Scheduled Arrival"   value={formatDateTime(flight.scheduledArrival)} />
        {flight.actualDeparture && <Row label="Actual Departure" value={formatDateTime(flight.actualDeparture)} />}
        {flight.actualArrival   && <Row label="Actual Arrival"   value={formatDateTime(flight.actualArrival)} />}
        {flight.status === 'delayed' && (
          <>
            <Row label="Delay"        value={`${flight.delayMinutes} minutes`} />
            <Row label="Delay Reason" value={flight.delayReason} />
          </>
        )}
        {flight.status === 'cancelled' && (
          <Row label="Cancellation Reason" value={flight.cancellationReason} />
        )}
      </div>

      {/* Aircraft */}
      <div>
        <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">Aircraft</p>
        <Row label="Registration" value={flight.aircraft?.registrationNumber} mono />
        <Row label="Model"        value={flight.aircraft?.model} />
        <Row label="Total Seats"  value={flight.aircraft?.totalSeats} />
        <Row label="Booked / Available" value={`${flight.bookedSeats} / ${flight.availableSeats}`} />
      </div>

      {/* Resources */}
      <div>
        <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">Resources</p>
        <Row label="Dep. Terminal" value={flight.departureTerminal?.name} />
        <Row label="Dep. Gate"     value={flight.departureGate?.gateNumber ? `Gate ${flight.departureGate.gateNumber}` : null} />
        <Row label="Arr. Terminal" value={flight.arrivalTerminal?.name} />
        <Row label="Arr. Gate"     value={flight.arrivalGate?.gateNumber ? `Gate ${flight.arrivalGate.gateNumber}` : null} />
        <Row label="Runway"        value={flight.runway?.runwayId} mono />
        <Row label="Parking Bay"   value={flight.parkingBay?.bayNumber} />
      </div>

      {/* Pricing */}
      <div>
        <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">Pricing</p>
        <Row label="Economy"     value={formatCurrency(flight.economyPrice)} />
        <Row label="Business"    value={formatCurrency(flight.businessPrice)} />
        <Row label="First Class" value={formatCurrency(flight.firstClassPrice)} />
      </div>

      {/* Operational windows */}
      <div>
        <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">Operational Windows</p>
        <Row label="Check-in Opens"  value={formatDateTime(flight.checkInOpenTime)} />
        <Row label="Check-in Closes" value={formatDateTime(flight.checkInCloseTime)} />
        <Row label="Boarding Opens"  value={formatDateTime(flight.boardingOpenTime)} />
        <Row label="Boarding Closes" value={formatDateTime(flight.boardingCloseTime)} />
      </div>

      {flight.notes && (
        <div className="p-3 bg-dark-700/40 rounded-xl border border-dark-600">
          <p className="text-xs text-dark-500 mb-1">Notes</p>
          <p className="text-dark-300 text-sm">{flight.notes}</p>
        </div>
      )}
    </div>
  );
}
