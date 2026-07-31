/**
 * Notifications.jsx
 * Universal notification center — works for passengers, staff, and admins.
 * Features: real-time via Socket.IO, filter by type/read state,
 * mark read, bulk clear, admin broadcast panel.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import {
  setNotifications,
  markRead,
  markAllRead,
  removeNotification,
  clearNotifications,
} from '../../store/slices/notificationSlice';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { timeAgo, formatDateTime } from '../../utils/helpers';
import {
  FiBell, FiCheck, FiCheckSquare, FiTrash2,
  FiRefreshCw, FiFilter, FiSend, FiAlertTriangle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// ── Notification type metadata ────────────────────────────────────────────────
const TYPE_META = {
  booking_confirmed: { icon: '✅', label: 'Booking',   color: 'border-emerald-500/20 bg-emerald-900/10', priority: 'normal' },
  booking_cancelled: { icon: '❌', label: 'Booking',   color: 'border-red-500/20 bg-red-900/10',         priority: 'high' },
  payment_success:   { icon: '💳', label: 'Payment',   color: 'border-emerald-500/20 bg-emerald-900/10', priority: 'normal' },
  payment_failed:    { icon: '⚠️', label: 'Payment',   color: 'border-red-500/20 bg-red-900/10',         priority: 'high' },
  flight_delayed:    { icon: '⏰', label: 'Flight',    color: 'border-orange-500/20 bg-orange-900/10',   priority: 'high' },
  flight_cancelled:  { icon: '🚫', label: 'Flight',    color: 'border-red-500/20 bg-red-900/10',         priority: 'urgent' },
  gate_change:       { icon: '🚪', label: 'Gate',      color: 'border-blue-500/20 bg-blue-900/10',       priority: 'urgent' },
  boarding_open:     { icon: '✈️', label: 'Boarding',  color: 'border-amber-500/20 bg-amber-900/10',     priority: 'high' },
  baggage_claim:     { icon: '🧳', label: 'Baggage',   color: 'border-cyan-500/20 bg-cyan-900/10',       priority: 'normal' },
  refund_processed:  { icon: '💰', label: 'Refund',    color: 'border-emerald-500/20 bg-emerald-900/10', priority: 'normal' },
  checkin_open:      { icon: '📋', label: 'Check-in',  color: 'border-blue-500/20 bg-blue-900/10',       priority: 'normal' },
  security_alert:    { icon: '🔒', label: 'Security',  color: 'border-rose-500/20 bg-rose-900/10',       priority: 'urgent' },
  maintenance_due:   { icon: '🔧', label: 'Maintenance',color: 'border-amber-500/20 bg-amber-900/10',   priority: 'high' },
  conflict_alert:    { icon: '🚨', label: 'Alert',     color: 'border-red-500/20 bg-red-900/10',         priority: 'urgent' },
  system:            { icon: '📢', label: 'System',    color: 'border-dark-600 bg-dark-800',             priority: 'normal' },
};

const PRIORITY_COLORS = {
  urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
  high:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  normal: 'bg-dark-700 text-dark-400 border-dark-600',
  low:    'bg-dark-700 text-dark-500 border-dark-600',
};

// ── Type filter options ───────────────────────────────────────────────────────
const TYPE_FILTERS = [
  { value: '',                  label: 'All Types' },
  { value: 'booking_confirmed', label: 'Bookings' },
  { value: 'flight_delayed',    label: 'Delays' },
  { value: 'flight_cancelled',  label: 'Cancellations' },
  { value: 'gate_change',       label: 'Gate Changes' },
  { value: 'boarding_open',     label: 'Boarding' },
  { value: 'baggage_claim',     label: 'Baggage' },
  { value: 'security_alert',    label: 'Security' },
  { value: 'conflict_alert',    label: 'Alerts' },
  { value: 'system',            label: 'System' },
];

export default function NotificationsCenter() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { items, unreadCount } = useSelector((s) => s.notifications);

  const [readFilter,  setReadFilter]  = useState('all');
  const [typeFilter,  setTypeFilter]  = useState('');
  const [loading,     setLoading]     = useState(false);
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastForm,  setBroadcastForm]  = useState({ title: '', message: '', targetRole: '', priority: 'normal' });
  const [broadcasting,   setBroadcasting]   = useState(false);

  const isAdmin = ['super_admin', 'airport_admin'].includes(user?.role);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get('/notifications', { params });
      dispatch(setNotifications({
        notifications: data.notifications || [],
        unreadCount:   data.unreadCount   ?? 0,
      }));
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      dispatch(markRead(id));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      dispatch(markAllRead());
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      dispatch(removeNotification(id));
    } catch { toast.error('Failed to delete'); }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all notifications? This cannot be undone.')) return;
    try {
      await api.delete('/notifications');
      dispatch(clearNotifications());
      toast.success('All notifications cleared');
    } catch { toast.error('Failed to clear'); }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) {
      toast.error('Title and message are required');
      return;
    }
    setBroadcasting(true);
    try {
      const { data } = await api.post('/notifications/broadcast', broadcastForm);
      toast.success(`Broadcast sent to ${data.count} user(s)`);
      setBroadcastModal(false);
      setBroadcastForm({ title: '', message: '', targetRole: '', priority: 'normal' });
    } catch (err) { toast.error(err.response?.data?.message || 'Broadcast failed'); }
    finally { setBroadcasting(false); }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = items.filter((n) => {
    const readMatch = readFilter === 'all' ? true : readFilter === 'unread' ? !n.isRead : n.isRead;
    const typeMatch = !typeFilter || n.type === typeFilter;
    return readMatch && typeMatch;
  });

  const urgentCount = items.filter((n) => !n.isRead && ['urgent', 'high'].includes(n.priority)).length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        actions={
          <div className="flex gap-2">
            <button onClick={fetchNotifications} className="btn-secondary btn-sm">
              <FiRefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="btn-secondary btn-sm">
                <FiCheckSquare size={13} /> Mark all read
              </button>
            )}
            {items.length > 0 && (
              <button onClick={handleClearAll} className="btn-secondary btn-sm text-red-400 hover:text-red-300">
                <FiTrash2 size={13} /> Clear all
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setBroadcastModal(true)} className="btn-primary btn-sm">
                <FiSend size={13} /> Broadcast
              </button>
            )}
          </div>
        }
      />

      {/* Urgent alert banner */}
      {urgentCount > 0 && (
        <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in">
          <FiAlertTriangle size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 font-medium">
            {urgentCount} urgent notification{urgentCount > 1 ? 's' : ''} require your attention
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Read state */}
        <div className="flex gap-1">
          {[
            { value: 'all',    label: `All (${items.length})` },
            { value: 'unread', label: `Unread (${unreadCount})` },
            { value: 'read',   label: 'Read' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setReadFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                readFilter === value ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-400 hover:text-dark-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input w-40 text-xs"
        >
          {TYPE_FILTERS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Notification list */}
      {loading && items.length === 0 ? (
        <div className="flex justify-center py-10"><LoadingSpinner size="md" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={readFilter === 'unread' ? 'No unread notifications' : 'No notifications'}
          description="You're all caught up!"
          icon={FiBell}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const meta = TYPE_META[n.type] ?? { icon: '🔔', color: '', label: 'Notification' };
            const isUrgent = n.priority === 'urgent' || n.priority === 'high';

            return (
              <div
                key={n._id}
                className={`card flex items-start gap-3 transition-all ${
                  !n.isRead ? `${meta.color} border-l-2 border-l-primary-500` : 'opacity-70'
                } ${isUrgent && !n.isRead ? 'ring-1 ring-red-500/20' : ''}`}
              >
                {/* Icon */}
                <div className="text-xl flex-shrink-0 mt-0.5 select-none">{meta.icon}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className={`text-sm font-semibold leading-snug ${n.isRead ? 'text-dark-300' : 'text-dark-100'}`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {n.priority && n.priority !== 'normal' && (
                        <span className={`badge text-2xs border ${PRIORITY_COLORS[n.priority] ?? ''}`}>
                          {n.priority}
                        </span>
                      )}
                      <span className="badge bg-dark-700 text-dark-500 border-dark-600 text-2xs">
                        {meta.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-dark-400 leading-relaxed">{n.message}</p>

                  {/* Deep link */}
                  {n.booking && (
                    <Link
                      to={`/passenger/bookings/${n.booking}`}
                      className="text-2xs text-primary-400 hover:text-primary-300 mt-1 inline-block"
                      onClick={() => handleMarkRead(n._id)}
                    >
                      View booking →
                    </Link>
                  )}

                  <p className="text-2xs text-dark-600 mt-1.5" title={formatDateTime(n.createdAt)}>
                    {timeAgo(n.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-0.5 flex-shrink-0">
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n._id)}
                      className="btn-icon btn-ghost text-primary-400 hover:text-primary-300"
                      title="Mark as read"
                    >
                      <FiCheck size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n._id)}
                    className="btn-icon btn-ghost text-dark-500 hover:text-red-400"
                    title="Delete"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Admin Broadcast Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={broadcastModal}
        onClose={() => setBroadcastModal(false)}
        title="Broadcast Notification"
        size="md"
      >
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-xs text-amber-400">
              This will send a notification to all matching users in real time via Socket.IO.
            </p>
          </div>

          <div>
            <label className="label">Title <span className="text-red-400">*</span></label>
            <input
              value={broadcastForm.title}
              onChange={(e) => setBroadcastForm((f) => ({ ...f, title: e.target.value }))}
              className="input"
              placeholder="e.g. System Maintenance Notice"
              required
            />
          </div>

          <div>
            <label className="label">Message <span className="text-red-400">*</span></label>
            <textarea
              value={broadcastForm.message}
              onChange={(e) => setBroadcastForm((f) => ({ ...f, message: e.target.value }))}
              className="input"
              rows={3}
              placeholder="Notification message…"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Target Role</label>
              <select
                value={broadcastForm.targetRole}
                onChange={(e) => setBroadcastForm((f) => ({ ...f, targetRole: e.target.value }))}
                className="input"
              >
                <option value="">All Users</option>
                <option value="passenger">Passengers</option>
                <option value="checkin_staff">Check-in Staff</option>
                <option value="boarding_staff">Boarding Staff</option>
                <option value="baggage_staff">Baggage Staff</option>
                <option value="security_officer">Security Officers</option>
                <option value="maintenance_staff">Maintenance Staff</option>
                <option value="airline_manager">Airline Managers</option>
                <option value="airport_admin">Airport Admins</option>
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                value={broadcastForm.priority}
                onChange={(e) => setBroadcastForm((f) => ({ ...f, priority: e.target.value }))}
                className="input"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={broadcasting} className="btn-primary flex-1 justify-center">
              {broadcasting ? <><LoadingSpinner size="sm" /> Sending…</> : <><FiSend size={14} /> Send Broadcast</>}
            </button>
            <button type="button" onClick={() => setBroadcastModal(false)} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
