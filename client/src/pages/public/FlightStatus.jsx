/**
 * FlightStatus.jsx
 * Public live departure/arrival board.
 * Auto-refreshes every 30 seconds and subscribes to Socket.IO flight updates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { formatTime, formatDateTime } from '../../utils/helpers';
import { FiRefreshCw, FiSend, FiSearch, FiClock, FiAlertTriangle } from 'react-icons/fi';

const STATUS_TABS = [
  { value: '',           label: 'All' },
  { value: 'scheduled',  label: 'Scheduled' },
  { value: 'boarding',   label: 'Boarding' },
  { value: 'in_flight',  label: 'In Flight' },
  { value: 'delayed',    label: 'Delayed' },
  { value: 'arrived',    label: 'Arrived' },
  { value: 'cancelled',  label: 'Cancelled' },
];

export default function FlightStatus() {
  const [flights,    setFlights]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [statusTab,  setStatusTab]  = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchLive = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/flights/live');
      setFlights(data.flights);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Live status fetch failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + 30-second auto-refresh
  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 30000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = ({ flight: updated }) => {
      setFlights((prev) => {
        const exists = prev.find((f) => f._id === updated._id);
        if (exists) return prev.map((f) => (f._id === updated._id ? { ...f, ...updated } : f));
        return [updated, ...prev]; // new flight appeared
      });
      setLastUpdate(new Date());
    };
    socket.on('flightUpdate', handler);
    return () => socket.off('flightUpdate', handler);
  }, []);

  // Filter
  const filtered = flights.filter((f) => {
    const matchSearch = !search ||
      f.flightNumber.toLowerCase().includes(search.toLowerCase()) ||
      f.departureAirport?.code.toLowerCase().includes(search.toLowerCase()) ||
      f.arrivalAirport?.code.toLowerCase().includes(search.toLowerCase()) ||
      f.airline?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusTab || f.status === statusTab;
    return matchSearch && matchStatus;
  });

  const delayedCount   = flights.filter((f) => f.status === 'delayed').length;
  const boardingCount  = flights.filter((f) => f.status === 'boarding').length;
  const cancelledCount = flights.filter((f) => f.status === 'cancelled').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Live Flight Status</h1>
          <p className="text-dark-400 text-sm mt-1">
            {lastUpdate
              ? `Last updated ${lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'Loading…'}
            {' · '}Auto-refreshes every 30 seconds
          </p>
        </div>
        <button
          onClick={fetchLive}
          disabled={loading}
          className="btn-secondary btn-sm self-start sm:self-auto"
        >
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Alert banners */}
      {(delayedCount > 0 || cancelledCount > 0) && (
        <div className="flex flex-wrap gap-3 mb-6">
          {delayedCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <FiAlertTriangle size={14} className="text-orange-400" />
              <span className="text-orange-400 text-sm font-medium">
                {delayedCount} flight{delayedCount > 1 ? 's' : ''} delayed
              </span>
            </div>
          )}
          {boardingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <FiClock size={14} className="text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">
                {boardingCount} flight{boardingCount > 1 ? 's' : ''} boarding now
              </span>
            </div>
          )}
          {cancelledCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <FiAlertTriangle size={14} className="text-red-400" />
              <span className="text-red-400 text-sm font-medium">
                {cancelledCount} flight{cancelledCount > 1 ? 's' : ''} cancelled
              </span>
            </div>
          )}
        </div>
      )}

      {/* Search + status tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-8"
            placeholder="Search flight, airport, airline…"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusTab(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusTab === value
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-700 text-dark-400 hover:text-dark-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading && flights.length === 0 ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No flights found"
          description="Try a different search or status filter"
          icon={FiSend}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Flight</th>
                <th>Airline</th>
                <th>From</th>
                <th>To</th>
                <th>Departure</th>
                <th>Arrival</th>
                <th>Gate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr
                  key={f._id}
                  className={
                    f.status === 'delayed'   ? 'border-l-2 border-l-orange-500' :
                    f.status === 'cancelled' ? 'border-l-2 border-l-red-500' :
                    f.status === 'boarding'  ? 'border-l-2 border-l-amber-500' : ''
                  }
                >
                  {/* Flight number */}
                  <td>
                    <span className="font-mono font-semibold text-dark-100">{f.flightNumber}</span>
                  </td>

                  {/* Airline */}
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-dark-700 flex items-center justify-center text-primary-400 text-2xs font-bold flex-shrink-0">
                        {f.airline?.code}
                      </div>
                      <span className="text-dark-300 text-sm hidden sm:block">{f.airline?.name}</span>
                    </div>
                  </td>

                  {/* From */}
                  <td>
                    <p className="font-semibold text-dark-100">{f.departureAirport?.code}</p>
                    <p className="text-2xs text-dark-500">{f.departureAirport?.city}</p>
                  </td>

                  {/* To */}
                  <td>
                    <p className="font-semibold text-dark-100">{f.arrivalAirport?.code}</p>
                    <p className="text-2xs text-dark-500">{f.arrivalAirport?.city}</p>
                  </td>

                  {/* Departure time */}
                  <td>
                    <p className="text-dark-200 font-medium">{formatTime(f.scheduledDeparture)}</p>
                    {f.status === 'delayed' && f.estimatedDeparture && (
                      <p className="text-2xs text-orange-400">
                        Est. {formatTime(f.estimatedDeparture)} (+{f.delayMinutes}m)
                      </p>
                    )}
                    {f.actualDeparture && (
                      <p className="text-2xs text-emerald-400">
                        Actual {formatTime(f.actualDeparture)}
                      </p>
                    )}
                  </td>

                  {/* Arrival time */}
                  <td>
                    <p className="text-dark-200 font-medium">{formatTime(f.scheduledArrival)}</p>
                    {f.actualArrival && (
                      <p className="text-2xs text-emerald-400">
                        Actual {formatTime(f.actualArrival)}
                      </p>
                    )}
                  </td>

                  {/* Gate */}
                  <td>
                    {f.departureGate?.gateNumber ? (
                      <span className="badge bg-dark-700 text-dark-300 border border-dark-600">
                        {f.departureTerminal?.code && `${f.departureTerminal.code} · `}
                        Gate {f.departureGate.gateNumber}
                      </span>
                    ) : (
                      <span className="text-dark-600 text-sm">TBD</span>
                    )}
                  </td>

                  {/* Status */}
                  <td>
                    <StatusBadge status={f.status} />
                    {f.status === 'delayed' && f.delayReason && (
                      <p className="text-2xs text-dark-500 mt-0.5 max-w-[120px] truncate" title={f.delayReason}>
                        {f.delayReason}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-dark-600 text-xs mt-6">
        Showing {filtered.length} of {flights.length} flights · Times shown in local timezone
      </p>
    </div>
  );
}
