/**
 * OnlineCheckin.jsx
 * Full passenger online check-in flow with time window enforcement,
 * baggage registration, and boarding pass display.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import BoardingPassCard from '../../components/checkin/BoardingPassCard';
import CheckinWindow from '../../components/checkin/CheckinWindow';
import { formatDateTime, formatCurrency } from '../../utils/helpers';
import {
  FiSearch, FiCheckSquare, FiPlus, FiTrash2,
  FiAlertTriangle, FiPackage, FiUser,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const BAGGAGE_ALLOWANCE = { economy: 23, business: 32, first: 40 };
const EXCESS_RATE = 15;

export default function OnlineCheckin() {
  const [searchParams] = useSearchParams();

  const [pnr,          setPnr]          = useState(searchParams.get('pnr') || '');
  const [booking,      setBooking]      = useState(null);
  const [checkinStatus,setCheckinStatus]= useState(null);
  const [searching,    setSearching]    = useState(false);
  const [selectedIdx,  setSelectedIdx]  = useState(0);
  const [baggage,      setBaggage]      = useState([{ weight: 23, type: 'checked', color: '', description: '' }]);
  const [processing,   setProcessing]   = useState(false);
  const [boardingPasses,setBoardingPasses] = useState([]);
  const [activePass,   setActivePass]   = useState(null);

  // Auto-search if PNR in URL
  useEffect(() => {
    if (searchParams.get('pnr')) {
      handleSearch(null, searchParams.get('pnr'));
    }
  }, []);

  const handleSearch = async (e, overridePnr) => {
    e?.preventDefault();
    const searchPnr = (overridePnr || pnr).trim().toUpperCase();
    if (!searchPnr) return;

    setSearching(true);
    setBooking(null);
    setCheckinStatus(null);
    setBoardingPasses([]);
    setActivePass(null);

    try {
      // Find booking by PNR
      const { data: listData } = await api.get('/bookings/my', { params: { limit: 100 } });
      const found = listData.bookings.find((b) => b.pnr === searchPnr);

      if (!found) {
        toast.error('No booking found with that PNR.');
        return;
      }

      setBooking(found);
      setSelectedIdx(0);

      // Get check-in status
      const { data: statusData } = await api.get(`/checkin/status/${found._id}`);
      setCheckinStatus(statusData.status);

      // Load existing boarding passes
      const { data: passData } = await api.get(`/checkin/booking/${found._id}`);
      setBoardingPasses(passData.boardingPasses || []);

    } catch (err) {
      toast.error(err.response?.data?.message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const addBag    = () => setBaggage((b) => [...b, { weight: 23, type: 'checked', color: '', description: '' }]);
  const removeBag = (i) => setBaggage((b) => b.filter((_, idx) => idx !== i));
  const updateBag = (i, field, val) => setBaggage((b) => b.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const selectedPassenger = booking?.passengers?.[selectedIdx];
  const allowedWeight     = BAGGAGE_ALLOWANCE[selectedPassenger?.seatClass ?? 'economy'];
  const totalWeight       = baggage.reduce((s, b) => s + (Number(b.weight) || 0), 0);
  const excessWeight      = Math.max(0, totalWeight - allowedWeight);
  const excessFee         = excessWeight * EXCESS_RATE;

  const handleCheckin = async () => {
    if (!booking || !selectedPassenger) return;

    setProcessing(true);
    try {
      const { data } = await api.post(`/checkin/${booking._id}`, {
        passengerIndex: selectedIdx,
        baggageItems:   baggage.filter((b) => Number(b.weight) > 0),
        checkedInBy:    'online',
      });

      toast.success(`Check-in complete for ${selectedPassenger.firstName}!`);
      setActivePass(data.boardingPass);

      // Refresh
      const { data: listData } = await api.get('/bookings/my', { params: { limit: 100 } });
      const found = listData.bookings.find((b) => b.pnr === pnr.toUpperCase());
      if (found) setBooking(found);

      const { data: statusData } = await api.get(`/checkin/status/${booking._id}`);
      setCheckinStatus(statusData.status);

      const { data: passData } = await api.get(`/checkin/booking/${booking._id}`);
      setBoardingPasses(passData.boardingPasses || []);

    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed.');
    } finally {
      setProcessing(false);
    }
  };

  const canCheckin = checkinStatus?.checkInOpen && selectedPassenger?.checkinStatus === 'not_checked_in';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Online Check-in"
        subtitle="Check in up to 24 hours before departure"
      />

      {/* PNR Search */}
      <form onSubmit={handleSearch} className="card">
        <label className="label">Enter your PNR / Booking Reference</label>
        <div className="flex gap-3">
          <input
            value={pnr}
            onChange={(e) => setPnr(e.target.value.toUpperCase())}
            className="input flex-1 font-mono tracking-[0.25em] text-center text-xl"
            placeholder="ABC123"
            maxLength={6}
            autoFocus
          />
          <button type="submit" disabled={searching || !pnr.trim()} className="btn-primary px-6">
            {searching ? <LoadingSpinner size="sm" /> : <><FiSearch size={15} /> Search</>}
          </button>
        </div>
        <p className="text-2xs text-dark-500 mt-2">
          Your 6-character PNR is on your booking confirmation email.
        </p>
      </form>

      {/* Booking found */}
      {booking && (
        <div className="space-y-4 animate-fade-in">

          {/* Check-in window status */}
          {checkinStatus && <CheckinWindow status={checkinStatus} />}

          {/* Booking summary */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-2xs text-dark-500 uppercase tracking-wider">Booking</p>
                <p className="text-2xl font-bold font-mono text-primary-400">{booking.pnr}</p>
              </div>
              <StatusBadge status={booking.status} />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <div><span className="text-dark-500">Flight: </span><span className="text-dark-200 font-mono">{booking.flight?.flightNumber}</span></div>
              <div><span className="text-dark-500">Route: </span><span className="text-dark-200">{booking.flight?.departureAirport?.code} → {booking.flight?.arrivalAirport?.code}</span></div>
              <div><span className="text-dark-500">Departure: </span><span className="text-dark-200">{formatDateTime(booking.flight?.scheduledDeparture)}</span></div>
              <div><span className="text-dark-500">Class: </span><span className="text-dark-200 capitalize">{booking.seatClass}</span></div>
            </div>
          </div>

          {/* Passenger selector */}
          <div className="card">
            <h3 className="font-semibold text-dark-100 mb-3 flex items-center gap-2">
              <FiUser size={15} className="text-primary-400" /> Select Passenger
            </h3>
            <div className="space-y-2">
              {booking.passengers?.map((p, i) => {
                const existingPass = boardingPasses.find(
                  (bp) => bp.bookingPassengerId?.toString() === p._id?.toString()
                );
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedIdx(i); setActivePass(null); }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                      selectedIdx === i
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-600 bg-dark-700/40 hover:border-dark-500'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-medium text-dark-100 text-sm">{p.firstName} {p.lastName}</p>
                      <p className="text-2xs text-dark-400 mt-0.5">
                        Seat: <span className="font-mono">{p.seatNumber || 'TBD'}</span>
                        {' · '}<span className="capitalize">{p.seatClass}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {existingPass && (
                        <span className="text-2xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Pass ready
                        </span>
                      )}
                      <StatusBadge status={p.checkinStatus} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Show existing boarding pass */}
          {!activePass && boardingPasses.find(
            (bp) => bp.bookingPassengerId?.toString() === selectedPassenger?._id?.toString()
          ) && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-dark-200">Boarding Pass</p>
              <BoardingPassCard
                boardingPass={boardingPasses.find(
                  (bp) => bp.bookingPassengerId?.toString() === selectedPassenger?._id?.toString()
                )}
              />
            </div>
          )}

          {/* Baggage registration — only for not-checked-in passengers */}
          {canCheckin && !activePass && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-dark-100 flex items-center gap-2">
                    <FiPackage size={15} className="text-primary-400" /> Baggage Registration
                  </h3>
                  <p className="text-2xs text-dark-500 mt-0.5">
                    Free allowance: <strong>{allowedWeight}kg</strong> · Excess: ${EXCESS_RATE}/kg
                  </p>
                </div>
                <button onClick={addBag} className="btn-secondary btn-sm">
                  <FiPlus size={13} /> Add Bag
                </button>
              </div>

              <div className="space-y-3">
                {baggage.map((b, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-end">
                    <div>
                      <label className="label text-2xs">Weight (kg)</label>
                      <input
                        type="number" min={1} max={50}
                        value={b.weight}
                        onChange={(e) => updateBag(i, 'weight', e.target.value)}
                        className="input text-sm"
                      />
                    </div>
                    <div>
                      <label className="label text-2xs">Type</label>
                      <select value={b.type} onChange={(e) => updateBag(i, 'type', e.target.value)} className="input text-sm">
                        {['checked','carry_on','oversized','fragile'].map((t) => (
                          <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label text-2xs">Color</label>
                      <input value={b.color} onChange={(e) => updateBag(i, 'color', e.target.value)} className="input text-sm" placeholder="Black" />
                    </div>
                    <div className="flex items-end">
                      {baggage.length > 1 && (
                        <button onClick={() => removeBag(i)} className="btn-danger btn-sm w-full justify-center">
                          <FiTrash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Excess fee warning */}
              {excessWeight > 0 && (
                <div className="flex items-center gap-2 mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <FiAlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-400">
                    Excess baggage: <strong>{excessWeight}kg</strong> · Fee: <strong>{formatCurrency(excessFee)}</strong>
                    {' '}(payable at the counter)
                  </p>
                </div>
              )}

              <button
                onClick={handleCheckin}
                disabled={processing}
                className="btn-primary w-full justify-center mt-4 py-2.5"
              >
                {processing
                  ? <><LoadingSpinner size="sm" /> Processing…</>
                  : <><FiCheckSquare size={15} /> Complete Check-in for {selectedPassenger?.firstName}</>}
              </button>
            </div>
          )}

          {/* Newly generated boarding pass */}
          {activePass && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                <FiCheckSquare size={15} /> Check-in Successful — Boarding Pass Ready
              </p>
              <BoardingPassCard boardingPass={activePass} />
            </div>
          )}

          {/* Already checked in — no action needed */}
          {!canCheckin && !activePass && selectedPassenger?.checkinStatus === 'checked_in' &&
            !boardingPasses.find((bp) => bp.bookingPassengerId?.toString() === selectedPassenger?._id?.toString()) && (
            <div className="card border-blue-700/30 bg-blue-900/10 text-center py-6">
              <FiCheckSquare size={28} className="text-blue-400 mx-auto mb-2" />
              <p className="font-semibold text-dark-100">Already Checked In</p>
              <p className="text-dark-400 text-sm mt-1">
                {selectedPassenger.firstName} has completed check-in.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
