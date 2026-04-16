/**
 * BaggageTracking.jsx
 * Passenger baggage tracking page with:
 * - Tag number search
 * - My baggage list with expandable tracking timeline
 * - Lost baggage reporting
 * - Complaint filing
 * - My complaints history
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import BaggageTag from '../../components/baggage/BaggageTag';
import TrackingTimeline from '../../components/baggage/TrackingTimeline';
import ComplaintForm from '../../components/baggage/ComplaintForm';
import { formatDateTime, formatCurrency } from '../../utils/helpers';
import {
  FiPackage, FiSearch, FiAlertTriangle, FiFileText,
  FiRefreshCw, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const TABS = ['My Baggage', 'My Complaints'];

export default function BaggageTracking() {
  const [tab,       setTab]       = useState(0);
  const [baggage,   setBaggage]   = useState([]);
  const [complaints,setComplaints]= useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [searching, setSearching] = useState(false);
  const [tagResult, setTagResult] = useState(null);
  const [expanded,  setExpanded]  = useState(null); // expanded baggage _id

  // Modals
  const [lostModal,      setLostModal]      = useState(null); // baggage object
  const [complaintModal, setComplaintModal] = useState(null); // baggage object
  const [lostDesc,       setLostDesc]       = useState('');
  const [lostLocation,   setLostLocation]   = useState('');
  const [submitting,     setSubmitting]     = useState(false);

  const fetchBaggage = useCallback(async () => {
    setLoading(true);
    try {
      const [bagRes, compRes] = await Promise.all([
        api.get('/baggage/my'),
        api.get('/baggage/complaints/my'),
      ]);
      setBaggage(bagRes.data.baggage || []);
      setComplaints(compRes.data.complaints || []);
    } catch { toast.error('Failed to load baggage data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBaggage(); }, [fetchBaggage]);

  // ── Tag search ─────────────────────────────────────────────────────────────
  const searchByTag = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    setTagResult(null);
    try {
      const { data } = await api.get(`/baggage/tag/${search.trim().toUpperCase()}`);
      setTagResult(data.baggage);
    } catch {
      toast.error('Baggage not found. Check the tag number and try again.');
    } finally { setSearching(false); }
  };

  // ── Report lost ────────────────────────────────────────────────────────────
  const handleReportLost = async () => {
    if (!lostDesc.trim() || lostDesc.length < 10) {
      toast.error('Please provide a description (min 10 characters)');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/baggage/${lostModal._id}/lost`, {
        description:      lostDesc,
        lastSeenLocation: lostLocation || undefined,
      });
      toast.success('Lost baggage reported. Our team will investigate.');
      setLostModal(null);
      setLostDesc('');
      setLostLocation('');
      fetchBaggage();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report');
    } finally { setSubmitting(false); }
  };

  // ── File complaint ─────────────────────────────────────────────────────────
  const handleComplaint = async (formData) => {
    setSubmitting(true);
    try {
      await api.post(`/baggage/${complaintModal._id}/complaint`, formData);
      toast.success('Complaint filed successfully. We will respond within 48 hours.');
      setComplaintModal(null);
      fetchBaggage();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to file complaint');
    } finally { setSubmitting(false); }
  };

  const toggleExpand = (id) => setExpanded((prev) => (prev === id ? null : id));

  const COMPLAINT_STATUS_COLORS = {
    open:        'bg-blue-500/10 text-blue-400 border-blue-500/20',
    in_progress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    resolved:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    closed:      'bg-dark-600 text-dark-400 border-dark-500',
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Baggage Tracking"
        subtitle="Track your checked baggage in real time"
        actions={
          <button onClick={fetchBaggage} className="btn-secondary btn-sm">
            <FiRefreshCw size={14} /> Refresh
          </button>
        }
      />

      {/* Tag search */}
      <form onSubmit={searchByTag} className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            className="input pl-8 font-mono"
            placeholder="Enter baggage tag (e.g. BT123456789)"
          />
        </div>
        <button type="submit" disabled={searching || !search.trim()} className="btn-primary">
          {searching ? <LoadingSpinner size="sm" /> : 'Track'}
        </button>
        {tagResult && (
          <button type="button" onClick={() => { setTagResult(null); setSearch(''); }} className="btn-secondary">
            Clear
          </button>
        )}
      </form>

      {/* Tag search result */}
      {tagResult && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-sm font-semibold text-dark-200">Search Result</p>
          <BaggageTag baggage={tagResult} />
          <div className="card">
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Tracking History</p>
            <TrackingTimeline history={tagResult.trackingHistory} />
          </div>
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
            {i === 1 && complaints.filter((c) => c.status === 'open').length > 0 && (
              <span className="ml-1.5 text-2xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                {complaints.filter((c) => c.status === 'open').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab 0: My Baggage ──────────────────────────────────────────────── */}
      {tab === 0 && (
        baggage.length === 0 ? (
          <EmptyState
            title="No baggage records"
            description="Your checked baggage will appear here after check-in"
            icon={FiPackage}
          />
        ) : (
          <div className="space-y-3">
            {baggage.map((b) => (
              <div key={b._id} className="card-hover">
                {/* Main row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-dark-700 border border-dark-600 flex items-center justify-center text-lg flex-shrink-0">
                      {b.type === 'checked' ? '🧳' : b.type === 'carry_on' ? '👜' : b.type === 'fragile' ? '🔮' : '📦'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-dark-100">{b.tagNumber}</p>
                      <p className="text-2xs text-dark-400 mt-0.5">
                        {b.flight?.flightNumber} · {b.weight}kg · <span className="capitalize">{b.type}</span>
                        {b.color && ` · ${b.color}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {b.excessFee > 0 && !b.excessFeePaid && (
                      <span className="badge bg-amber-500/10 text-amber-400 border-amber-500/20 text-2xs">
                        Fee: {formatCurrency(b.excessFee)}
                      </span>
                    )}
                    {b.isLost && (
                      <span className="badge bg-red-500/10 text-red-400 border-red-500/20 text-2xs">Lost</span>
                    )}
                    <StatusBadge status={b.status} />
                    <button
                      onClick={() => toggleExpand(b._id)}
                      className="btn-icon btn-ghost text-dark-500"
                    >
                      {expanded === b._id ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Last update */}
                {b.trackingHistory?.length > 0 && expanded !== b._id && (
                  <p className="text-2xs text-dark-500 mt-2">
                    Last: {b.trackingHistory[b.trackingHistory.length - 1]?.location || b.trackingHistory[b.trackingHistory.length - 1]?.status}
                    {' · '}{formatDateTime(b.trackingHistory[b.trackingHistory.length - 1]?.timestamp)}
                  </p>
                )}

                {/* Expanded */}
                {expanded === b._id && (
                  <div className="mt-4 pt-4 border-t border-dark-700 space-y-4 animate-fade-in">
                    {/* Full tag details */}
                    <BaggageTag baggage={b} />

                    {/* Tracking timeline */}
                    <div>
                      <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Tracking History</p>
                      <TrackingTimeline history={b.trackingHistory} />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {!b.isLost && !['claimed', 'lost'].includes(b.status) && (
                        <button
                          onClick={() => setLostModal(b)}
                          className="btn-danger btn-sm"
                        >
                          <FiAlertTriangle size={13} /> Report Lost
                        </button>
                      )}
                      <button
                        onClick={() => setComplaintModal(b)}
                        className="btn-secondary btn-sm"
                      >
                        <FiFileText size={13} /> File Complaint
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Tab 1: My Complaints ───────────────────────────────────────────── */}
      {tab === 1 && (
        complaints.length === 0 ? (
          <EmptyState
            title="No complaints filed"
            description="File a complaint if you have issues with your baggage"
            icon={FiFileText}
          />
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div key={c._id} className="card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-dark-100 text-sm">{c.subject}</p>
                    <p className="text-2xs text-dark-500 mt-0.5">
                      {c.type.replace(/_/g, ' ')} · Filed {formatDateTime(c.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge text-2xs border ${COMPLAINT_STATUS_COLORS[c.status] ?? ''}`}>
                      {c.status.replace(/_/g, ' ')}
                    </span>
                    <span className={`badge text-2xs ${
                      c.priority === 'urgent' ? 'bg-red-500/10 text-red-400' :
                      c.priority === 'high'   ? 'bg-orange-500/10 text-orange-400' :
                      'bg-dark-700 text-dark-400'
                    }`}>
                      {c.priority}
                    </span>
                  </div>
                </div>

                {c.baggage && (
                  <p className="text-2xs text-dark-500 mb-2">
                    Baggage: <span className="font-mono text-dark-300">{c.baggage.tagNumber}</span>
                    {' · '}{c.baggage.weight}kg
                  </p>
                )}

                <p className="text-xs text-dark-400 line-clamp-2">{c.description}</p>

                {c.resolution && (
                  <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-2xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">Resolution</p>
                    <p className="text-xs text-dark-300">{c.resolution}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Report Lost Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={!!lostModal}
        onClose={() => { setLostModal(null); setLostDesc(''); setLostLocation(''); }}
        title={`Report Lost Baggage — ${lostModal?.tagNumber}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-xs text-red-400">
              This will mark your baggage as lost and notify our baggage team immediately.
            </p>
          </div>
          <div>
            <label className="label">Description <span className="text-red-400">*</span></label>
            <textarea
              value={lostDesc}
              onChange={(e) => setLostDesc(e.target.value)}
              className="input"
              rows={3}
              placeholder="Describe the bag — color, brand, size, contents…"
              minLength={10}
            />
          </div>
          <div>
            <label className="label">Last Seen Location</label>
            <input
              value={lostLocation}
              onChange={(e) => setLostLocation(e.target.value)}
              className="input"
              placeholder="e.g. JFK Terminal 4 baggage claim"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleReportLost} disabled={submitting} className="btn-danger flex-1 justify-center">
              {submitting ? <><LoadingSpinner size="sm" /> Reporting…</> : 'Report Lost'}
            </button>
            <button onClick={() => setLostModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* ── Complaint Modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!complaintModal}
        onClose={() => setComplaintModal(null)}
        title="File a Complaint"
        size="md"
      >
        <ComplaintForm
          baggage={complaintModal}
          onSubmit={handleComplaint}
          onCancel={() => setComplaintModal(null)}
          loading={submitting}
        />
      </Modal>
    </div>
  );
}
