/**
 * SecurityDesk.jsx
 * Full security officer console with:
 * - Stats dashboard
 * - Searchable/filterable security checks table
 * - Document verification checklist
 * - Flag / clear / reject actions
 * - Restricted item logging
 * - Incident logging
 * - Watchlist management
 * - Admin boarding override
 * - Flight-level security manifest
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import SecurityStatusBadge from '../../components/security/SecurityStatusBadge';
import ChecklistPanel from '../../components/security/ChecklistPanel';
import RestrictedItemForm from '../../components/security/RestrictedItemForm';
import IncidentForm from '../../components/security/IncidentForm';
import SecurityCheckDetail from '../../components/security/SecurityCheckDetail';
import { formatDateTime } from '../../utils/helpers';
import {
  FiShield, FiSearch, FiAlertTriangle, FiCheckCircle,
  FiXCircle, FiRefreshCw, FiEye, FiPackage, FiFileText,
  FiUsers, FiFlag, FiUnlock,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { value: 'pending',  label: 'Pending',  color: 'text-yellow-400' },
  { value: 'flagged',  label: 'Flagged',  color: 'text-orange-400' },
  { value: 'rejected', label: 'Rejected', color: 'text-red-400' },
  { value: 'cleared',  label: 'Cleared',  color: 'text-emerald-400' },
  { value: '',         label: 'All',      color: 'text-dark-300' },
];

export default function SecurityDesk() {
  const { user } = useSelector((s) => s.auth);
  const isAdmin = ['super_admin', 'airport_admin'].includes(user?.role);

  // Table state
  const [checks,       setChecks]       = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(1);
  const [pages,        setPages]        = useState(1);
  const [total,        setTotal]        = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search,       setSearch]       = useState('');
  const [watchlisted,  setWatchlisted]  = useState(false);

  // Flight filter
  const [flights,        setFlights]        = useState([]);
  const [flightFilter,   setFlightFilter]   = useState('');
  const [flightManifest, setFlightManifest] = useState(null);

  // Modals
  const [detailModal,    setDetailModal]    = useState(null);
  const [updateModal,    setUpdateModal]    = useState(null);
  const [restrictedModal,setRestrictedModal]= useState(null);
  const [incidentModal,  setIncidentModal]  = useState(null);
  const [overrideModal,  setOverrideModal]  = useState(null);
  const [overrideReason, setOverrideReason] = useState('');

  // Update form
  const [updateForm, setUpdateForm] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch checks ───────────────────────────────────────────────────────────
  const fetchChecks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter)  params.status       = statusFilter;
      if (search)        params.search       = search;
      if (watchlisted)   params.isWatchlisted = 'true';
      if (flightFilter)  params.flight       = flightFilter;
      const { data } = await api.get('/security', { params });
      setChecks(data.checks || []);
      setPages(data.pages);
      setTotal(data.total);
    } catch { toast.error('Failed to load security checks'); }
    finally { setLoading(false); }
  }, [page, statusFilter, search, watchlisted, flightFilter]);

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const { data } = await api.get('/security/stats');
      setStats(data.stats);
    } catch { /* silent */ }
  };

  // ── Fetch flights ──────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/flights?status=scheduled,boarding&limit=30')
      .then((r) => setFlights(r.data.flights || []));
    fetchStats();
  }, []);

  useEffect(() => { fetchChecks(); }, [fetchChecks]);

  // ── Load flight manifest ───────────────────────────────────────────────────
  const loadFlightManifest = async (flightId) => {
    if (!flightId) { setFlightManifest(null); return; }
    try {
      const { data } = await api.get(`/security/flight/${flightId}`);
      setFlightManifest(data);
    } catch { toast.error('Failed to load flight manifest'); }
  };

  const handleFlightChange = (fid) => {
    setFlightFilter(fid);
    setPage(1);
    loadFlightManifest(fid);
  };

  // ── Open update modal ──────────────────────────────────────────────────────
  const openUpdate = (check) => {
    setUpdateModal(check);
    setUpdateForm({
      status:           check.status,
      documentVerified: check.documentVerified,
      baggageCleared:   check.baggageCleared,
      biometricVerified:check.biometricVerified,
      visaVerified:     check.visaVerified,
      flagReason:       check.flagReason || '',
      incidentNotes:    check.incidentNotes || '',
      isWatchlisted:    check.isWatchlisted || false,
      watchlistReason:  check.watchlistReason || '',
      passportNumber:   check.passportNumber || '',
      nationality:      check.nationality || '',
    });
  };

  // ── Quick actions ──────────────────────────────────────────────────────────
  const quickAction = async (id, status, extra = {}) => {
    try {
      await api.patch(`/security/${id}`, { status, documentVerified: true, baggageCleared: true, ...extra });
      toast.success(`Passenger ${status}`);
      fetchChecks();
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
  };

  // ── Save update ────────────────────────────────────────────────────────────
  const handleUpdate = async (e) => {
    e.preventDefault();
    if ((updateForm.status === 'flagged' || updateForm.status === 'rejected') && !updateForm.flagReason.trim()) {
      toast.error('Flag/rejection reason is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/security/${updateModal._id}`, updateForm);
      toast.success('Security check updated');
      setUpdateModal(null);
      fetchChecks();
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setSubmitting(false); }
  };

  // ── Log restricted item ────────────────────────────────────────────────────
  const handleRestrictedItem = async (formData) => {
    setSubmitting(true);
    try {
      await api.post(`/security/${restrictedModal._id}/restricted-item`, formData);
      toast.success('Restricted item logged');
      setRestrictedModal(null);
      fetchChecks();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  // ── Log incident ───────────────────────────────────────────────────────────
  const handleIncident = async (formData) => {
    setSubmitting(true);
    try {
      await api.post(`/security/${incidentModal._id}/incident`, formData);
      toast.success('Incident logged');
      setIncidentModal(null);
      fetchChecks();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  // ── Boarding override ──────────────────────────────────────────────────────
  const handleOverride = async () => {
    if (!overrideReason.trim() || overrideReason.length < 10) {
      toast.error('Override reason must be at least 10 characters');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/security/${overrideModal._id}/override`, { reason: overrideReason });
      toast.success('Boarding override applied');
      setOverrideModal(null);
      setOverrideReason('');
      fetchChecks();
    } catch (err) { toast.error(err.response?.data?.message || 'Override failed'); }
    finally { setSubmitting(false); }
  };

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchChecks(); };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <PageHeader
        title="Security Desk"
        subtitle="Passenger document verification and security clearance"
        actions={
          <button onClick={() => { fetchChecks(); fetchStats(); }} className="btn-secondary btn-sm">
            <FiRefreshCw size={14} /> Refresh
          </button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Checks"    value={stats.total}          icon={FiShield}       color="blue" />
          <StatCard title="Pending"         value={stats.byStatus?.pending ?? 0}  icon={FiUsers}  color="amber" />
          <StatCard title="Flagged"         value={stats.byStatus?.flagged ?? 0}  icon={FiFlag}   color="orange" />
          <StatCard title="Watchlisted"     value={stats.watchlisted}    icon={FiAlertTriangle} color="red" />
        </div>
      )}

      {/* Flight manifest */}
      <div className="card">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="label text-xs">Filter by Flight</label>
            <select
              value={flightFilter}
              onChange={(e) => handleFlightChange(e.target.value)}
              className="input"
            >
              <option value="">All flights</option>
              {flights.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.flightNumber} — {f.departureAirport?.code} → {f.arrivalAirport?.code}
                </option>
              ))}
            </select>
          </div>

          {/* Flight summary */}
          {flightManifest && (
            <div className="flex gap-3 flex-wrap">
              {[
                ['Total',    flightManifest.summary.total,    'text-dark-200'],
                ['Pending',  flightManifest.summary.pending,  'text-yellow-400'],
                ['Cleared',  flightManifest.summary.cleared,  'text-emerald-400'],
                ['Flagged',  flightManifest.summary.flagged,  'text-orange-400'],
                ['Rejected', flightManifest.summary.rejected, 'text-red-400'],
              ].map(([label, value, color]) => (
                <div key={label} className="text-center px-3 py-2 bg-dark-700/50 rounded-xl border border-dark-600">
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-2xs text-dark-500">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status tabs */}
        <div className="flex gap-1">
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setStatusFilter(value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === value ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-400 hover:text-dark-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-8 w-48"
              placeholder="Search passenger…"
            />
          </div>
          <button type="submit" className="btn-secondary btn-sm">Search</button>
        </form>

        {/* Watchlist toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={watchlisted}
            onChange={(e) => { setWatchlisted(e.target.checked); setPage(1); }}
            className="w-4 h-4 accent-red-500"
          />
          <span className="text-xs text-dark-400">Watchlisted only</span>
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : checks.length === 0 ? (
        <EmptyState
          title="No security checks found"
          description="Try adjusting your filters"
          icon={FiShield}
        />
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Passenger</th>
                  <th>Flight</th>
                  <th>PNR</th>
                  <th>Documents</th>
                  <th>Baggage</th>
                  <th>Status</th>
                  <th>Flags</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => (
                  <tr
                    key={c._id}
                    className={
                      c.status === 'rejected' ? 'border-l-2 border-l-red-500' :
                      c.status === 'flagged'  ? 'border-l-2 border-l-orange-500' :
                      c.isWatchlisted         ? 'border-l-2 border-l-amber-500' : ''
                    }
                  >
                    {/* Passenger */}
                    <td>
                      <p className="font-medium text-dark-100 text-sm">{c.passengerName}</p>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {c.isWatchlisted && (
                          <span className="badge bg-red-500/10 text-red-400 border-red-500/20 text-2xs">⚠️ Watchlist</span>
                        )}
                        {c.incidents?.length > 0 && (
                          <span className="badge bg-orange-500/10 text-orange-400 border-orange-500/20 text-2xs">
                            {c.incidents.length} incident{c.incidents.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {c.restrictedItems?.length > 0 && (
                          <span className="badge bg-amber-500/10 text-amber-400 border-amber-500/20 text-2xs">
                            {c.restrictedItems.length} item{c.restrictedItems.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Flight */}
                    <td className="font-mono text-dark-300 text-sm">{c.flight?.flightNumber || '—'}</td>

                    {/* PNR */}
                    <td className="font-mono text-primary-400 text-sm">{c.booking?.pnr || '—'}</td>

                    {/* Documents */}
                    <td>
                      <span className={`badge text-2xs ${
                        c.documentVerified
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {c.documentVerified ? '✓ Verified' : 'Pending'}
                      </span>
                    </td>

                    {/* Baggage */}
                    <td>
                      <span className={`badge text-2xs ${
                        c.baggageCleared
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {c.baggageCleared ? '✓ Cleared' : 'Pending'}
                      </span>
                    </td>

                    {/* Status */}
                    <td><SecurityStatusBadge status={c.status} /></td>

                    {/* Flags */}
                    <td>
                      {c.boardingOverride && (
                        <span className="badge bg-purple-500/10 text-purple-400 border-purple-500/20 text-2xs">Override</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex gap-0.5">
                        {/* View detail */}
                        <button
                          onClick={() => setDetailModal(c)}
                          className="btn-icon btn-ghost text-dark-400 hover:text-dark-200"
                          title="View details"
                        >
                          <FiEye size={13} />
                        </button>

                        {/* Quick clear */}
                        {c.status === 'pending' && (
                          <button
                            onClick={() => quickAction(c._id, 'cleared')}
                            className="btn-icon btn-ghost text-emerald-400 hover:text-emerald-300"
                            title="Quick clear"
                          >
                            <FiCheckCircle size={13} />
                          </button>
                        )}

                        {/* Quick flag */}
                        {c.status === 'pending' && (
                          <button
                            onClick={() => openUpdate({ ...c, _id: c._id })}
                            className="btn-icon btn-ghost text-orange-400 hover:text-orange-300"
                            title="Flag / Review"
                          >
                            <FiAlertTriangle size={13} />
                          </button>
                        )}

                        {/* Full update */}
                        <button
                          onClick={() => openUpdate(c)}
                          className="btn-icon btn-ghost text-primary-400 hover:text-primary-300"
                          title="Update check"
                        >
                          <FiShield size={13} />
                        </button>

                        {/* Log restricted item */}
                        <button
                          onClick={() => setRestrictedModal(c)}
                          className="btn-icon btn-ghost text-amber-400 hover:text-amber-300"
                          title="Log restricted item"
                        >
                          <FiPackage size={13} />
                        </button>

                        {/* Log incident */}
                        <button
                          onClick={() => setIncidentModal(c)}
                          className="btn-icon btn-ghost text-red-400 hover:text-red-300"
                          title="Log incident"
                        >
                          <FiFileText size={13} />
                        </button>

                        {/* Admin override */}
                        {isAdmin && (c.status === 'rejected' || c.status === 'flagged') && !c.boardingOverride && (
                          <button
                            onClick={() => { setOverrideModal(c); setOverrideReason(''); }}
                            className="btn-icon btn-ghost text-purple-400 hover:text-purple-300"
                            title="Boarding override"
                          >
                            <FiUnlock size={13} />
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

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
        title={`Security Check — ${detailModal?.passengerName}`}
        size="lg"
      >
        <SecurityCheckDetail check={detailModal} />
      </Modal>

      {/* ── Update Modal ───────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!updateModal}
        onClose={() => setUpdateModal(null)}
        title={`Update Check — ${updateModal?.passengerName}`}
        size="lg"
      >
        {updateModal && (
          <form onSubmit={handleUpdate} className="space-y-5">
            {/* Status selector */}
            <div>
              <label className="label">Security Status</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'pending',  label: 'Pending',  color: 'text-yellow-400' },
                  { value: 'cleared',  label: 'Cleared',  color: 'text-emerald-400' },
                  { value: 'flagged',  label: 'Flagged',  color: 'text-orange-400' },
                  { value: 'rejected', label: 'Rejected', color: 'text-red-400' },
                ].map(({ value, label, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setUpdateForm((f) => ({ ...f, status: value }))}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      updateForm.status === value
                        ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                        : `border-dark-600 bg-dark-700/50 ${color} hover:border-dark-500`
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Verification checklist */}
            <div>
              <label className="label">Verification Checklist</label>
              <ChecklistPanel
                values={updateForm}
                onChange={(key, val) => setUpdateForm((f) => ({ ...f, [key]: val }))}
              />
            </div>

            {/* Passport / nationality */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Passport Number</label>
                <input
                  value={updateForm.passportNumber}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, passportNumber: e.target.value }))}
                  className="input font-mono"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="label">Nationality</label>
                <input
                  value={updateForm.nationality}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, nationality: e.target.value }))}
                  className="input"
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Flag / rejection reason */}
            {(updateForm.status === 'flagged' || updateForm.status === 'rejected') && (
              <div className="animate-fade-in">
                <label className="label">
                  {updateForm.status === 'rejected' ? 'Rejection' : 'Flag'} Reason
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <textarea
                  value={updateForm.flagReason}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, flagReason: e.target.value }))}
                  className="input"
                  rows={2}
                  placeholder="Provide a clear reason…"
                />
              </div>
            )}

            {/* Watchlist */}
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateForm.isWatchlisted}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, isWatchlisted: e.target.checked }))}
                  className="w-4 h-4 accent-red-500"
                />
                <span className="text-sm text-dark-300">Add to watchlist</span>
              </label>
              {updateForm.isWatchlisted && (
                <input
                  value={updateForm.watchlistReason}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, watchlistReason: e.target.value }))}
                  className="input"
                  placeholder="Watchlist reason…"
                />
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="label">Officer Notes</label>
              <textarea
                value={updateForm.incidentNotes}
                onChange={(e) => setUpdateForm((f) => ({ ...f, incidentNotes: e.target.value }))}
                className="input"
                rows={2}
                placeholder="Internal notes…"
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                {submitting ? <><LoadingSpinner size="sm" /> Saving…</> : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setUpdateModal(null)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Restricted Item Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={!!restrictedModal}
        onClose={() => setRestrictedModal(null)}
        title={`Log Restricted Item — ${restrictedModal?.passengerName}`}
        size="md"
      >
        <RestrictedItemForm
          onSubmit={handleRestrictedItem}
          onCancel={() => setRestrictedModal(null)}
          loading={submitting}
        />
      </Modal>

      {/* ── Incident Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!incidentModal}
        onClose={() => setIncidentModal(null)}
        title={`Log Incident — ${incidentModal?.passengerName}`}
        size="md"
      >
        <IncidentForm
          onSubmit={handleIncident}
          onCancel={() => setIncidentModal(null)}
          loading={submitting}
        />
      </Modal>

      {/* ── Boarding Override Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={!!overrideModal}
        onClose={() => setOverrideModal(null)}
        title={`Boarding Override — ${overrideModal?.passengerName}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <p className="text-sm font-semibold text-purple-400 mb-1">Administrator Override</p>
            <p className="text-xs text-dark-300">
              This will allow the passenger to board despite a security flag or rejection.
              This action is logged and audited.
            </p>
          </div>
          <div>
            <label className="label">Override Reason <span className="text-red-400">*</span></label>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="input"
              rows={3}
              placeholder="Provide a detailed justification for this override (min 10 characters)…"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleOverride}
              disabled={submitting}
              className="btn-primary flex-1 justify-center"
              style={{ background: '#7c3aed' }}
            >
              {submitting ? <><LoadingSpinner size="sm" /> Applying…</> : <><FiUnlock size={14} /> Apply Override</>}
            </button>
            <button onClick={() => setOverrideModal(null)} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
