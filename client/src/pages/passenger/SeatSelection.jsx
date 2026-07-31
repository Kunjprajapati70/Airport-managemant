/**
 * SeatSelection.jsx
 * Visual seat map for selecting seats before booking.
 * Grouped by class with color coding and legend.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FlightSummaryCard from '../../components/booking/FlightSummaryCard';
import { FiArrowRight, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';

// ── Seat color config per class ───────────────────────────────────────────────
const CLASS_CONFIG = {
  first: {
    available: 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/35 hover:border-amber-400',
    booked:    'bg-dark-700/60 border-dark-600 text-dark-600 cursor-not-allowed opacity-50',
    selected:  'bg-amber-500 border-amber-400 text-white shadow-[0_0_8px_rgba(245,158,11,0.4)]',
    label:     'First Class',
    color:     'text-amber-400',
  },
  business: {
    available: 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/35 hover:border-purple-400',
    booked:    'bg-dark-700/60 border-dark-600 text-dark-600 cursor-not-allowed opacity-50',
    selected:  'bg-purple-500 border-purple-400 text-white shadow-[0_0_8px_rgba(168,85,247,0.4)]',
    label:     'Business',
    color:     'text-purple-400',
  },
  economy: {
    available: 'bg-blue-500/15 border-blue-500/40 text-blue-300 hover:bg-blue-500/35 hover:border-blue-400',
    booked:    'bg-dark-700/60 border-dark-600 text-dark-600 cursor-not-allowed opacity-50',
    selected:  'bg-blue-500 border-blue-400 text-white shadow-[0_0_8px_rgba(59,130,246,0.4)]',
    label:     'Economy',
    color:     'text-blue-400',
  },
};

export default function SeatSelection() {
  const { flightId }    = useParams();
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();

  const seatClass      = searchParams.get('class')      || 'economy';
  const passengerCount = parseInt(searchParams.get('passengers') || '1', 10);

  const [flight,   setFlight]   = useState(null);
  const [seats,    setSeats]    = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [viewClass,setViewClass]= useState(seatClass);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: flightData } = await api.get(`/flights/${flightId}`);
        setFlight(flightData.flight);
        const aircraftId = flightData.flight.aircraft?._id;
        if (aircraftId) {
          const { data: seatData } = await api.get(`/aircraft/${aircraftId}/seats`);
          setSeats(seatData.seats || []);
        }
      } catch {
        toast.error('Failed to load seat map');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [flightId]);

  const toggleSeat = (seat) => {
    if (seat.status !== 'available') return;
    if (seat.class !== viewClass) {
      toast.error(`This is a ${seat.class} class seat. Switch to ${seat.class} class to select it.`);
      return;
    }
    setSelected((prev) => {
      if (prev.includes(seat.seatNumber)) {
        return prev.filter((s) => s !== seat.seatNumber);
      }
      if (prev.length >= passengerCount) {
        toast.error(`You can only select ${passengerCount} seat${passengerCount > 1 ? 's' : ''}.`);
        return prev;
      }
      return [...prev, seat.seatNumber];
    });
  };

  const getSeatState = (seat) => {
    if (selected.includes(seat.seatNumber)) return 'selected';
    if (seat.status !== 'available')        return 'booked';
    return 'available';
  };

  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {});

  // Stats per class
  const classStats = ['first', 'business', 'economy'].reduce((acc, cls) => {
    const classSeats = seats.filter((s) => s.class === cls);
    acc[cls] = {
      total:     classSeats.length,
      available: classSeats.filter((s) => s.status === 'available').length,
    };
    return acc;
  }, {});

  const handleContinue = () => {
    if (selected.length !== passengerCount) {
      toast.error(`Please select exactly ${passengerCount} seat${passengerCount > 1 ? 's' : ''}.`);
      return;
    }
    navigate(`/passenger/book/${flightId}?class=${viewClass}&passengers=${passengerCount}&seats=${selected.join(',')}`);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const cfg = CLASS_CONFIG[viewClass] ?? CLASS_CONFIG.economy;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-100">Select Seats</h1>
        <p className="text-dark-400 text-sm mt-1">
          Choose {passengerCount} seat{passengerCount > 1 ? 's' : ''} · {seatClass} class
        </p>
      </div>

      {flight && <FlightSummaryCard flight={flight} seatClass={viewClass} passengerCount={passengerCount} />}

      {/* Class tabs */}
      <div className="flex gap-2 flex-wrap">
        {['economy', 'business', 'first'].map((cls) => {
          const c = CLASS_CONFIG[cls];
          const stats = classStats[cls];
          return (
            <button
              key={cls}
              onClick={() => { setViewClass(cls); setSelected([]); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                viewClass === cls
                  ? 'bg-primary-600 border-primary-500 text-white'
                  : 'bg-dark-700/50 border-dark-600 text-dark-400 hover:text-dark-200'
              }`}
            >
              <span>{c.label}</span>
              <span className="ml-2 text-2xs opacity-70">{stats.available} avail.</span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs">
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded border ${cfg.available.split(' ').slice(0, 2).join(' ')}`} />
          <span className="text-dark-400">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded border ${cfg.selected.split(' ').slice(0, 2).join(' ')}`} />
          <span className="text-dark-400">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded border bg-dark-700/60 border-dark-600 opacity-50" />
          <span className="text-dark-400">Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded border bg-emerald-500/20 border-emerald-500/40" />
          <span className="text-dark-400">Exit row</span>
        </div>
      </div>

      {/* Seat map */}
      <div className="card overflow-x-auto">
        <div className="min-w-[340px] max-w-full">
          {/* Column headers */}
          <div className="flex justify-center items-center gap-1 mb-4">
            <div className="w-8 text-center text-2xs text-dark-600">Row</div>
            {['A', 'B', 'C'].map((c) => (
              <div key={c} className="w-8 text-center text-xs font-semibold text-dark-500">{c}</div>
            ))}
            <div className="w-5" />
            {['D', 'E', 'F'].map((c) => (
              <div key={c} className="w-8 text-center text-xs font-semibold text-dark-500">{c}</div>
            ))}
          </div>

          {/* Rows */}
          <div className="space-y-1">
            {Object.entries(seatsByRow)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([row, rowSeats]) => {
                const rowClass = rowSeats[0]?.class;
                const rowCfg   = CLASS_CONFIG[rowClass] ?? CLASS_CONFIG.economy;
                const isExit   = rowSeats.some((s) => s.isExitRow);
                const left     = rowSeats.filter((s) => ['A', 'B', 'C'].includes(s.column)).sort((a, b) => a.column.localeCompare(b.column));
                const right    = rowSeats.filter((s) => ['D', 'E', 'F'].includes(s.column)).sort((a, b) => a.column.localeCompare(b.column));

                return (
                  <React.Fragment key={row}>
                    {isExit && (
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex-1 h-px bg-emerald-500/20" />
                        <span className="text-2xs text-emerald-500 flex items-center gap-1">
                          <FiInfo size={10} /> Exit Row
                        </span>
                        <div className="flex-1 h-px bg-emerald-500/20" />
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-8 text-center text-2xs text-dark-600">{row}</div>
                      {left.map((seat) => {
                        const state = getSeatState(seat);
                        const isCurrentClass = seat.class === viewClass;
                        return (
                          <button
                            key={seat.seatNumber}
                            onClick={() => toggleSeat(seat)}
                            disabled={seat.status !== 'available'}
                            className={`w-8 h-8 rounded text-2xs font-semibold border transition-all duration-100 ${
                              isCurrentClass ? rowCfg[state] : 'bg-dark-800 border-dark-700 text-dark-700 cursor-default'
                            } ${seat.extraLegroom ? 'ring-1 ring-emerald-500/30' : ''}`}
                            title={`${seat.seatNumber} · ${seat.class}${seat.isWindow ? ' · Window' : seat.isAisle ? ' · Aisle' : ' · Middle'}${seat.extraLegroom ? ' · Extra legroom' : ''}`}
                          >
                            {seat.column}
                          </button>
                        );
                      })}
                      <div className="w-5 flex items-center justify-center">
                        <div className="w-px h-6 bg-dark-700" />
                      </div>
                      {right.map((seat) => {
                        const state = getSeatState(seat);
                        const isCurrentClass = seat.class === viewClass;
                        return (
                          <button
                            key={seat.seatNumber}
                            onClick={() => toggleSeat(seat)}
                            disabled={seat.status !== 'available'}
                            className={`w-8 h-8 rounded text-2xs font-semibold border transition-all duration-100 ${
                              isCurrentClass ? rowCfg[state] : 'bg-dark-800 border-dark-700 text-dark-700 cursor-default'
                            } ${seat.extraLegroom ? 'ring-1 ring-emerald-500/30' : ''}`}
                            title={`${seat.seatNumber} · ${seat.class}${seat.isWindow ? ' · Window' : seat.isAisle ? ' · Aisle' : ' · Middle'}${seat.extraLegroom ? ' · Extra legroom' : ''}`}
                          >
                            {seat.column}
                          </button>
                        );
                      })}
                    </div>
                  </React.Fragment>
                );
              })}
          </div>
        </div>
      </div>

      {/* Selection bar */}
      <div className={`card transition-all ${selected.length > 0 ? 'border-primary-700/40 bg-primary-900/10' : 'border-dark-700'}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            {selected.length > 0 ? (
              <>
                <p className="text-dark-100 font-medium">
                  Selected: <span className="font-mono text-primary-400">{selected.join(', ')}</span>
                </p>
                <p className="text-dark-400 text-sm">
                  {selected.length} of {passengerCount} seat{passengerCount > 1 ? 's' : ''} selected
                </p>
              </>
            ) : (
              <p className="text-dark-400 text-sm">
                Select {passengerCount} seat{passengerCount > 1 ? 's' : ''} to continue
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {selected.length > 0 && (
              <button onClick={() => setSelected([])} className="btn-secondary btn-sm">
                Clear
              </button>
            )}
            <button
              onClick={handleContinue}
              disabled={selected.length !== passengerCount}
              className="btn-primary"
            >
              Continue <FiArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
