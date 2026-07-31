/**
 * TopBar.jsx
 * Dashboard top navigation bar with notification bell dropdown.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FiMenu, FiBell, FiUser, FiLogOut, FiChevronDown, FiCheck, FiCheckSquare } from 'react-icons/fi';
import { logout } from '../../store/slices/authSlice';
import { markRead, markAllRead } from '../../store/slices/notificationSlice';
import { ROLE_LABELS, getInitials, timeAgo } from '../../utils/helpers';
import api from '../../services/api';

// Notification type icons
const TYPE_ICONS = {
  booking_confirmed: '✅', booking_cancelled: '❌',
  payment_success: '💳',   payment_failed: '⚠️',
  flight_delayed: '⏰',    flight_cancelled: '🚫',
  gate_change: '🚪',       boarding_open: '✈️',
  baggage_claim: '🧳',     refund_processed: '💰',
  checkin_open: '📋',      security_alert: '🔒',
  maintenance_due: '🔧',   conflict_alert: '🚨',
  system: '📢',
};

export default function TopBar({ onMenuClick }) {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { user }  = useSelector((s) => s.auth);
  const { items, unreadCount } = useSelector((s) => s.notifications);

  const [notifOpen,   setNotifOpen]   = useState(false);
  const [dropdownOpen,setDropdownOpen]= useState(false);
  const notifRef   = useRef(null);
  const dropdownRef= useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current    && !notifRef.current.contains(e.target))    setNotifOpen(false);
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { dispatch(logout()); navigate('/'); };

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
    } catch { /* silent */ }
  };

  const notifPath = user?.role === 'passenger'
    ? '/passenger/notifications'
    : ['super_admin', 'airport_admin'].includes(user?.role)
    ? '/admin/notifications'
    : '/staff/notifications';

  const recentNotifs = items.slice(0, 5);

  return (
    <header className="h-16 bg-dark-900 border-b border-dark-700/80 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-20">
      {/* Hamburger */}
      <button onClick={onMenuClick} className="btn-icon btn-ghost text-dark-400 hover:text-dark-100" aria-label="Toggle sidebar">
        <FiMenu size={20} />
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-2">

        {/* ── Notification bell ──────────────────────────────────────────── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen((v) => !v); setDropdownOpen(false); }}
            className="relative btn-icon btn-ghost text-dark-400 hover:text-dark-100"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <FiBell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-2xs flex items-center justify-center font-bold px-0.5 animate-pulse-soft">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-700 rounded-2xl shadow-card-lg z-50 overflow-hidden animate-slide-down">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
                <p className="text-sm font-semibold text-dark-100">
                  Notifications {unreadCount > 0 && <span className="text-primary-400">({unreadCount})</span>}
                </p>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-2xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                    <FiCheckSquare size={11} /> Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto">
                {recentNotifs.length === 0 ? (
                  <div className="text-center py-8">
                    <FiBell size={24} className="text-dark-600 mx-auto mb-2" />
                    <p className="text-dark-500 text-xs">No notifications</p>
                  </div>
                ) : (
                  recentNotifs.map((n) => (
                    <div
                      key={n._id}
                      className={`flex items-start gap-2.5 px-4 py-3 border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors ${!n.isRead ? 'bg-primary-900/10' : ''}`}
                    >
                      <span className="text-base flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? '🔔'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${n.isRead ? 'text-dark-300' : 'text-dark-100'}`}>
                          {n.title}
                        </p>
                        <p className="text-2xs text-dark-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-2xs text-dark-600 mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n._id)}
                          className="flex-shrink-0 text-primary-400 hover:text-primary-300 mt-0.5"
                          title="Mark read"
                        >
                          <FiCheck size={12} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-dark-700">
                <Link
                  to={notifPath}
                  onClick={() => setNotifOpen(false)}
                  className="text-xs text-primary-400 hover:text-primary-300 w-full text-center block"
                >
                  View all notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-dark-700 mx-1" />

        {/* ── User dropdown ──────────────────────────────────────────────── */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => { setDropdownOpen((v) => !v); setNotifOpen(false); }}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1.5 rounded-lg hover:bg-dark-700/60 transition-colors"
            aria-expanded={dropdownOpen}
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.avatar
                ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                : getInitials(user?.firstName, user?.lastName)
              }
            </div>
            <div className="hidden sm:block text-left leading-none">
              <p className="text-sm font-medium text-dark-100 truncate max-w-[120px]">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-2xs text-dark-500 mt-0.5">{ROLE_LABELS[user?.role] ?? user?.role}</p>
            </div>
            <FiChevronDown size={14} className={`text-dark-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-dark-800 border border-dark-700 rounded-xl shadow-card-lg z-50 overflow-hidden animate-slide-down">
              <div className="px-4 py-3 border-b border-dark-700">
                <p className="text-sm font-semibold text-dark-100 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-dark-500 truncate mt-0.5">{user?.email}</p>
              </div>
              <div className="py-1">
                {user?.role === 'passenger' && (
                  <Link to="/passenger/profile" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-300 hover:text-dark-100 hover:bg-dark-700/60 transition-colors">
                    <FiUser size={14} /> My Profile
                  </Link>
                )}
                <Link to={notifPath} onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-300 hover:text-dark-100 hover:bg-dark-700/60 transition-colors">
                  <FiBell size={14} />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-2xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                </Link>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                  <FiLogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
