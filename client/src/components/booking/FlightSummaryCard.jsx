/**
 * FlightSummaryCard.jsx
 * Compact flight info card shown at the top of booking steps.
 */

import React from 'react';
import { formatDateTime, formatTime, formatCurrency, getFlightDuration } from '../../utils/helpers';
import StatusBadge from '../common/StatusBadge';
import { FiSend } from 'react-icons/fi';

export default function FlightSummaryCard({ flight, seatClass, passengerCount }) {
  if (!flight) return null;

  const priceMap = { economy: flight.economyPrice, business: flight.businessPrice, first: flight.firstClassPrice };
  const unitPrice = priceMap[seatClass] ?? flight.economyPrice;
  const duration  = getFlightDuration(flight.scheduledDeparture, flight.scheduledArrival);

  return (
    <div className="card bg-gradient-to-r from-primary-950/60 to-dark-800 border-primary-700/30">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Airline */}
        <div className="flex items-center gap-3 sm:w-44 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 font-bold text-sm flex-shrink-0">
            {flight.airline?.code}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-dark-100 truncate">{flight.airline?.name}</p>
            <p className="text-2xs text-dark-500 font-mono">{flight.flightNumber}</p>
          </div>
        </div>

        {/* Route */}
        <div className="flex-1 flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-dark-100">{formatTime(flight.scheduledDeparture)}</p>
            <p className="text-sm font-semibold text-dark-300">{flight.departureAirport?.code}</p>
            <p className="text-2xs text-dark-500">{flight.departureAirport?.city}</p>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <p className="text-2xs text-dark-500">{duration}</p>
            <div className="w-full flex items-center gap-1">
              <div className="flex-1 h-px bg-dark-600" />
              <FiSend size={11} className="text-primary-400 flex-shrink-0" />
              <div className="flex-1 h-px bg-dark-600" />
            </div>
            <p className="text-2xs text-dark-600">Direct</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-dark-100">{formatTime(flight.scheduledArrival)}</p>
            <p className="text-sm font-semibold text-dark-300">{flight.arrivalAirport?.code}</p>
            <p className="text-2xs text-dark-500">{flight.arrivalAirport?.city}</p>
          </div>
        </div>

        {/* Price + meta */}
        <div className="text-right flex-shrink-0">
          <p className="text-2xs text-dark-500 capitalize">{seatClass} · {passengerCount} pax</p>
          <p className="text-xl font-bold text-primary-400">{formatCurrency(unitPrice * passengerCount)}</p>
          <p className="text-2xs text-dark-500 mt-0.5">{formatDateTime(flight.scheduledDeparture).split('·')[0].trim()}</p>
        </div>
      </div>

      {/* Gate / terminal info */}
      {(flight.departureTerminal || flight.departureGate) && (
        <div className="flex gap-4 mt-3 pt-3 border-t border-dark-700/50 text-2xs text-dark-500">
          {flight.departureTerminal && <span>Terminal: {flight.departureTerminal.code}</span>}
          {flight.departureGate     && <span>Gate: {flight.departureGate.gateNumber}</span>}
          {flight.aircraft          && <span>Aircraft: {flight.aircraft.model}</span>}
        </div>
      )}
    </div>
  );
}
