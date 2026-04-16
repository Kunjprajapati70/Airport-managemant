/**
 * MyBookings.jsx
 * Passenger booking history with cancel and reschedule actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import BookingCard from '../../components/booking/BookingCard';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { FiSend, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { value: '',           label: 'All' },
  { value: 'confirmed',  label: 'Confirmed' },
  { value: 'pending',    label: 'Pending' },
  { value: 'cancelled',  label: 'Cancelled' },
  { value: 'completed',  label: 'Completed' },
];

export default function MyBookings() {
  const [bookings,     setBookings]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(1);
  const [pages,        setPages]        = useState(1);
  const [total,        setTotal]        = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  // Cancel state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling,   setCancelling]   = useState(false);

  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [newFlightId,      setNewFlightId]      = useState('');
  const [availableFlights, setAvailableFlights] = useState([]);
  const [rescheduling,     setRescheduling]     = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 8 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/bookings/my', { params });
      setBookings(data.bookings);
      setPages(data.pages);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // ── Cancel ─────────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data } = await api.post(`/bookings/${cancelTarget._id}/cancel`, {
        reason: cancelReason || undefined,
      });
      toast.success(
        `Booking cancelled. ${data.refundAmount > 0 ? `Refund: ${formatCurrency(data.refundAmount)}` : 'No refund applicable.'}`
      );
      setCancelTarget(null);
      setCancelReason('');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  // ── Reschedule ─────────────────────────────────────────────────────────────
  const openReschedule = async (booking) => {
    setRescheduleTarget(booking);
    setNewFlightId('');
    // Load flights on the same route
    try {
      const { data } = await api.get('/flights/search', {
        params: {
          from:  booking.flight?.departureAirport?._id,
          to:    booking.flight?.arrivalAirport?._id,
          date:  new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
        },
      });
      setAvailableFlights(data.flights.filter((f) => f._id !== booking.flight?._id));
    } catch {
      setAvailableFlights([]);
    }
  };

  const handleReschedule = async () => {
    if (!newFlightId) { toast.error('Please select a new flight'); return; }
    setRescheduling(true);
    try {
      const { data } = await api.post(`/bookings/${rescheduleTarget._id}/reschedule`, {
        newFlightId,
      });
      toast.success(`Rescheduled to flight ${data.booking.flight?.flightNumber}`);
      setRescheduleTarget(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reschedule failed');
    } finally {
      setRescheduling(false);
    }
  };

  // ── Cancellation fee preview ───────────────────────────────────────────────
  const getCancellationFeePreview = (booking) => {
    if (!booking?.flight?.scheduledDeparture) return null;
    const hours = (new Date(booking.flight.scheduledDeparture) - new Date()) / 3600000;
    if (hours < 24) {
      const fee = Math.round(booking.totalAmount * 0.25);
      return { fee, refund: booking.totalAmount - fee, isLate: true };
    }
    return { fee: 0, refund: booking.totalAmount, isLate: false };
  };

  const feePreview = cancelTarget ? getCancellationFeePreview(cancelTarget) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Bookings"
        subtitle={`${total} booking${total !== 1 ? 's' : ''} total`}
        actions={
          <div className="flex gap-2">
            <button onClick={fetchBookings} className="btn-secondary btn-sm">
              <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link to="/flights/search" className="btn-primary btn-sm">
              <FiSend size={14} /> Book Flight
            </Link>
          </div>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setStatusFilter(value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === value
                ? 'bg-primary-600 text-white'
                : 'bg-dark-700 text-dark-400 hover:text-dark-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No bookings found"
          description={statusFilter ? `No ${statusFilter} bookings` : 'Book your first flight to get started'}
          icon={FiSend}
          action={<Link to="/flights/search" className="btn-primary btn-sm">Search Flights</Link>}
        />
      ) : (
        <>
          <div className="space-y-4">
            {bookings.map((b) => (
              <BookingCard
                key={b._id}
                booking={b}
                onCancel={setCancelTarget}
                onReschedule={openReschedule}
              />
            ))}
          </div>
          <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
        </>
      )}

      {/* ── Cancel Modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setCancelReason(''); }}
        title={`Cancel Booking — ${cancelTarget?.pnr}`}
        size="sm"
      >
        <div className="space-y-4">
          {/* Fee preview */}
          {feePreview && (
            <div className={`p-3.5 rounded-xl border ${feePreview.isLate ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
              <div className="flex items-start gap-2">
                <FiAlertTriangle size={15} className={feePreview.isLate ? 'text-amber-400 mt-0.5' : 'text-emerald-400 mt-0.5'} />
                <div>
                  <p className={`text-sm font-medium ${feePreview.isLate ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {feePreview.isLate ? 'Late Cancellation Fee Applies' : 'Full Refund Eligible'}
                  </p>
                  <div className="mt-1.5 space-y-0.5 text-xs text-dark-300">
                    <p>Cancellation fee: <span className="font-medium">{formatCurrency(feePreview.fee)}</span></p>
                    <p>Refund amount: <span className="font-medium text-emerald-400">{formatCurrency(feePreview.refund)}</span></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="label">Reason (optional)</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="input"
              rows={3}
              placeholder="Tell us why you're cancelling…"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="btn-danger flex-1 justify-center"
            >
              {cancelling ? <><LoadingSpinner size="sm" /> Cancelling…</> : 'Confirm Cancellation'}
            </button>
            <button
              onClick={() => { setCancelTarget(null); setCancelReason(''); }}
              className="btn-secondary flex-1 justify-center"
            >
              Keep Booking
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Reschedule Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        title={`Reschedule — ${rescheduleTarget?.pnr}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-400">
            A reschedule fee of $50 per passenger applies. Seat assignments will be reset.
          </div>

          <div>
            <label className="label">Select New Flight</label>
            {availableFlights.length === 0 ? (
              <p className="text-dark-400 text-sm py-4 text-center">
                No alternative flights found on this route. Try searching manually.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableFlights.map((f) => (
                  <button
                    key={f._id}
                    onClick={() => setNewFlightId(f._id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      newFlightId === f._id
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-600 bg-dark-700/50 hover:border-dark-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono font-semibold text-dark-100 text-sm">{f.flightNumber}</p>
                        <p className="text-2xs text-dark-400 mt-0.5">{formatDateTime(f.scheduledDeparture)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary-400">
                          {formatCurrency(f[`${rescheduleTarget?.seatClass}Price`] ?? f.economyPrice)}
                        </p>
                        <p className="text-2xs text-dark-500">{f.availableSeats} seats</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReschedule}
              disabled={rescheduling || !newFlightId}
              className="btn-primary flex-1 justify-center"
            >
              {rescheduling ? <><LoadingSpinner size="sm" /> Rescheduling…</> : 'Confirm Reschedule'}
            </button>
            <button onClick={() => setRescheduleTarget(null)} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
