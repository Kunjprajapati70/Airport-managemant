/**
 * helpers.js
 * Pure utility functions used across the entire frontend.
 * No React imports — safe to use anywhere.
 */

import { format, formatDistanceToNow, isValid } from 'date-fns';

// ── Date / Time ───────────────────────────────────────────────────────────────

export const formatDate = (date, fmt = 'MMM dd, yyyy') => {
  if (!date) return '—';
  const d = new Date(date);
  return isValid(d) ? format(d, fmt) : '—';
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return isValid(d) ? format(d, 'MMM dd, yyyy · HH:mm') : '—';
};

export const formatTime = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return isValid(d) ? format(d, 'HH:mm') : '—';
};

export const formatDateShort = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return isValid(d) ? format(d, 'dd MMM') : '—';
};

export const timeAgo = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '—';
};

export const getFlightDuration = (dep, arr) => {
  if (!dep || !arr) return '—';
  const diff = new Date(arr) - new Date(dep);
  if (diff <= 0) return '—';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ── Currency ──────────────────────────────────────────────────────────────────

export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (n) => {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-US').format(n);
};

// ── Status → CSS class ────────────────────────────────────────────────────────

const STATUS_CLASS_MAP = {
  // Flight
  scheduled:   'status-scheduled',
  boarding:    'status-boarding',
  departed:    'status-departed',
  in_flight:   'status-in_flight',
  arrived:     'status-arrived',
  delayed:     'status-delayed',
  cancelled:   'status-cancelled',
  diverted:    'status-diverted',
  // Booking / payment
  confirmed:   'status-confirmed',
  pending:     'status-pending',
  completed:   'status-completed',
  no_show:     'status-no_show',
  paid:        'status-paid',
  refunded:    'status-refunded',
  failed:      'status-failed',
  partially_refunded: 'status-partially_refunded',
  // Check-in
  not_checked_in: 'status-not_checked_in',
  checked_in:  'status-checked_in',
  boarded:     'status-boarded',
  // Security
  cleared:     'status-cleared',
  flagged:     'status-flagged',
  rejected:    'status-rejected',
  // Baggage
  registered:       'status-registered',
  security_scanned: 'status-security_scanned',
  loaded:           'status-loaded',
  in_transit:       'status-in_transit',
  claimed:          'status-claimed',
  missing:          'status-missing',
  lost:             'status-lost',
  // Aircraft
  available:   'status-available',
  assigned:    'status-assigned',
  maintenance: 'status-maintenance',
  grounded:    'status-grounded',
  retired:     'status-retired',
  // Maintenance
  in_progress: 'status-in_progress',
  overdue:     'status-overdue',
  // Generic
  active:      'status-active',
  inactive:    'status-inactive',
};

export const getStatusClass = (status) =>
  STATUS_CLASS_MAP[status] ?? 'badge bg-dark-700 text-dark-400 border border-dark-600';

// ── Role labels ───────────────────────────────────────────────────────────────

export const ROLE_LABELS = {
  super_admin:       'Super Admin',
  airport_admin:     'Airport Admin',
  airline_manager:   'Airline Manager',
  passenger:         'Passenger',
  checkin_staff:     'Check-in Staff',
  boarding_staff:    'Boarding Staff',
  baggage_staff:     'Baggage Staff',
  security_officer:  'Security Officer',
  maintenance_staff: 'Maintenance Staff',
};

export const ROLE_COLORS = {
  super_admin:       'bg-red-500/10 text-red-400 border-red-500/20',
  airport_admin:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  airline_manager:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
  passenger:         'bg-blue-500/10 text-blue-400 border-blue-500/20',
  checkin_staff:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  boarding_staff:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  baggage_staff:     'bg-amber-500/10 text-amber-400 border-amber-500/20',
  security_officer:  'bg-rose-500/10 text-rose-400 border-rose-500/20',
  maintenance_staff: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
};

// ── Misc ──────────────────────────────────────────────────────────────────────

/** Truncate a string to maxLen characters */
export const truncate = (str, maxLen = 40) => {
  if (!str) return '—';
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
};

/** Get user initials from first + last name */
export const getInitials = (firstName, lastName) => {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0]  ?? '';
  return (f + l).toUpperCase() || '?';
};

/** Redirect path based on role after login */
export const getDashboardPath = (role) => {
  if (!role) return '/';
  if (['super_admin', 'airport_admin'].includes(role)) return '/admin/dashboard';
  if (role === 'passenger') return '/passenger/dashboard';
  if (role === 'airline_manager') return '/staff/checkin';
  if (role === 'checkin_staff') return '/staff/checkin';
  if (role === 'boarding_staff') return '/staff/boarding';
  if (role === 'baggage_staff') return '/staff/baggage';
  if (role === 'security_officer') return '/staff/security';
  if (role === 'maintenance_staff') return '/staff/maintenance';
  return '/';
};
