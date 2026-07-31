/**
 * TravelHistory.jsx
 * Shows all completed flights for the passenger with stats and filtering.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import { formatDate, formatDateTime, formatCurrency, getFlightDuration } from '../../utils/helpers';
import { FiSend, FiCalendar, FiMapPin, FiClock, FiDollarSign } from 'react-icons/fi';

export default function TravelHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    api.get('/passengers/me/history')
      .then((r) => setHistory(r.data.history || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = history.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.pnr?.toLowerCase().includes(q) ||
      b.flight?.flightNumber?.toLowerCase().includes(q) ||
      b.flight?.departureAirport?.code?.toLowerCase().includes(q) ||
      b.flight?.arrivalAirport?.code?.toLowerCase().includes(q) ||
      b.flight?.departureAirport?.city?.toLowerCase().includes(q) ||
      b.flight?.arrivalAirport?.city?.toLowerCase().includes(q)
    );
  });

  // Stats
  const totalSpent    = history.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const totalFlights  = history.length;
  const destinations  = new Set(history.map((b) => b.flight?.arrivalAirport?.code)).size;

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Travel History"
        subtitle={`${totalFlights} completed trip${totalFlights !== 1 ? 's' : ''}`}
      />

      {/* Stats */}
      {totalFlights > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Flights',   value: totalFlights,              icon: FiSend,      color: 'text-primary-400' },
            { label: 'Destinations',    value: destinations,              icon: FiMapPin,    color: 'text-emerald-400' },
            { label: 'Total Spent',     value: formatCurrency(totalSpent),icon: FiDollarSign,color: 'text-amber-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card text-center">
              <Icon size={20} className={`${color} mx-auto mb-1`} />
              <p className="text-lg font-bold text-dark-100">{value}</p>
              <p className="text-2xs text-dark-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {totalFlights > 0 && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-sm"
          placeholder="Search by PNR, flight, city…"
        />
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No matching trips' : 'No travel history'}
          description={search ? 'Try a different search' : 'Your completed flights will appear here'}
          icon={FiSend}
          action={!search && <Link to="/flights/search" className="btn-primary btn-sm">Book a Flight</Link>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const f = b.flight;
            return (
              <Link
                key={b._id}
                to={`/passenger/bookings/${b._id}`}
                className="card-hover flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Airline badge */}
                <div className="w-12 h-12 rounded-xl bg-dark-700 border border-dark-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-400 font-bold text-sm">{f?.airline?.code ?? '?'}</span>
                </div>

                {/* Route */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-dark-100">
                      {f?.departureAirport?.code} → {f?.arrivalAirport?.code}
                    </span>
                    <span className="text-2xs text-dark-500 font-mono">{f?.flightNumber}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-dark-400 text-sm truncate">
                    {f?.departureAirport?.city} → {f?.arrivalAirport?.city}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-2xs text-dark-500">
                    <span className="flex items-center gap-1">
                      <FiCalendar size={10} />
                      {formatDate(f?.scheduledDeparture)}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiClock size={10} />
                      {getFlightDuration(f?.scheduledDeparture, f?.scheduledArrival)}
                    </span>
                    <span className="capitalize">{b.seatClass}</span>
                    <span>{b.passengers?.length} pax</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-dark-100">{formatCurrency(b.totalAmount)}</p>
                  <p className="text-2xs text-dark-500 font-mono mt-0.5">{b.pnr}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
