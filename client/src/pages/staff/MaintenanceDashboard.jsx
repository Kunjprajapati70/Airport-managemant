/**
 * MaintenanceDashboard.jsx
 * Full aircraft maintenance management console with:
 * - Stats overview (logs by status, aircraft by status, costs)
 * - Aircraft fleet status grid with due/overdue alerts
 * - Maintenance log table with filters
 * - Create / edit / start / complete log modals
 * - Ground / unground aircraft
 * - Aircraft maintenance history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import MaintenanceStatusBadge from '../../components/maintenance/MaintenanceStatusBadge';
import AircraftCard from '../../components/maintenance/AircraftCard';
import MaintenanceLogForm from '../../components/maintenance/MaintenanceLogForm';
import CompleteMaintenanceForm from '../../components/maintenance/CompleteMaintenanceForm';
import MaintenanceLogDetail from '../../components/maintenance/MaintenanceLogDetail';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/helpers';
import {
  FiTool, FiPlus, FiEdit2, FiEye, FiPlay, FiCheckCircle,
  FiAlertTriangle, FiRefreshCw, FiSearch, FiZapOff, FiZap,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const TABS = ['Logs', 'Fleet Status'];

const STATUS_TABS = [
  { value: '',            label: 'All' },
  { value: 'scheduled',   label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'overdue',     label: 'Overdue' },
  { value: 'completed',   label: 'Completed' },
];

const PRIORITY_COLORS = {
  low:      'bg-blue-500/10 text-blue-400',
  normal:   'bg-dark-700 text-dark-400',
  high:     'bg-orange-500/10 text-orange-400',
  critical: 'bg-red-500/10 text-red-400',
};

export default function MaintenanceDashboard() {
  const { user } = useSelector((s) => s.auth);
  const isAdmin = ['super_admin', 'airport_admin'].includes(user?.role);

  // ── State ──────────────────────────────────────────────────────────────────
  const [tab,          setTab]          = useState(0);
  const [logs,         setLogs]         = useState([]);
  const [dueAircraft,  setDueAircraft]  = useState([]);
  const [allAircraft,  setAllAircraft]  = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(1);
  const [pages,        setPages]        = useState(1);
  const [total,        setTotal]        = useState(0);

  // Filters
  const [statusFilter,  setStatusFilter]  = useState('');
  const [typeFilter,    setTypeFilter]    = useState('');
  const [priorityFilter,setPriorityFilter]= useState('');
  const [search,        setSearch]        = useState('');

  // Modals
  const [createModal,   setCreateModal]   = useState(false);
  const [editModal,     setEditModal]     = useState(null);
  const [detailModal,   setDetailModal]   = useState(null);
  const [completeModal, setCompleteModal] = useState(null);
  const [historyModal,  setHistoryModal]  = useState(null);
  const [groundModal,   setGroundModal]   = useState(null);
  const [groundReason,  setGroundReason]  = useState('');
  const [ungroundTarget,setUngroundTarget]= useState(null);
  const [historyData,   setHistoryData]   = useState(null);
  const [submitting,    setSubmitting]    = useState(false);

  // ── Fetch logs ─────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter)   params.status   = statusFilter;
      if (typeFilter)     params.type     = typeFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const { data } = await api.get('/maintenance', { params });
      setLogs(data.logs || []);
      setPages(data.pages);
      setTotal(data.total);
    } catch { toast.error('Failed to load maintenance logs'); }
    finally { setLoading(false); }
  }, [page, statusFilter, typeFilter, priorityFilter]);

  // ── Fetch stats + due aircraft ─────────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const [statsRes, dueRes, acRes] = await Promise.all([
        api.get('/maintenance/stats'),
        api.get('/maintenance/due?days=14'),
        api.get('/aircraft?limit=100'),
      ]);
      setStats(statsRes.data.stats);
      setDueAircraft(dueRes.data.aircraft || []);
      setAllAircraft(acRes.data.aircraft || []);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Create log ─────────────────────────────────────────────────────────────
  const handleCreate = async (formData) => {
    setSubmitting(true);
    try {
      await api.post('/maintenance', formData);
      toast.success('Maintenance log created. Aircraft set to maintenance status.');
      setCreateModal(false);
      fetchLogs();
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Create failed'); }
    finally { setSubmitting(false); }
  };

  // ── Edit log ───────────────────────────────────────────────────────────────
  const handleEdit = async (formData) => {
    setSubmitting(true);
    try {
      await api.put(`/maintenance/${editModal._id}`, formData);
      toast.success('Maintenance log updated');
      setEditModal(null);
      fetchLogs();
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setSubmitting(false); }
  };

  // ── Start maintenance ──────────────────────────────────────────────────────
  const handleStart = async (id) => {
    try {
      await api.patch(`/maintenance/${id}/start`);
      toast.success('Maintenance started');
      fetchLogs();
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  // ── Complete maintenance ───────────────────────────────────────────────────
  const handleComplete = async (formData) => {
    setSubmitting(true);
    try {
      await api.patch(`/maintenance/${completeModal._id}/complete`, formData);
      toast.success('Maintenance completed. Aircraft returned to available.');
      setCompleteModal(null);
      fetchLogs();
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Complete failed'); }
    finally { setSubmitting(false); }
  };

  // ── Ground aircraft ────────────────────────────────────────────────────────
  const handleGround = async () => {
    if (!groundReason.trim() || groundReason.length < 10) {
      toast.error('Grounding reason must be at least 10 characters');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/maintenance/aircraft/${groundModal._id}/ground`, { reason: groundReason });
      toast.success(`Aircraft ${groundModal.registrationNumber} grounded`);
      setGroundModal(null);
      setGroundReason('');
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  // ── Unground aircraft ──────────────────────────────────────────────────────
  const handleUnground = async () => {
    setSubmitting(true);
    try {
      await api.post(`/maintenance/aircraft/${ungroundTarget._id}/unground`);
      toast.success(`Aircraft ${ungroundTarget.registrationNumber} ungrounded`);
      setUngroundTarget(null);
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  // ── Aircraft history ───────────────────────────────────────────────────────
  const loadHistory = async (aircraft) => {
    try {
      const { data } = await api.get(`/maintenance/aircraft/${aircraft._id}`);
      setHistoryData(data);
      setHistoryModal(aircraft);
    } catch { toast.error('Failed to load history'); }
  };

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchLogs(); };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <PageHeader
        title="Maintenance Dashboard"
        subtitle="Aircraft maintenance scheduling and tracking"
        actions={
          <div className="flex gap-2">
            <button onClick={() => { fetchLogs(); fetchStats(); }} className="btn-secondary btn-sm">
              <FiRefreshCw size={14} /> Refresh
            </button>
            <button onClick={() => setCreateModal(true)} className="btn-primary btn-sm">
              <FiPlus size={15} /> New Log
            </button>
          </div>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Logs"      value={stats.logs.total}              icon={FiTool}         color="blue" />
          <StatCard title="In Progress"     value={stats.logs.byStatus?.in_progress ?? 0} icon={FiPlay} color="amber" />
          <StatCard title="Overdue"         value={stats.logs.byStatus?.overdue ?? 0}     icon={FiAlertTriangle} color="red" />
          <StatCard title="In Maintenance"  value={stats.aircraft.inMaintenance}  icon={FiZapOff}       color="orange" />
        </div>
      )}

      {/* Due aircraft alert */}
      {dueAircraft.filter((a) => a.status !== 'maintenance' && a.status !== 'grounded').length > 0 && (
        <div className="card border-amber-700/30 bg-amber-900/10">
          <div className="flex items-center gap-2 mb-3">
            <FiAlertTriangle size={16} className="text-amber-400" />
            <p className="font-semibold text-amber-400 text-sm">
              {dueAircraft.filter((a) => a.status !== 'maintenance' && a.status !== 'grounded').length} Aircraft Due for Maintenance (within 14 days)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {dueAircraft
              .filter((a) => a.status !== 'maintenance' && a.status !== 'grounded')
              .map((a) => (
                <div key={a._id} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                  <span className="font-mono text-amber-300 text-sm font-semibold">{a.registrationNumber}</span>
                  <span className="text-amber-500 text-2xs">{a.model}</span>
                  {a.nextMaintenanceDue && (
                    <span className="text-amber-600 text-2xs">Due: {formatDate(a.nextMaintenanceDue)}</span>
                  )}
                </div>
              ))}
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
          </button>
        ))}
      </div>

      {/* ── Tab 0: Logs ───────────────────────────────────────────────────── */}
      {tab === 0 && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
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
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="input w-36">
              <option value="">All types</option>
              {['routine','inspection','repair','overhaul','emergency'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className="input w-36">
              <option value="">All priorities</option>
              {['low','normal','high','critical'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
          ) : logs.length === 0 ? (
            <EmptyState
              title="No maintenance logs found"
              description="Create a new log to start tracking maintenance"
              icon={FiTool}
              action={<button onClick={() => setCreateModal(true)} className="btn-primary btn-sm"><FiPlus size={13} /> New Log</button>}
            />
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Aircraft</th>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Priority</th>
                      <th>Scheduled</th>
                      <th>Status</th>
                      <th>Cost</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log._id}
                        className={
                          log.status === 'overdue'     ? 'border-l-2 border-l-red-500' :
                          log.status === 'in_progress' ? 'border-l-2 border-l-amber-500' :
                          log.priority === 'critical'  ? 'border-l-2 border-l-red-400' : ''
                        }
                      >
                        <td>
                          <p className="font-mono font-semibold text-dark-100">{log.aircraft?.registrationNumber}</p>
                          <p className="text-2xs text-dark-400">{log.aircraft?.model}</p>
                        </td>
                        <td>
                          <p className="text-dark-200 text-sm font-medium max-w-[180px] truncate">{log.title}</p>
                          {log.assignedTo && (
                            <p className="text-2xs text-dark-500">
                              {log.assignedTo.firstName} {log.assignedTo.lastName}
                            </p>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-dark-700 text-dark-300 text-2xs capitalize">{log.type}</span>
                        </td>
                        <td>
                          <span className={`badge text-2xs capitalize ${PRIORITY_COLORS[log.priority] ?? ''}`}>
                            {log.priority}
                          </span>
                        </td>
                        <td className="text-dark-300 text-sm">{formatDate(log.scheduledDate)}</td>
                        <td><MaintenanceStatusBadge status={log.status} /></td>
                        <td className="text-dark-300 text-sm">
                          {log.totalCost > 0 ? formatCurrency(log.totalCost) : '—'}
                        </td>
                        <td>
                          <div className="flex gap-0.5">
                            <button onClick={() => setDetailModal(log)} className="btn-icon btn-ghost text-dark-400 hover:text-dark-200" title="View">
                              <FiEye size={13} />
                            </button>
                            {['scheduled', 'overdue'].includes(log.status) && (
                              <button onClick={() => handleStart(log._id)} className="btn-icon btn-ghost text-amber-400 hover:text-amber-300" title="Start">
                                <FiPlay size={13} />
                              </button>
                            )}
                            {log.status === 'in_progress' && (
                              <button onClick={() => setCompleteModal(log)} className="btn-icon btn-ghost text-emerald-400 hover:text-emerald-300" title="Complete">
                                <FiCheckCircle size={13} />
                              </button>
                            )}
                            {['scheduled', 'overdue', 'in_progress'].includes(log.status) && (
                              <button onClick={() => setEditModal(log)} className="btn-icon btn-ghost text-primary-400 hover:text-primary-300" title="Edit">
                                <FiEdit2 size={13} />
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

      {/* ── Tab 1: Fleet Status ────────────────────────────────────────────── */}
      {tab === 1 && (
        <div className="space-y-4">
          {/* Fleet summary */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                ['Available',   stats.aircraft.byStatus?.available   ?? 0, 'text-emerald-400'],
                ['Assigned',    stats.aircraft.byStatus?.assigned    ?? 0, 'text-blue-400'],
                ['Maintenance', stats.aircraft.byStatus?.maintenance ?? 0, 'text-amber-400'],
                ['Grounded',    stats.aircraft.byStatus?.grounded    ?? 0, 'text-red-400'],
                ['Retired',     stats.aircraft.byStatus?.retired     ?? 0, 'text-dark-400'],
              ].map(([label, value, color]) => (
                <div key={label} className="card text-center py-3">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-2xs text-dark-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Aircraft grid */}
          {allAircraft.length === 0 ? (
            <EmptyState title="No aircraft found" icon={FiTool} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allAircraft.map((aircraft) => (
                <div key={aircraft._id} className="relative">
                  <AircraftCard
                    aircraft={aircraft}
                    onClick={() => loadHistory(aircraft)}
                  />
                  {/* Ground / unground button */}
                  {isAdmin && (
                    <div className="absolute top-3 right-3">
                      {aircraft.status === 'grounded' ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setUngroundTarget(aircraft); }}
                          className="btn-success btn-sm text-2xs py-1 px-2"
                          title="Unground aircraft"
                        >
                          <FiZap size={11} /> Unground
                        </button>
                      ) : aircraft.status !== 'maintenance' && aircraft.status !== 'retired' ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setGroundModal(aircraft); setGroundReason(''); }}
                          className="btn-danger btn-sm text-2xs py-1 px-2"
                          title="Ground aircraft"
                        >
                          <FiZapOff size={11} /> Ground
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create Modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Maintenance Log" size="xl">
        <MaintenanceLogForm
          allAircraft={allAircraft}
          onSubmit={handleCreate}
          onCancel={() => setCreateModal(false)}
          loading={submitting}
        />
      </Modal>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title={`Edit Log — ${editModal?.title}`} size="xl">
        {editModal && (
          <MaintenanceLogForm
            initialData={editModal}
            aircraft={editModal.aircraft}
            allAircraft={allAircraft}
            onSubmit={handleEdit}
            onCancel={() => setEditModal(null)}
            loading={submitting}
          />
        )}
      </Modal>

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Maintenance Log Details" size="lg">
        <MaintenanceLogDetail log={detailModal} />
      </Modal>

      {/* ── Complete Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={!!completeModal} onClose={() => setCompleteModal(null)} title={`Complete — ${completeModal?.title}`} size="md">
        {completeModal && (
          <CompleteMaintenanceForm
            log={completeModal}
            onSubmit={handleComplete}
            onCancel={() => setCompleteModal(null)}
            loading={submitting}
          />
        )}
      </Modal>

      {/* ── Aircraft History Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={!!historyModal}
        onClose={() => { setHistoryModal(null); setHistoryData(null); }}
        title={`Maintenance History — ${historyModal?.registrationNumber}`}
        size="lg"
      >
        {historyData && (
          <div className="space-y-4">
            {/* Aircraft info */}
            <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-xl border border-dark-600">
              <div>
                <p className="font-mono font-bold text-dark-100">{historyData.aircraft?.registrationNumber}</p>
                <p className="text-xs text-dark-400">{historyData.aircraft?.model} · {historyData.aircraft?.airline?.name}</p>
              </div>
              <div className="text-right">
                <MaintenanceStatusBadge status={historyData.aircraft?.status} type="aircraft" />
                <p className="text-2xs text-dark-500 mt-1">{historyData.aircraft?.totalFlightHours?.toLocaleString()}h total</p>
              </div>
            </div>

            {/* Log list */}
            {historyData.logs?.length === 0 ? (
              <p className="text-center text-dark-400 py-8">No maintenance history</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {historyData.logs.map((log) => (
                  <div key={log._id} className="flex items-start justify-between gap-3 p-3 bg-dark-700/40 rounded-xl border border-dark-600">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark-100 truncate">{log.title}</p>
                      <p className="text-2xs text-dark-400 mt-0.5">
                        {log.type} · {formatDate(log.scheduledDate)}
                        {log.actualHours && ` · ${log.actualHours}h`}
                        {log.totalCost > 0 && ` · ${formatCurrency(log.totalCost)}`}
                      </p>
                    </div>
                    <MaintenanceStatusBadge status={log.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Ground Modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={!!groundModal} onClose={() => setGroundModal(null)} title={`Ground Aircraft — ${groundModal?.registrationNumber}`} size="sm">
        <div className="space-y-4">
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-xs text-red-400">
              Grounding this aircraft will prevent it from being assigned to any flights until it is ungrounded.
            </p>
          </div>
          <div>
            <label className="label">Grounding Reason <span className="text-red-400">*</span></label>
            <textarea
              value={groundReason}
              onChange={(e) => setGroundReason(e.target.value)}
              className="input"
              rows={3}
              placeholder="Provide a detailed reason for grounding (min 10 characters)…"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleGround} disabled={submitting} className="btn-danger flex-1 justify-center">
              {submitting ? <><LoadingSpinner size="sm" /> Grounding…</> : <><FiZapOff size={14} /> Ground Aircraft</>}
            </button>
            <button onClick={() => setGroundModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* ── Unground Confirm ───────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!ungroundTarget}
        onClose={() => setUngroundTarget(null)}
        onConfirm={handleUnground}
        loading={submitting}
        title={`Unground ${ungroundTarget?.registrationNumber}?`}
        message="This will return the aircraft to Available status and allow it to be assigned to flights."
        confirmLabel="Unground Aircraft"
        danger={false}
      />
    </div>
  );
}
