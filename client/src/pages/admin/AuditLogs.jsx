/**
 * AuditLogs.jsx
 * Immutable audit trail viewer — every admin/staff action is logged here.
 * Filterable by module, action, actor, and date range.
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import { formatDateTime, ROLE_LABELS } from '../../utils/helpers';
import { FiList, FiRefreshCw, FiSearch } from 'react-icons/fi';

const MODULES = [
  '', 'Flight', 'Booking', 'User', 'Airport', 'Airline', 'Aircraft',
  'Maintenance', 'Security', 'Baggage', 'CheckIn', 'Boarding',
  'Complaint', 'Staff', 'CrewAssignment',
];

const ACTIONS = [
  '', 'CREATE', 'UPDATE', 'DELETE', 'STATUS_UPDATE', 'CANCEL',
  'CHECKIN', 'BOARD', 'CLOSE_BOARDING', 'SECURITY_CHECK',
  'RESTRICTED_ITEM', 'SECURITY_INCIDENT', 'BOARDING_OVERRIDE',
  'REPORT_LOST', 'MARK_FOUND', 'FILE_COMPLAINT', 'UPDATE_COMPLAINT',
  'GROUND', 'UNGROUND', 'START', 'COMPLETE', 'RESCHEDULE',
  'GATE_CHANGE', 'FEE_PAID',
];

const ACTION_COLORS = {
  CREATE:           'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  UPDATE:           'bg-blue-500/10 text-blue-400 border-blue-500/20',
  DELETE:           'bg-red-500/10 text-red-400 border-red-500/20',
  STATUS_UPDATE:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CANCEL:           'bg-orange-500/10 text-orange-400 border-orange-500/20',
  CHECKIN:          'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  BOARD:            'bg-purple-500/10 text-purple-400 border-purple-500/20',
  CLOSE_BOARDING:   'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  SECURITY_CHECK:   'bg-rose-500/10 text-rose-400 border-rose-500/20',
  BOARDING_OVERRIDE:'bg-purple-500/10 text-purple-400 border-purple-500/20',
  GROUND:           'bg-red-500/10 text-red-400 border-red-500/20',
  UNGROUND:         'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  COMPLETE:         'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  RESCHEDULE:       'bg-blue-500/10 text-blue-400 border-blue-500/20',
  GATE_CHANGE:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function AuditLogs() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [total,   setTotal]   = useState(0);
  const [filters, setFilters] = useState({ module: '', action: '', search: '' });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (filters.module) params.module = filters.module;
      if (filters.action) params.action = filters.action;
      const { data } = await api.get('/reports/audit', { params });
      setLogs(data.logs || []);
      setPages(data.pages);
      setTotal(data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, filters.module, filters.action]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const setFilter = (field) => (e) => {
    setFilters((f) => ({ ...f, [field]: e.target.value }));
    setPage(1);
  };

  // Client-side search filter
  const filtered = filters.search
    ? logs.filter((l) =>
        l.actorName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        l.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        l.module?.toLowerCase().includes(filters.search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Logs"
        subtitle={`${total.toLocaleString()} total entries`}
        actions={
          <button onClick={fetchLogs} className="btn-secondary btn-sm">
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
          <input
            value={filters.search}
            onChange={setFilter('search')}
            className="input pl-8 w-52"
            placeholder="Search actor, description…"
          />
        </div>

        {/* Module */}
        <select value={filters.module} onChange={setFilter('module')} className="input w-44">
          {MODULES.map((m) => <option key={m} value={m}>{m || 'All Modules'}</option>)}
        </select>

        {/* Action */}
        <select value={filters.action} onChange={setFilter('action')} className="input w-48">
          {ACTIONS.map((a) => <option key={a} value={a}>{a || 'All Actions'}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No audit logs found" description="Try adjusting your filters" icon={FiList} />
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log._id}>
                    <td className="text-dark-400 text-xs whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td>
                      <p className="text-dark-200 text-sm font-medium">{log.actorName}</p>
                      <p className="text-dark-600 text-2xs">{log.actor?.email}</p>
                    </td>
                    <td>
                      <span className="badge bg-dark-700 text-dark-300 border-dark-600 text-2xs capitalize">
                        {ROLE_LABELS[log.actorRole] || log.actorRole}
                      </span>
                    </td>
                    <td>
                      <span className={`badge text-2xs border ${ACTION_COLORS[log.action] ?? 'bg-dark-700 text-dark-400 border-dark-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="text-dark-300 text-sm">{log.module}</td>
                    <td className="text-dark-400 text-xs max-w-[240px] truncate" title={log.description}>
                      {log.description}
                    </td>
                    <td>
                      <span className={`badge text-2xs border ${
                        log.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
