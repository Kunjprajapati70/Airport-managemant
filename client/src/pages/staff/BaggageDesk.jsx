/**
 * BaggageDesk.jsx
 * Staff baggage management console with:
 * - Stats overview
 * - Searchable/filterable baggage table
 * - Status update with tracking event
 * - Mark excess fee paid
 * - Mark found
 * - Complaint management
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import BaggageTag from '../../components/baggage/BaggageTag';
import TrackingTimeline from '../../components/baggage/TrackingTimeline';
import { formatDateTime, formatCurrency } from '../../utils/helpers';
import {
  FiPackage, FiSearch, FiAlertTriangle, FiCheckCircle,
  FiRefreshCw, FiFileText, FiEye, FiDollarSign,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const BAGGAGE_STATUSES = [
  'registered', 'checked_in', 'security_scanned', 'loaded',
  'in_transit', 'arrived', 'claimed', 'missing', 'lost',
];

const TABS = ['All Baggage', 'Complaints'];

export default function BaggageDesk() {
  const [tab,       setTab]       = useState(0);
  const [baggage,   setBaggage]   = useState([]);
  const [complaints,setComplaints]= useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [pages,     setPages]     = useState(1);
  const [total,     setTotal]     = useState(0);
  const [cPage,     setCPage]     = useState(1);
  const [cPages,    setCPages]    = useState(1);
  const [cTotal,    setCTotal]    = useState(0);

  // Filters
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lostFilter,   setLostFilter]   = useState('');
  const [cStatusFilter,setCStatusFilter]= useState('');

  // Modals
  const [detailModal,  setDetailModal]  = useState(null);
  const [updateModal,  setUpdateModal]  = useState(null);
  const [updateForm,   setUpdateForm]   = useState({ status: '', location: '', notes: '' });
  const [complaintModal,setComplaintModal] = useState(null);
  const [complaintForm, setComplaintForm]  = useState({ status: '', resolution: '', internalNotes: '' });
  const [submitting,   setSubmitting]   = useState(false);

  // ── Fetch baggage ──────────────────────────────────────────────────────────
  const fetchBaggage = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (search)       params.search = search;
      if (lostFilter)   params.isLost = lostFilter;
      const { data } = await api.get('/baggage', { params });
      setBaggage(data.baggage || []);
      setPages(data.pages);
      setTotal(data.total);
    } catch { toast.error('Failed to load baggage'); }
    finally { setLoading(false); }
  }, [page, statusFilter, search, lostFilter]);

  // ── Fetch complaints ───────────────────────────────────────────────────────
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: cPage, limit: 20 };
      if (cStatusFilter) params.status = cStatusFilter;
      const { data } = await api.get('/baggage/complaints', { params });
      setComplaints(data.complaints || []);
      setCPages(data.pages);
      setCTotal(data.total);
    } catch { toast.error('Failed to load complaints'); }
    finally { setLoading(false); }
  }, [cPage, cStatusFilter]);

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const { data } = await api.get('/baggage/stats');
      setStats(data.stats);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (tab === 0) fetchBaggage();
    else           fetchComplaints();
  }, [tab, fetchBaggage, fetchComplaints]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchBaggage(); };

  // ── Update status ──────────────────────────────────────────────────────────
  const openUpdate = (b) => {
    setUpdateModal(b);
    setUpdateForm({ status: b.status, location: '', notes: '' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!updateForm.status) { toast.error('Select a status'); return; }
    setSubmitting(true);
    try {
      await api.patch(`/baggage/${updateModal._id}/status`, updateForm);
      toast.success('Status updated');
      setUpdateModal(null);
      fetchBaggage();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSubmitting(false); }
  };

  // ── Mark fee paid ──────────────────────────────────────────────────────────
  const handleMarkFeePaid = async (id) => {
    try {
      await api.patch(`/baggage/${id}/fee-paid`);
      toast.success('Excess fee marked as paid');
      fetchBaggage();
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  // ── Mark found ─────────────────────────────────────────────────────────────
  const handleMarkFound = async (b) => {
    const location = window.prompt(`Where was ${b.tagNumber} found?`, '');
    if (location === null) return;
    try {
      await api.post(`/baggage/${b._id}/found`, { location, notes: 'Baggage located and recovered' });
      toast.success('Baggage marked as found');
      fetchBaggage();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  // ── Update complaint ───────────────────────────────────────────────────────
  const openComplaint = (c) => {
    setComplaintModal(c);
    setComplaintForm({ status: c.status, resolution: c.resolution || '', internalNotes: c.internalNotes || '' });
  };

  const handleComplaintUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/baggage/complaints/${complaintModal._id}`, complaintForm);
      toast.success('Complaint updated');
      setComplaintModal(null);
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSubmitting(false); }
  };

  const PRIORITY_COLORS = {
    low:    'bg-dark-700 text-dark-400',
    medium: 'bg-blue-500/10 text-blue-400',
    high:   'bg-orange-500/10 text-orange-400',
    urgent: 'bg-red-500/10 text-red-400',
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Baggage Desk"
        subtitle="Track and manage all baggage operations"
        actions={
          <button onClick={() => { fetchBaggage(); fetchStats(); }} className="btn-secondary btn-sm">
            <FiRefreshCw size={14} /> Refresh
          </button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Baggage"   value={stats.total}                    icon={FiPackage}      color="blue" />
          <StatCard title="Missing / Lost"  value={stats.missing}                  icon={FiAlertTriangle}color="red" />
          <StatCard title="Excess Revenue"  value={formatCurrency(stats.excessRevenue)} icon={FiDollarSign} color="amber" />
          <StatCard title="Fees Collected"  value={formatCurrency(stats.excessRevenuePaid)} icon={FiCheckCircle} color="green" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800 p-1 rounded-xl border border-dark-700 w-fit">
        {TABS.map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === i ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            {label}
            {i === 1 && cTotal > 0 && (
              <span className="ml-1.5 text-2xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full">{cTotal}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab 0: All Baggage ─────────────────────────────────────────────── */}
      {tab === 0 && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value.toUpperCase())}
                  className="input pl-8 w-48 font-mono"
                  placeholder="Tag or passenger…"
                />
              </div>
              <button type="submit" className="btn-secondary">Search</button>
            </form>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input w-44">
              <option value="">All statuses</option>
              {BAGGAGE_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select value={lostFilter} onChange={(e) => { setLostFilter(e.target.value); setPage(1); }} className="input w-36">
              <option value="">All bags</option>
              <option value="true">Lost only</option>
              <option value="false">Not lost</option>
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
          ) : baggage.length === 0 ? (
            <EmptyState title="No baggage found" description="Try adjusting your filters" icon={FiPackage} />
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tag</th>
                      <th>Passenger</th>
                      <th>Flight</th>
                      <th>Weight</th>
                      <th>Excess Fee</th>
                      <th>Status</th>
                      <th>Last Update</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baggage.map((b) => (
                      <tr key={b._id} className={b.isLost ? 'border-l-2 border-l-red-500' : ''}>
                        <td>
                          <p className="font-mono font-semibold text-primary-400">{b.tagNumber}</p>
                          {b.isLost && (
                            <span className="badge bg-red-500/10 text-red-400 border-red-500/20 text-2xs mt-0.5">Lost</span>
                          )}
                        </td>
                        <td className="text-dark-200 text-sm">{b.passengerName || '—'}</td>
                        <td className="font-mono text-dark-300 text-sm">{b.flight?.flightNumber || '—'}</td>
                        <td>
                          <p className="text-dark-200 text-sm">{b.weight}kg</p>
                          {b.excessWeight > 0 && (
                            <p className="text-2xs text-amber-400">+{b.excessWeight}kg excess</p>
                          )}
                        </td>
                        <td>
                          {b.excessFee > 0 ? (
                            <span className={`badge text-2xs ${
                              b.excessFeePaid
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {formatCurrency(b.excessFee)} {b.excessFeePaid ? '✓' : '!'}
                            </span>
                          ) : (
                            <span className="text-dark-600 text-xs">—</span>
                          )}
                        </td>
                        <td><StatusBadge status={b.status} /></td>
                        <td className="text-dark-500 text-xs">
                          {b.trackingHistory?.length > 0
                            ? formatDateTime(b.trackingHistory[b.trackingHistory.length - 1]?.timestamp)
                            : '—'}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setDetailModal(b)}
                              className="btn-icon btn-ghost text-dark-400 hover:text-dark-200"
                              title="View details"
                            >
                              <FiEye size={13} />
                            </button>
                            <button
                              onClick={() => openUpdate(b)}
                              className="btn-icon btn-ghost text-primary-400 hover:text-primary-300"
                              title="Update status"
                            >
                              <FiPackage size={13} />
                            </button>
                            {b.excessFee > 0 && !b.excessFeePaid && (
                              <button
                                onClick={() => handleMarkFeePaid(b._id)}
                                className="btn-icon btn-ghost text-emerald-400 hover:text-emerald-300"
                                title="Mark fee paid"
                              >
                                <FiDollarSign size={13} />
                              </button>
                            )}
                            {b.isLost && (
                              <button
                                onClick={() => handleMarkFound(b)}
                                className="btn-icon btn-ghost text-emerald-400 hover:text-emerald-300"
                                title="Mark as found"
                              >
                                <FiCheckCircle size={13} />
                              </button>
                            )}
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
        </>
      )}

      {/* ── Tab 1: Complaints ──────────────────────────────────────────────── */}
      {tab === 1 && (
        <>
          <div className="flex gap-3">
            <select value={cStatusFilter} onChange={(e) => { setCStatusFilter(e.target.value); setCPage(1); }} className="input w-44">
              <option value="">All statuses</option>
              {['open','in_progress','resolved','closed'].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
          ) : complaints.length === 0 ? (
            <EmptyState title="No complaints found" icon={FiFileText} />
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Passenger</th>
                      <th>Type</th>
                      <th>Subject</th>
                      <th>Baggage</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Filed</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr key={c._id}>
                        <td>
                          <p className="text-dark-100 text-sm font-medium">{c.user?.firstName} {c.user?.lastName}</p>
                          <p className="text-2xs text-dark-500">{c.user?.email}</p>
                        </td>
                        <td>
                          <span className="badge bg-dark-700 text-dark-300 text-2xs capitalize">
                            {c.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="text-dark-200 text-sm max-w-[200px] truncate">{c.subject}</td>
                        <td className="font-mono text-dark-300 text-sm">{c.baggage?.tagNumber || '—'}</td>
                        <td>
                          <span className={`badge text-2xs ${PRIORITY_COLORS[c.priority] ?? ''}`}>
                            {c.priority}
                          </span>
                        </td>
                        <td><StatusBadge status={c.status} /></td>
                        <td className="text-dark-500 text-xs">{formatDateTime(c.createdAt)}</td>
                        <td>
                          <button
                            onClick={() => openComplaint(c)}
                            className="btn-primary btn-sm"
                          >
                            <FiFileText size={12} /> Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={cPage} pages={cPages} total={cTotal} onPageChange={setCPage} />
            </>
          )}
        </>
      )}

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
        title={`Baggage — ${detailModal?.tagNumber}`}
        size="md"
      >
        {detailModal && (
          <div className="space-y-4">
            <BaggageTag baggage={detailModal} />
            <div>
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Tracking History</p>
              <TrackingTimeline history={detailModal.trackingHistory} />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Update Status Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={!!updateModal}
        onClose={() => setUpdateModal(null)}
        title={`Update Status — ${updateModal?.tagNumber}`}
        size="sm"
      >
        {updateModal && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="label">New Status <span className="text-red-400">*</span></label>
              <select
                value={updateForm.status}
                onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                className="input"
                required
              >
                <option value="">Select status</option>
                {BAGGAGE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Location</label>
              <input
                value={updateForm.location}
                onChange={(e) => setUpdateForm({ ...updateForm, location: e.target.value })}
                className="input"
                placeholder="e.g. Baggage Hall 3, Belt 5"
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                value={updateForm.notes}
                onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                className="input"
                rows={2}
                placeholder="Optional notes…"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                {submitting ? <><LoadingSpinner size="sm" /> Updating…</> : 'Update Status'}
              </button>
              <button type="button" onClick={() => setUpdateModal(null)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Complaint Update Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={!!complaintModal}
        onClose={() => setComplaintModal(null)}
        title={`Complaint — ${complaintModal?.subject}`}
        size="md"
      >
        {complaintModal && (
          <form onSubmit={handleComplaintUpdate} className="space-y-4">
            {/* Complaint info */}
            <div className="p-3 bg-dark-700/50 rounded-xl border border-dark-600 space-y-1 text-sm">
              <p><span className="text-dark-500">Passenger: </span><span className="text-dark-200">{complaintModal.user?.firstName} {complaintModal.user?.lastName}</span></p>
              <p><span className="text-dark-500">Type: </span><span className="text-dark-200 capitalize">{complaintModal.type?.replace(/_/g, ' ')}</span></p>
              <p className="text-dark-300 text-xs mt-1">{complaintModal.description}</p>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                value={complaintForm.status}
                onChange={(e) => setComplaintForm({ ...complaintForm, status: e.target.value })}
                className="input"
              >
                {['open','in_progress','resolved','closed'].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Resolution (shown to passenger)</label>
              <textarea
                value={complaintForm.resolution}
                onChange={(e) => setComplaintForm({ ...complaintForm, resolution: e.target.value })}
                className="input"
                rows={3}
                placeholder="Describe how the complaint was resolved…"
              />
            </div>

            <div>
              <label className="label">Internal Notes (staff only)</label>
              <textarea
                value={complaintForm.internalNotes}
                onChange={(e) => setComplaintForm({ ...complaintForm, internalNotes: e.target.value })}
                className="input"
                rows={2}
                placeholder="Internal notes not visible to passenger…"
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                {submitting ? <><LoadingSpinner size="sm" /> Saving…</> : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setComplaintModal(null)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
