/**
 * FlightSearch.jsx
 * Public flight search page for passengers.
 * Reads initial params from URL query string so links work.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { formatTime, formatDate, formatDateTime, formatCurrency, getFlightDuration } from '../../utils/helpers';
import { FiSearch, FiSend, FiArrowRight, FiClock, FiUsers, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CLASS_OPTIONS = [
  { value: 'economy',  label: 'Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first',    label: 'First Class' },
];

export default function FlightSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((s) => s.auth);

  const [airports,  setAirports]  = useState([]);
  const [flights,   setFlights]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [searched,  setSearched]  = useState(false);
  const [expanded,  setExpanded]  = useState(null); // expanded flight _id

  const [form, setForm] = useState({
    from:       searchParams.get('from')       || '',
    to:         searchParams.get('to')         || '',
    date:       searchParams.get('date')       || new Date().toISOString().split('T')[0],
    seatClass:  searchParams.get('seatClass')  || 'economy',
    passengers: searchParams.get('passengers') || '1',
  });

  // Load airports
  useEffect(() => {
    api.get('/airports').then((r) => setAirports(r.data.airports || []));
  }, []);

  // Auto-search if URL params present
  useEffect(() => {
    if (searchParams.get('from') && searchParams.get('to')) {
      handleSearch();
    }
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!form.from || !form.to) { toast.error('Please select departure and arrival airports'); return; }
    if (form.from === form.to)  { toast.error('Departure and arrival airports cannot be the same'); return; }

    setLoading(true);
    setSearched(true);
    try {
      const { data } = await api.get('/flights/search', {
        params: {
          from:       form.from,
          to:         form.to,
          date:       form.date,
          seatClass:  form.seatClass,
          passengers: form.passengers,
        },
      });
      setFlights(data.flights);
      // Update URL
      setSearchParams({
        from:       form.from,
        to:         form.to,
        date:       form.date,
        seatClass:  form.seatClass,
        passengers: form.passengers,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = (flight) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to book a flight');
      navigate('/login', { state: { from: { pathname: `/passenger/book/${flight._id}` } } });
      return;
    }
    navigate(`/passenger/book/${flight._id}?class=${form.seatClass}&passengers=${form.passengers}`);
  };

  const getPriceForClass = (flight) => {
    const map = { economy: flight.economyPrice, business: flight.businessPrice, first: flight.firstClassPrice };
    return map[form.seatClass] ?? flight.economyPrice;
  };

  const depAirport = airports.find((a) => a._id === form.from);
  const arrAirport = airports.find((a) => a._id === form.to);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-dark-100 mb-6">Search Flights</h1>

      {/* ── Search form ──────────────────────────────────────────────────── */}
      <form onSubmit={handleSearch} className="card mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* From */}
          <div className="lg:col-span-1">
            <label className="label">From</label>
            <select value={form.from} onChange={set('from')} className="input" required>
              <option value="">Select airport</option>
              {airports.map((a) => (
                <option key={a._id} value={a._id}>{a.code} — {a.city}</option>
              ))}
            </select>
          </div>

          {/* To */}
          <div className="lg:col-span-1">
            <label className="label">To</label>
            <select value={form.to} onChange={set('to')} className="input" required>
              <option value="">Select airport</option>
              {airports
                .filter((a) => a._id !== form.from)
                .map((a) => (
                  <option key={a._id} value={a._id}>{a.code} — {a.city}</option>
                ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={form.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={set('date')}
              className="input"
              required
            />
          </div>

          {/* Class */}
          <div>
            <label className="label">Class</label>
            <select value={form.seatClass} onChange={set('seatClass')} className="input">
              {CLASS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Passengers + Search */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="label">Passengers</label>
              <select value={form.passengers} onChange={set('passengers')} className="input">
                {[1,2,3,4,5,6,7,8,9].map((n) => (
                  <option key={n} value={n}>{n} pax</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={loading} className="btn-primary py-2.5 px-4 flex-shrink-0">
              {loading ? <LoadingSpinner size="sm" /> : <FiSearch size={16} />}
            </button>
          </div>
        </div>
      </form>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : searched && flights.length === 0 ? (
        <EmptyState
          title="No flights available"
          description={`No ${form.seatClass} class flights found from ${depAirport?.code ?? '?'} to ${arrAirport?.code ?? '?'} on ${formatDate(form.date)}`}
          icon={FiSend}
        />
      ) : (
        <div className="space-y-4">
          {searched && (
            <p className="text-dark-400 text-sm">
              {flights.length} flight{flights.length !== 1 ? 's' : ''} found ·{' '}
              {depAirport?.code} → {arrAirport?.code} · {formatDate(form.date)} ·{' '}
              <span className="capitalize">{form.seatClass}</span> · {form.passengers} passenger{form.passengers > 1 ? 's' : ''}
            </p>
          )}

          {flights.map((flight) => {
            const price    = getPriceForClass(flight);
            const isOpen   = expanded === flight._id;
            const duration = getFlightDuration(flight.scheduledDeparture, flight.scheduledArrival);

            return (
              <div key={flight._id} className="card-hover">
                {/* Main row */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                  {/* Airline */}
                  <div className="flex items-center gap-3 lg:w-44 flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-sm flex-shrink-0">
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

                    <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <p className="text-2xs text-dark-500">{duration}</p>
                      <div className="w-full flex items-center gap-1">
                        <div className="flex-1 h-px bg-dark-600" />
                        <FiSend size={12} className="text-primary-400 flex-shrink-0" />
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

                  {/* Price + CTA */}
                  <div className="flex items-center gap-4 lg:flex-col lg:items-end lg:gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-2xs text-dark-500 capitalize">{form.seatClass} · per person</p>
                      <p className="text-2xl font-bold text-primary-400">{formatCurrency(price)}</p>
                      <p className="text-2xs text-dark-500">{flight.availableSeats} seats left</p>
                    </div>
                    <button
                      onClick={() => handleBook(flight)}
                      className="btn-primary whitespace-nowrap"
                    >
                      Book Now <FiArrowRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(isOpen ? null : flight._id)}
                  className="flex items-center gap-1.5 mt-4 text-2xs text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {isOpen ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                  {isOpen ? 'Hide details' : 'Show details'}
                </button>

                {/* Expanded details */}
                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-dark-700 grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
                    <div>
                      <p className="text-2xs text-dark-500 uppercase tracking-wider">Terminal</p>
                      <p className="text-sm text-dark-200 mt-0.5">
                        {flight.departureTerminal?.name ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-2xs text-dark-500 uppercase tracking-wider">Gate</p>
                      <p className="text-sm text-dark-200 mt-0.5">
                        {flight.departureGate?.gateNumber ? `Gate ${flight.departureGate.gateNumber}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-2xs text-dark-500 uppercase tracking-wider">Aircraft</p>
                      <p className="text-sm text-dark-200 mt-0.5">{flight.aircraft?.model ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-dark-500 uppercase tracking-wider">Status</p>
                      <div className="mt-0.5"><StatusBadge status={flight.status} /></div>
                    </div>
                    <div>
                      <p className="text-2xs text-dark-500 uppercase tracking-wider">Economy</p>
                      <p className="text-sm text-dark-200 mt-0.5">{formatCurrency(flight.economyPrice)}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-dark-500 uppercase tracking-wider">Business</p>
                      <p className="text-sm text-dark-200 mt-0.5">{formatCurrency(flight.businessPrice)}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-dark-500 uppercase tracking-wider">First Class</p>
                      <p className="text-sm text-dark-200 mt-0.5">{formatCurrency(flight.firstClassPrice)}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-dark-500 uppercase tracking-wider">Check-in Opens</p>
                      <p className="text-sm text-dark-200 mt-0.5">
                        {flight.checkInOpenTime ? formatDateTime(flight.checkInOpenTime) : '—'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
