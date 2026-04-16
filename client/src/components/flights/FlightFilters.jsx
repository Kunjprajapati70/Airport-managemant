/**
 * FlightFilters.jsx
 * Filter bar for the flight management table.
 * Emits onChange with the current filter state.
 */

import React, { useState } from 'react';
import { FiSearch, FiFilter, FiX } from 'react-icons/fi';

const STATUS_OPTIONS = [
  { value: '',          label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'boarding',  label: 'Boarding' },
  { value: 'departed',  label: 'Departed' },
  { value: 'in_flight', label: 'In Flight' },
  { value: 'arrived',   label: 'Arrived' },
  { value: 'delayed',   label: 'Delayed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'diverted',  label: 'Diverted' },
];

export default function FlightFilters({ airports, airlines, onChange }) {
  const [filters, setFilters] = useState({
    search:           '',
    status:           '',
    departureAirport: '',
    arrivalAirport:   '',
    airline:          '',
    date:             '',
  });

  const set = (field) => (e) => {
    const updated = { ...filters, [field]: e.target.value };
    setFilters(updated);
    onChange(updated);
  };

  const clearAll = () => {
    const cleared = { search: '', status: '', departureAirport: '', arrivalAirport: '', airline: '', date: '' };
    setFilters(cleared);
    onChange(cleared);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="card p-4 space-y-3">
      {/* Row 1: search + status + date */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
          <input
            value={filters.search}
            onChange={set('search')}
            className="input pl-8"
            placeholder="Search flight number…"
          />
        </div>

        {/* Status */}
        <select value={filters.status} onChange={set('status')} className="input w-40">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {/* Date */}
        <input
          type="date"
          value={filters.date}
          onChange={set('date')}
          className="input w-40"
          title="Filter by departure date"
        />

        {/* Clear */}
        {hasFilters && (
          <button onClick={clearAll} className="btn-ghost text-dark-400 hover:text-dark-200 gap-1.5">
            <FiX size={14} /> Clear
          </button>
        )}
      </div>

      {/* Row 2: airport + airline filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filters.departureAirport} onChange={set('departureAirport')} className="input flex-1 min-w-[160px]">
          <option value="">All Departure Airports</option>
          {airports.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.city}</option>)}
        </select>

        <select value={filters.arrivalAirport} onChange={set('arrivalAirport')} className="input flex-1 min-w-[160px]">
          <option value="">All Arrival Airports</option>
          {airports.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.city}</option>)}
        </select>

        <select value={filters.airline} onChange={set('airline')} className="input flex-1 min-w-[160px]">
          <option value="">All Airlines</option>
          {airlines.map((a) => <option key={a._id} value={a._id}>{a.name} ({a.code})</option>)}
        </select>
      </div>
    </div>
  );
}
