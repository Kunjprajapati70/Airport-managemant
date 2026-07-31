/**
 * BoardingConsole.jsx
 * Gate boarding staff console — scan QR codes, verify boarding passes,
 * track boarding progress, close boarding and mark no-shows.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import { formatTime, formatDateTime } from '../../utils/helpers';
import {
  FiSearch, FiCheckSquare, FiXSquare, FiAlertTriangle,
  FiRefreshCw, FiSend, FiUsers, FiCheckCircle, FiXCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function BoardingConsole() {
  const { user } = useSelector((s) => s.auth);

  // Flight
  const [flights,        setFlights]        = useState([]);
  const [selectedFlight, setSelectedFlight] = useState('');
  const [flightInfo,     setFlightInfo]     = useState(null);
  const [boardingList,   setBoardingList]   = useState([]);
  const [summary,        setSummary]        = useState({});
  const [listLoading,    setListLoading]    = useState(false);

  // Scanner
  const [scanInput,   setScanInput]   = useState('');
  const [scanning,    setScanning]    = useState(false);
  const [lastResult,  setLastResult]  = useState(null); // { success, message, pass }
  const scanRef = useRef(null);

  // Closing
  const [closing, setClosing] = useState(false);

  // Load boarding flights
  useEffect(() => {
    api.get('/flights?status=boarding,scheduled&limit=30')
      .then((r) => setFlights(r.data.flights || []));
  }, []);

  // Real-time boarding updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = ({ boardingClosed, noShowCount }) => {
      if (boardingClosed) {
        toast.success(`Boarding closed. ${noShowCount} no-show(s).`);
        if (selectedFlight) loadBoardingList(selectedFlight);
      }
    };
    socket.on('flightUpdate', handler);
    return () => socket.off('flightUpdate', handler);
  }, [selectedFlight]);

  const loadBoardingList = useCallback(async (flightId) => {
    if (!flightId) return;
    setListLoading(true);
    try {
      const [listRes, flightRes] = await Promise.all([
        api.get(`/boarding/flight/${flightId}`),
        api.get(`/flights/${flightId}`),
      ]);
      setBoardingList(listRes.data.boardingPasses || []);
      setSummary(listRes.data.summary || {});
      setFlightInfo(flightRes.data.flight);
    } catch { toast.error('Failed to load boarding list'); }
    finally { setListLoading(false); }
  }, []);

  const handleFlightChange = (flightId) => {
    setSelectedFlight(flightId);
    setLastResult(null);
    if (flightId) loadBoardingList(flightId);
    else { setBoardingList([]); setSummary({}); setFlightInfo(null); }
  };

  // ── Scan / verify boarding pass ────────────────────────────────────────────
  const handleScan = async (e) => {
    e?.preventDefault();
    const input = scanInput.trim();
    if (!input) return;

    setScanning(true);
    setLastResult(null);

    try {
      let payload = {};

      // Try to parse as JSON (QR code content)
      try {
        const parsed = JSON.parse(input);
        payload = { qrData: parsed };
      } catch {
        // Not JSON — treat as boarding pass ID (MongoDB ObjectId)
        if (/^[a-f\d]{24}$/i.test(input)) {
          payload = { boardingPassId: input };
        } else {
          // Try as PNR — find boarding pass by PNR
          payload = { qrData: { pnr: input } };
        }
      }

      const { data } = await api.post('/boarding/scan', payload);

      setLastResult({ success: true, pass: data.boardingPass, message: data.message });
      toast.success(`✅ ${data.boardingPass.passengerName} — Boarded!`);
      setScanInput('');
      scanRef.current?.focus();

      if (selectedFlight) loadBoardingList(selectedFlight);

    } catch (err) {
      const msg = err.response?.data?.message || 'Scan failed';
      setLastResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setScanning(false);
    }
  };

  // ── Close boarding ─────────────────────────────────────────────────────────
  const handleCloseBoarding = async () => {
    if (!selectedFlight) return;
    if (!window.confirm(`Close boarding for ${flightInfo?.flightNumber}? All checked-in passengers not yet boarded will be marked as no-show.`)) return;

    setClosing(true);
    try {
      const { data } = await api.post(`/boarding/flight/${selectedFlight}/close`);
      toast.success(`Boarding closed. ${data.noShowCount} no-show(s) recorded.`);
      loadBoardingList(selectedFlight);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close boarding');
    } finally { setClosing(false); }
  };

  // ── Boarding progress ──────────────────────────────────────────────────────
  const pct = summary.total > 0 ? Math.round((summary.boarded / summary.total) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Boarding Console"
        subtitle="Scan boarding passes and manage gate boarding"
        actions={
          <div className="flex gap-2">
            {selectedFlight && (
              <>
                <button
                  onClick={() => loadBoardingList(selectedFlight)}
                  className="btn-secondary btn-sm"
                >
                  <FiRefreshCw size={14} className={listLoading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={handleCloseBoarding}
                  disabled={closing}
                  className="btn-danger btn-sm"
                >
                  {closing ? <LoadingSpinner size="sm" /> : <FiXSquare size={14} />}
                  Close Boarding
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Left panel ──────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* QR Scanner */}
          <div className="card">
            <h3 className="font-semibold text-dark-100 mb-3">Scan Boarding Pass</h3>
            <form onSubmit={handleScan} className="space-y-3">
              <input
                ref={scanRef}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                className="input font-mono text-sm"
                placeholder="Scan QR code or enter boarding pass ID…"
                autoFocus
                autoComplete="off"
              />
              <button type="submit" disabled={scanning || !scanInput.trim()} className="btn-primary w-full justify-center">
                {scanning
                  ? <><LoadingSpinner size="sm" /> Verifying…</>
                  : <><FiSearch size={14} /> Scan / Verify</>}
              </button>
            </form>

            {/* Scan result */}
            {lastResult && (
              <div className={`mt-3 p-3 rounded-xl border animate-fade-in ${
                lastResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {lastResult.success
                    ? <FiCheckCircle size={15} className="text-emerald-400" />
                    : <FiXCircle     size={15} className="text-red-400" />}
                  <p className={`text-sm font-semibold ${lastResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {lastResult.success ? 'Boarded' : 'Rejected'}
                  </p>
                </div>
                {lastResult.pass && (
                  <>
                    <p className="text-dark-200 text-sm font-medium">{lastResult.pass.passengerName}</p>
                    <p className="text-dark-400 text-xs">
                      Seat {lastResult.pass.seatNumber}
                      {lastResult.pass.gate && ` · Gate ${lastResult.pass.gate}`}
                      {lastResult.pass.sequenceNumber && ` · #${String(lastResult.pass.sequenceNumber).padStart(3, '0')}`}
                    </p>
                  </>
                )}
                {!lastResult.success && (
                  <p className="text-red-400/80 text-xs mt-0.5">{lastResult.message}</p>
                )}
              </div>
            )}
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

            {/* Flight info */}
            {flightInfo && (
              <div className="mt-3 space-y-1 text-xs text-dark-400">
                <p>Departure: <span className="text-dark-200">{formatDateTime(flightInfo.scheduledDeparture)}</span></p>
                <p>Gate: <span className="text-dark-200">{flightInfo.departureGate?.gateNumber || 'TBD'}</span></p>
                <p>Boarding closes: <span className="text-dark-200">{formatTime(flightInfo.boardingCloseTime)}</span></p>
                <p>Status: <StatusBadge status={flightInfo.status} /></p>
              </div>
            )}
          </div>

          {/* Boarding progress */}
          {selectedFlight && summary.total > 0 && (
            <div className="card">
              <h3 className="font-semibold text-dark-100 mb-3">Boarding Progress</h3>
              <div className="space-y-2 mb-3">
                {[
                  ['Total Passes',  summary.total,      'text-dark-200'],
                  ['Boarded',       summary.boarded,    'text-emerald-400'],
                  ['Pending',       summary.notBoarded, 'text-amber-400'],
                  ['Invalidated',   summary.invalid,    'text-red-400'],
                ].map(([label, value, color]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-dark-400">{label}</span>
                    <span className={`font-bold ${color}`}>{value ?? 0}</span>
                  </div>
                ))}
              </div>
              {/* Progress bar */}
              <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-dark-400 mt-1.5 text-center font-semibold">
                {pct}% boarded
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Boarding list ─────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          {listLoading ? (
            <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
          ) : boardingList.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Passenger</th>
                    <th>PNR</th>
                    <th>Seat</th>
                    <th>Class</th>
                    <th>Gate</th>
                    <th>Status</th>
                    <th>Boarded At</th>
                  </tr>
                </thead>
                <tbody>
                  {boardingList.map((bp) => (
                    <tr key={bp._id} className={bp.isBoarded ? 'opacity-60' : ''}>
                      <td className="font-mono text-dark-500 text-xs">
                        {bp.sequenceNumber ? String(bp.sequenceNumber).padStart(3, '0') : '—'}
                      </td>
                      <td>
                        <p className="font-medium text-dark-100 text-sm">{bp.passengerName}</p>
                      </td>
                      <td className="font-mono text-primary-400 text-sm">{bp.pnr}</td>
                      <td className="font-mono font-semibold text-dark-200">{bp.seatNumber}</td>
                      <td className="text-dark-300 capitalize text-sm">{bp.seatClass}</td>
                      <td className="text-dark-300 text-sm">{bp.gate || '—'}</td>
                      <td>
                        <span className={`badge text-2xs ${
                          bp.isBoarded
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : bp.isValid
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {bp.isBoarded ? 'Boarded' : bp.isValid ? 'Pending' : 'Invalid'}
                        </span>
                      </td>
                      <td className="text-dark-500 text-xs">
                        {bp.boardedAt ? formatTime(bp.boardedAt) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={selectedFlight ? 'No boarding passes found' : 'Select a flight'}
              description={selectedFlight
                ? 'No passengers have checked in yet'
                : 'Choose a flight to view the boarding list'}
              icon={FiSend}
            />
          )}
        </div>
      </div>
    </div>
  );
}
