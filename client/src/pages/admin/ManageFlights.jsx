/**
 * ManageFlights.jsx
 * Admin page for full flight lifecycle management.
 *
 * Features:
 *  - Paginated, filterable, searchable flight table
 *  - Create / Edit flight with live conflict detection
 *  - Status update with delay/cancellation forms
 *  - Gate reassignment
 *  - Flight detail slide-over panel
 *  - Soft delete with booking guard
 *  - Real-time status updates via Socket.IO
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import FlightForm from '../../components/flights/FlightForm';
import StatusUpdateForm from '../../components/flights/StatusUpdateForm';
import FlightFilters from '../../components/flights/FlightFilters';
import FlightDetailPanel from '../../components/flights/FlightDetailPanel';
import useResources from '../../hooks/useResources';
import { formatDateTime, formatTime, formatCurrency, getFlightDuration } from '../../utils/helpers';
import {
  FiPlus, FiEdit2, FiTrash2, FiActivity, FiEye,
  FiSend, FiRefreshCw, FiAlertTriangle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ManageFlights() {
  const { user } = useSelector((s) => s.auth);
  const resources = useResources();

  // ── Table state ────────────────────────────────────────────────────────────
  const [flights,  setFlights]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [filters,  setFilters]  = useState({});

  // ── Modal state ────────────────────────────────────────────────────────────
  const [formModal,    setFormModal]    = useState(false);
  const [statusModal,  setStatusModal]  = useState(false);
  const [detailPanel,  setDetailPanel]  = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  // ── Selected flight ────────────────────────────────────────────────────────
  const [selected,  setSelected]  = useState(null); // flight being edited/viewed
  const [submitting,setSubmitting] = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  // ── Fetch flights ──────────────────────────────────────────────────────────
  const fetchFlights = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, ...filters };
      // Map filter keys to API params
      if (filters.search)           params.search           = filters.search;
      if (filters.status)           params.status           = filters.status;
      if (filters.departureAirport) params.departureAirport = filters.departureAirport;
      if (filters.arrivalAirport)   params.arrivalAirport   = filters.arrivalAirport;
      if (filters.airline)          params.airline          = filters.airline;
      if (filters.date)             params.date             = filters.date;

      const { data } = await api.get('/flights', { params });
      setFlights(data.flights);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load flights');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchFlights(); }, [fetchFlights]);

  // ── Real-time flight updates via Socket.IO ─────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = ({ flight: updated }) => {
      setFlights((prev) =>
        prev.map((f) => (f._id === updated._id ? { ...f, ...updated } : f))
      );
    };
    socket.on('flightUpdate', handler);
    return () => socket.off('flightUpdate', handler);
  }, []);

  // ── Filter change ──────────────────────────────────────────────────────────
  const handleFilterChange = (newFilters) => {
    setPage(1);
    setFilters(newFilters);
  };

  // ── Create / Edit ──────────────────────────────────────────────────────────
  const openCreate = () => { setSelected(null); setFormModal(true); };
  const openEdit   = (f) => { setSelected(f);   setFormModal(true); };

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (selected) {
        await api.put(`/flights/${selected._id}`, payload);
        toast.success(`Flight ${payload.flightNumber} updated`);
      } else {
        await api.post('/flights', payload);
        toast.success(`Flight ${payload.flightNumber} created`);
      }
      setFormModal(false);
      fetchFlights();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status update ──────────────────────────────────────────────────────────
  const openStatus = (f) => { setSelected(f); setStatusModal(true); };

  const handleStatusSubmit = async (payload) => {
    setSubmitting(true);
    try {
      await api.patch(`/flights/${selected._id}/status`, payload);
      toast.success(`Status updated to "${payload.status}"`);
      setStatusModal(false);
      fetchFlights();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const openDelete = (f) => { setSelected(f); setDeleteDialog(true); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/flights/${selected._id}`);
      toast.success(`Flight ${selected.flightNumber} deleted`);
      setDeleteDialog(false);
      fetchFlights();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  // ── Detail panel ───────────────────────────────────────────────────────────
  const openDetail = (f) => { setSelected(f); setDetailPanel(true); };

  // ── Status color helper ────────────────────────────────────────────────────
  const getRowAccent = (status) => {
    const map = {
      delayed:   'border-l-2 border-l-orange-500',
      cancelled: 'border-l-2 border-l-red-500',
      boarding:  'border-l-2 border-l-amber-500',
    };
    return map[status] || '';
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <PageHeader
        title="Manage Flights"
        subtitle={`${total.toLocaleString()} flight${total !== 1 ? 's' : ''} total`}
        actions={
          <div className="flex gap-2">
            <button onClick={fetchFlights} className="btn-secondary btn-sm" title="Refresh">
              <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={openCreate} className="btn-primary btn-sm">
              <FiPlus size={15} /> Add Flight
            </button>
          </div>
        }
      />

      {/* Filters */}
      <FlightFilters
        airports={resources.airports}
        airlines={resources.airlines}
        onChange={handleFilterChange}
      />

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : flights.length === 0 ? (
        <EmptyState
          title="No flights found"
          description="Try adjusting your filters or create a new flight"
          icon={FiSend}
          action={<button onClick={openCreate} className="btn-primary btn-sm">Add Flight</button>}
        />
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Flight</th>
                  <th>Route</th>
                  <th>Departure</th>
                  <th>Arrival</th>
                  <th>Aircraft</th>
                  <th>Seats</th>
                  <th>Pricing</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {flights.map((f) => (
                  <tr key={f._id} className={getRowAccent(f.status)}>
                    {/* Flight number */}
                    <td>
                      <button
                        onClick={() => openDetail(f)}
                        className="text-left hover:text-primary-400 transition-colors"
                      >
                        <p className="font-mono font-semibold text-dark-100">{f.flightNumber}</p>
                        <p className="text-2xs text-dark-500 mt-0.5">{f.airline?.code}</p>
                      </button>
                    </td>

                    {/* Route */}
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-dark-200">{f.departureAirport?.code}</span>
                        <FiSend size={10} className="text-dark-600" />
                        <span className="font-medium text-dark-200">{f.arrivalAirport?.code}</span>
                      </div>
                      <p className="text-2xs text-dark-500 mt-0.5">
                        {f.departureAirport?.city} → {f.arrivalAirport?.city}
                      </p>
                    </td>

                    {/* Departure */}
                    <td>
                      <p className="text-dark-200 text-sm">{formatTime(f.scheduledDeparture)}</p>
                      <p className="text-2xs text-dark-500">{formatDateTime(f.scheduledDeparture).split('·')[0].trim()}</p>
                      {f.status === 'delayed' && f.estimatedDeparture && (
                        <p className="text-2xs text-orange-400">Est. {formatTime(f.estimatedDeparture)}</p>
                      )}
                    </td>

                    {/* Arrival */}
                    <td>
                      <p className="text-dark-200 text-sm">{formatTime(f.scheduledArrival)}</p>
                      <p className="text-2xs text-dark-500">{getFlightDuration(f.scheduledDeparture, f.scheduledArrival)}</p>
                    </td>

                    {/* Aircraft */}
                    <td>
                      <p className="text-dark-200 text-sm font-mono">{f.aircraft?.registrationNumber}</p>
                      <p className="text-2xs text-dark-500">{f.aircraft?.model}</p>
                    </td>

                    {/* Seats */}
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden w-16">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${f.totalSeats ? (f.bookedSeats / f.totalSeats) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-2xs text-dark-400 whitespace-nowrap">
                          {f.bookedSeats}/{f.totalSeats}
                        </span>
                      </div>
                      <p className="text-2xs text-dark-600 mt-0.5">{f.availableSeats} avail.</p>
                    </td>

                    {/* Pricing */}
                    <td>
                      <p className="text-dark-200 text-xs">{formatCurrency(f.economyPrice)}</p>
                      <p className="text-2xs text-dark-500">Economy</p>
                    </td>

                    {/* Status */}
                    <td>
                      <StatusBadge status={f.status} />
                      {f.status === 'delayed' && (
                        <p className="text-2xs text-orange-400 mt-0.5">+{f.delayMinutes}min</p>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => openDetail(f)}
                          className="btn-icon btn-ghost text-dark-500 hover:text-dark-200"
                          title="View details"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          onClick={() => openStatus(f)}
                          className="btn-icon btn-ghost text-amber-500 hover:text-amber-300"
                          title="Update status"
                        >
                          <FiActivity size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(f)}
                          className="btn-icon btn-ghost text-primary-500 hover:text-primary-300"
                          title="Edit flight"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => openDelete(f)}
                          className="btn-icon btn-ghost text-red-500 hover:text-red-300"
                          title="Delete flight"
                          disabled={['confirmed', 'boarding', 'departed', 'in_flight'].includes(f.status)}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
        </>
      )}

      {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={formModal}
        onClose={() => setFormModal(false)}
        title={selected ? `Edit Flight — ${selected.flightNumber}` : 'Create New Flight'}
        size="xl"
      >
        {!resources.loading && (
          <FlightForm
            initialData={selected}
            resources={resources}
            onSubmit={handleFormSubmit}
            onCancel={() => setFormModal(false)}
            loading={submitting}
          />
        )}
        {resources.loading && (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        )}
      </Modal>

      {/* ── Status Update Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={statusModal}
        onClose={() => setStatusModal(false)}
        title={`Update Status — ${selected?.flightNumber}`}
        size="md"
      >
        {selected && (
          <StatusUpdateForm
            flight={selected}
            onSubmit={handleStatusSubmit}
            onCancel={() => setStatusModal(false)}
            loading={submitting}
          />
        )}
      </Modal>

      {/* ── Flight Detail Panel ──────────────────────────────────────────── */}
      <Modal
        isOpen={detailPanel}
        onClose={() => setDetailPanel(false)}
        title="Flight Details"
        size="lg"
      >
        <FlightDetailPanel flight={selected} />
      </Modal>

      {/* ── Delete Confirm ───────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete Flight ${selected?.flightNumber}?`}
        message="This will permanently remove the flight. Flights with active bookings cannot be deleted — cancel the flight instead."
        confirmLabel="Delete Flight"
        danger
      />
    </div>
  );
}
