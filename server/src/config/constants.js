/**
 * constants.js
 * Single source of truth for every enum value used across the system.
 * Import from here — never hard-code strings in controllers or models.
 */

const ROLES = {
  SUPER_ADMIN:       'super_admin',
  AIRPORT_ADMIN:     'airport_admin',
  AIRLINE_MANAGER:   'airline_manager',
  PASSENGER:         'passenger',
  CHECKIN_STAFF:     'checkin_staff',
  BOARDING_STAFF:    'boarding_staff',
  BAGGAGE_STAFF:     'baggage_staff',
  SECURITY_OFFICER:  'security_officer',
  MAINTENANCE_STAFF: 'maintenance_staff',
};

const FLIGHT_STATUS = {
  SCHEDULED: 'scheduled',
  BOARDING:  'boarding',
  DEPARTED:  'departed',
  IN_FLIGHT: 'in_flight',
  ARRIVED:   'arrived',
  DELAYED:   'delayed',
  CANCELLED: 'cancelled',
  DIVERTED:  'diverted',
};

const BOOKING_STATUS = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW:   'no_show',
};

const PAYMENT_STATUS = {
  PENDING:             'pending',
  PAID:                'paid',
  FAILED:              'failed',
  REFUNDED:            'refunded',
  PARTIALLY_REFUNDED:  'partially_refunded',
};

const SEAT_CLASS = {
  ECONOMY:  'economy',
  BUSINESS: 'business',
  FIRST:    'first',
};

const SEAT_STATUS = {
  AVAILABLE: 'available',
  BOOKED:    'booked',
  BLOCKED:   'blocked',
};

const BAGGAGE_STATUS = {
  REGISTERED:       'registered',
  CHECKED_IN:       'checked_in',
  SECURITY_SCANNED: 'security_scanned',
  LOADED:           'loaded',
  IN_TRANSIT:       'in_transit',
  ARRIVED:          'arrived',
  CLAIMED:          'claimed',
  MISSING:          'missing',
  LOST:             'lost',
};

const AIRCRAFT_STATUS = {
  AVAILABLE:   'available',
  ASSIGNED:    'assigned',
  MAINTENANCE: 'maintenance',
  GROUNDED:    'grounded',
  RETIRED:     'retired',
};

const CHECKIN_STATUS = {
  NOT_CHECKED_IN: 'not_checked_in',
  CHECKED_IN:     'checked_in',
  BOARDED:        'boarded',
  NO_SHOW:        'no_show',
};

const SECURITY_STATUS = {
  PENDING:  'pending',
  CLEARED:  'cleared',
  FLAGGED:  'flagged',
  REJECTED: 'rejected',
};

const MAINTENANCE_STATUS = {
  SCHEDULED:   'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED:   'completed',
  OVERDUE:     'overdue',
};

const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  PAYMENT_SUCCESS:   'payment_success',
  PAYMENT_FAILED:    'payment_failed',
  FLIGHT_DELAYED:    'flight_delayed',
  FLIGHT_CANCELLED:  'flight_cancelled',
  GATE_CHANGE:       'gate_change',
  BOARDING_OPEN:     'boarding_open',
  BAGGAGE_CLAIM:     'baggage_claim',
  REFUND_PROCESSED:  'refund_processed',
  CHECKIN_OPEN:      'checkin_open',
  SECURITY_ALERT:    'security_alert',
  MAINTENANCE_DUE:   'maintenance_due',
  CONFLICT_ALERT:    'conflict_alert',
  SYSTEM:            'system',
};

// ─── Business Rules ───────────────────────────────────────────────────────────

/** Check-in opens 24 h before departure, closes 1 h before */
const CHECKIN_WINDOW = { OPEN_HOURS: 24, CLOSE_HOURS: 1 };

/** Boarding closes 20 minutes before scheduled departure */
const BOARDING_CLOSE_MINUTES = 20;

/** Free baggage allowance in kg per class */
const BAGGAGE_ALLOWANCE = { economy: 23, business: 32, first: 40 };

/** Excess baggage charge per kg (USD) */
const EXCESS_BAGGAGE_RATE = 15;

/** Tax rate applied to base fare */
const TAX_RATE = 0.12;

/** Fixed service fee per passenger (USD) */
const SERVICE_FEE_PER_PAX = 15;

/** Cancellation fee percentage when cancelled within 24 h of departure */
const LATE_CANCELLATION_FEE_PCT = 0.25;

/** Runway slot buffer — no two flights can share a runway within this window */
const RUNWAY_SLOT_BUFFER_MINUTES = 30;

module.exports = {
  ROLES,
  FLIGHT_STATUS,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  SEAT_CLASS,
  SEAT_STATUS,
  BAGGAGE_STATUS,
  AIRCRAFT_STATUS,
  CHECKIN_STATUS,
  SECURITY_STATUS,
  MAINTENANCE_STATUS,
  NOTIFICATION_TYPES,
  CHECKIN_WINDOW,
  BOARDING_CLOSE_MINUTES,
  BAGGAGE_ALLOWANCE,
  EXCESS_BAGGAGE_RATE,
  TAX_RATE,
  SERVICE_FEE_PER_PAX,
  LATE_CANCELLATION_FEE_PCT,
  RUNWAY_SLOT_BUFFER_MINUTES,
};
