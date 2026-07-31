/**
 * CheckinConsole.jsx
 * Staff check-in desk — search by PNR, process check-ins, view flight manifest.
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import BoardingPassCard from '../../components/checkin/BoardingPassCard';
import { formatDateTime, formatCurrency } from '../../utils/helpers';
import {
  FiSearch, FiCheckSquare, FiPlus, FiTrash2,
  FiRefreshCw, FiUsers, FiAlertTriangle, FiDownload,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const BAGGAGE_ALLOWANCE = { economy: 23, business: 32, first: 40 };
const EXCESS_RATE = 15;

export default function CheckinConsole() {
  // Flight selector
  const [flights,        setFlights]        = useState([]);
  const [selectedFlight, setSelectedFlight] = useState('');
  const [manifest,       setManifest]       = useState([]);
  const [summary,        setSummary]        = useState({});
  const [manifestLoading,setManifestLoading]= useState(false);

  // PNR search
  const [pnrSearch,  setPnrSearch]  = useState('');
  const [booking,    setBooking]    = useState(null);
  const [searching,  setSearching]  = useState(false);

  // Check-in modal
  const [checkinModal,  setCheckinModal]  = useState(false);
  const [passengerIdx,  setPassengerIdx]  = useState(0);
  const [baggage,       setBaggage]       = useState([{ weight: 23, type: 'checked', color: '' }]);
  const [processing,    setProcessing]    = useState(false);
  const [boardingPass,  setBoardingPass]  = useState(null);

  // Load flights
  useEffect(() => {
    api.get('/flights?status=scheduled,boarding&limit=30')
      .then((r) => setFlights(r.data.flights || []));
  }, []);

  // Load flight manifest
  const loadManifest = useCallback(async (flightId) => {
    if (!flightId) return;
    setManifestLoading(true);
    try {
      const { data } = await api.get(`/checkin/flight/${flightId}`);
      setManifest(data.bookings || []);
      setSummary(data.summary || {});
    } catch { toast.error('Failed to load manifest'); }
    finally { setManifestLoading(false); }
  }, []);

  const handleFlightChange = (flightId) => {
    setSelectedFlight(flightId);
    if (flightId) loadManifest(flightId);
    else { setManifest([]); setSummary({}); }
  };

  // PNR search
  const searchBooking = async (e) => {
    e.preventDefault();
    if (!pnrSearch.trim()) return;
    setSearching(true);
    setBooking(null);
    try {
      const { data } = await api.get('/bookings/all', {
        params: { pnr: pnrSearch.trim().toUpperCase(), limit: 5 },
      });
      const found = data.bookings?.[0];
      if (!found) {
        toast.error('Booking not found');
      } else {
        setBooking(found);
        setBoardingPass(null);
        setPassengerIdx(0);
        setBaggage([{ weight: 23, type: 'checked', color: '' }]);
        setCheckinModal(true);
      }
    } catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  // Baggage helpers
  const addBag    = () => setBaggage((b) => [...b, { weight: 23, type: 'checked', color: '' }]);
  const removeBag = (i) => setBaggage((b) => b.filter((_, idx) => idx !== i));
  const updateBag = (i, field, val) => setBaggage((b) => b.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const selectedPassenger = booking?.passengers?.[passengerIdx];
  const allowedWeight     = BAGGAGE_ALLOWANCE[selectedPassenger?.seatClass ?? 'economy'];
  const totalWeight       = baggage.reduce((s, b) => s + (Number(b.weight) || 0), 0);
  const excessWeight      = Math.max(0, totalWeight - allowedWeight);
  const excessFee         = excessWeight * EXCESS_RATE;

  // Process check-in
  const handleCheckin = async () => {
    if (!booking) return;
    setProcessing(true);
    try {
      const { data } = await api.post(`/checkin/${booking._id}`, {
        passengerIndex: passengerIdx,
        baggageItems:   baggage.filter((b) => Number(b.weight) > 0),
        checkedInBy:    'counter',
      });
      toast.success(`Check-in complete for ${selectedPassenger?.firstName}!`);
      setBoardingPass(data.boardingPass);
      if (selectedFlight) loadManifest(selectedFlight);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally { setProcessing(false); }
  };

  // Summary colors
  const summaryItems = [
    { label: 'Total',          value: summary.total,        color: 'text-dark-200' },
    { label: 'Checked In',     value: summary.checkedIn,    color: 'text-emerald-400' },
    { label: 'Not Checked In', value: summary.notCheckedIn, color: 'text-amber-400' },
    { label: 'Boarded',        value: summary.boarded,      color: 'text-blue-400' },
    { label: 'No Show',        value: summary.noShow,       color: 'text-red-400' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Check-in Console"
        subtitle="Process passenger check-ins and baggage registration"
        actions={
          selectedFlight && (
            <button onClick={() => loadManifest(selectedFlight)} className="btn-secondary btn-sm">
              <FiRefreshCw size={14} className={manifestLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          )
        }
      />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Left panel ──────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* PNR Search */}
          <div className="card">
            <h3 className="font-semibold text-dark-100 mb-3">Search by PNR</h3>
            <form onSubmit={searchBooking} className="flex gap-2">
              <input
                value={pnrSearch}
                onChange={(e) => setPnrSearch(e.target.value.toUpperCase())}
                className="input flex-1 font-mono tracking-widest text-center"
                placeholder="ABC123"
                maxLength={6}
              />
              <button type="submit" disabled={searching} className="btn-primary px-3">
                {searching ? <LoadingSpinner size="sm" /> : <FiSearch size={15} />}
              </button>
            </form>
          </div>

          {/* Flight selector */}
          <div className="card">
            <h3 className="font-semibold text-dark-100 mb-3">Select Flight</h3>
            <select
              value={selectedFlight}
              onChange={(e) => handleFlightChange(e.target.value)}
              className="input"
            >
              <option value="">Choose flight…</option>
              {flights.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.flightNumber} — {f.departureAirport?.code} → {f.arrivalAirport?.code}
                </option>
              ))}
            </select>
          </div>

          {/* Summary */}
          {selectedFlight && summary.total > 0 && (
            <div className="card">
              <h3 className="font-semibold text-dark-100 mb-3">Flight Summary</h3>
              <div className="space-y-2">
                {summaryItems.map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-dark-400">{label}</span>
                    <span className={`font-bold ${color}`}>{value ?? 0}</span>
                  </div>
                ))}
              </div>
              {/* Progress bar */}
              {summary.total > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${((summary.checkedIn + summary.boarded) / summary.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-2xs text-dark-500 mt-1">
                    {Math.round(((summary.checkedIn + summary.boarded) / summary.total) * 100)}% checked in
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Manifest ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          {manifestLoading ? (
            <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
          ) : manifest.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Passenger</th>
                    <th>PNR</th>
                    <th>Seat</th>
                    <th>Check-in</th>
                    <th>Security</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {manifest.flatMap((b) =>
                    b.passengers.map((p, i) => (
                      <tr key={`${b._id}-${i}`}>
                        <td>
                          <p className="font-medium text-dark-100 text-sm">{p.firstName} {p.lastName}</p>
                          <p className="text-2xs text-dark-400 capitalize">{p.seatClass}</p>
                        </td>
                        <td className="font-mono text-primary-400 text-sm">{b.pnr}</td>
                        <td className="font-mono text-dark-200">{p.seatNumber || '—'}</td>
                        <td><StatusBadge status={p.checkinStatus} /></td>
                        <td>
                          <span className={`badge text-2xs ${
                            p.securityCleared
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {p.securityCleared ? 'Cleared' : 'Pending'}
                          </span>
                        </td>
                        <td>
                          {p.checkinStatus === 'not_checked_in' && (
                            <button
                              onClick={() => {
                                setBooking(b);
                                setPassengerIdx(i);
                                setBoardingPass(null);
                                setBaggage([{ weight: 23, type: 'checked', color: '' }]);
                                setCheckinModal(true);
                              }}
                              className="btn-primary btn-sm"
                            >
                              <FiCheckSquare size={12} /> Check-in
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={selectedFlight ? 'No passengers found' : 'Select a flight'}
              description={selectedFlight ? 'No confirmed bookings for this flight' : 'Choose a flight to view the passenger manifest'}
              icon={FiUsers}
            />
          )}
        </div>
      </div>

      {/* ── Check-in Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={checkinModal}
        onClose={() => { setCheckinModal(false); setBoardingPass(null); }}
        title={`Check-in — ${booking?.pnr}`}
        size="md"
      >
        {booking && !boardingPass && (
          <div className="space-y-4">
            {/* Passenger selector */}
            <div>
              <label className="label">Passenger</label>
              <select
                value={passengerIdx}
                onChange={(e) => setPassengerIdx(Number(e.target.value))}
                className="input"
              >
                {booking.passengers?.map((p, i) => (
                  <option key={i} value={i}>
                    {p.firstName} {p.lastName} — {p.checkinStatus} — Seat {p.seatNumber || 'TBD'}
                  </option>
                ))}
              </select>
            </div>

            {/* Baggage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="label mb-0">Baggage</label>
                  <p className="text-2xs text-dark-500">Allowance: {allowedWeight}kg</p>
                </div>
                <button onClick={addBag} className="btn-secondary btn-sm">
                  <FiPlus size={12} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {baggage.map((b, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="number" min={1} max={50}
                      value={b.weight}
                      onChange={(e) => updateBag(i, 'weight', e.target.value)}
                      className="input w-20 text-sm"
                      placeholder="kg"
                    />
                    <select
                      value={b.type}
                      onChange={(e) => updateBag(i, 'type', e.target.value)}
                      className="input flex-1 text-sm"
                    >
                      {['checked','carry_on','oversized','fragile'].map((t) => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                    <input
                      value={b.color}
                      onChange={(e) => updateBag(i, 'color', e.target.value)}
                      className="input w-24 text-sm"
                      placeholder="Color"
                    />
                    {baggage.length > 1 && (
                      <button onClick={() => removeBag(i)} className="btn-danger btn-sm px-2">
                        <FiTrash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {excessWeight > 0 && (
                <div className="flex items-center gap-2 mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <FiAlertTriangle size={13} className="text-amber-400" />
                  <p className="text-xs text-amber-400">
                    Excess: {excessWeight}kg · Fee: {formatCurrency(excessFee)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCheckin}
                disabled={processing || selectedPassenger?.checkinStatus !== 'not_checked_in'}
                className="btn-primary flex-1 justify-center"
              >
                {processing
                  ? <><LoadingSpinner size="sm" /> Processing…</>
                  : <><FiCheckSquare size={14} /> Complete Check-in</>}
              </button>
              <button onClick={() => setCheckinModal(false)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Boarding pass generated */}
        {boardingPass && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-emerald-400 font-semibold text-sm flex items-center gap-2">
              <FiCheckSquare size={15} /> Check-in Successful
            </p>
            <BoardingPassCard boardingPass={boardingPass} showDownload />
            <button onClick={() => setCheckinModal(false)} className="btn-secondary w-full justify-center">
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
