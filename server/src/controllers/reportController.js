const Flight = require('../models/Flight');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Baggage = require('../models/Baggage');
const Aircraft = require('../models/Aircraft');
const AuditLog = require('../models/AuditLog');
const SecurityCheck = require('../models/SecurityCheck');
const MaintenanceLog = require('../models/MaintenanceLog');
const mongoose = require('mongoose');
const { FLIGHT_STATUS, PAYMENT_STATUS } = require('../config/constants');

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDateRange(startDate, endDate) {
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = endDate   ? new Date(endDate)   : now;
  end.setHours(23, 59, 59, 999);
  if (isNaN(start) || isNaN(end) || start > end) return null;
  return { start, end };
}

function parseObjectId(id) {
  if (!id) return null;
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

function buildFlightMatch({ start, end, airlineId, airportId }) {
  const match = { isActive: true, scheduledDeparture: { $gte: start, $lte: end } };
  if (airlineId) match.airline = airlineId;
  if (airportId) match.$or = [
    { departureAirport: airportId },
    { arrivalAirport:   airportId },
  ];
  return match;
}

const CHART_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];

// ── GET /api/reports/dashboard ────────────────────────────────────────────────
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today     = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow  = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    const [
      totalFlights, todayFlights, totalBookings, confirmedBookings,
      totalRevenue, monthRevenue, lastMonthRevenue,
      totalPassengers, activeAircraft, inMaintenanceAircraft,
      delayedFlights, cancelledFlights,
      totalBaggage, missingBaggage,
      pendingSecurity, flaggedSecurity,
      openComplaints,
    ] = await Promise.all([
      Flight.countDocuments({ isActive: true }),
      Flight.countDocuments({ scheduledDeparture: { $gte: today, $lt: tomorrow }, isActive: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
      Payment.aggregate([{ $match: { status: PAYMENT_STATUS.PAID } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: PAYMENT_STATUS.PAID, paidAt: { $gte: thisMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: PAYMENT_STATUS.PAID, paidAt: { $gte: lastMonth, $lte: lastMonthEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Booking.aggregate([{ $match: { status: 'confirmed' } }, { $project: { count: { $size: '$passengers' } } }, { $group: { _id: null, total: { $sum: '$count' } } }]),
      Aircraft.countDocuments({ status: { $in: ['available', 'assigned'] }, isActive: true }),
      Aircraft.countDocuments({ status: 'maintenance', isActive: true }),
      Flight.countDocuments({ status: FLIGHT_STATUS.DELAYED, isActive: true }),
      Flight.countDocuments({ status: FLIGHT_STATUS.CANCELLED, isActive: true }),
      Baggage.countDocuments(),
      Baggage.countDocuments({ status: { $in: ['missing', 'lost'] } }),
      SecurityCheck.countDocuments({ status: 'pending' }),
      SecurityCheck.countDocuments({ status: 'flagged' }),
      mongoose.model('Complaint').countDocuments({ status: 'open' }).catch(() => 0),
    ]);

    const thisMonthRev  = monthRevenue[0]?.total     || 0;
    const lastMonthRev  = lastMonthRevenue[0]?.total || 0;
    const revenueGrowth = lastMonthRev > 0
      ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100)
      : null;

    res.json({
      success: true,
      stats: {
        flights:  { total: totalFlights, today: todayFlights, delayed: delayedFlights, cancelled: cancelledFlights },
        bookings: { total: totalBookings, confirmed: confirmedBookings },
        revenue:  { total: totalRevenue[0]?.total || 0, thisMonth: thisMonthRev, lastMonth: lastMonthRev, growth: revenueGrowth },
        passengers: { total: totalPassengers[0]?.total || 0 },
        aircraft: { active: activeAircraft, inMaintenance: inMaintenanceAircraft },
        baggage:  { total: totalBaggage, missing: missingBaggage },
        security: { pending: pendingSecurity, flagged: flaggedSecurity },
        complaints: { open: openComplaints },
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/reports/analytics ────────────────────────────────────────────────
exports.getAnalyticsOverview = async (req, res, next) => {
  try {
    const { startDate, endDate, airlineId, airportId, granularity = 'day' } = req.query;

    const range = parseDateRange(startDate, endDate);
    if (!range) {
      return res.status(400).json({ success: false, message: 'Invalid date range.' });
    }
    const { start, end } = range;

    const parsedAirlineId = parseObjectId(airlineId);
    const parsedAirportId = parseObjectId(airportId);

    if ((airlineId && !parsedAirlineId) || (airportId && !parsedAirportId)) {
      return res.status(400).json({ success: false, message: 'Invalid airlineId or airportId.' });
    }

    const flightMatch = buildFlightMatch({ start, end, airlineId: parsedAirlineId, airportId: parsedAirportId });
    const rangeDays   = Math.max(1, Math.ceil((end - start) / 86400000));

    const bookingFlightFilter = {};
    if (parsedAirlineId) bookingFlightFilter['flightData.airline'] = parsedAirlineId;
    if (parsedAirportId) bookingFlightFilter.$or = [
      { 'flightData.departureAirport': parsedAirportId },
      { 'flightData.arrivalAirport':   parsedAirportId },
    ];

    const paymentGroupId = granularity === 'month'
      ? { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } }
      : { year: { $year: '$paidAt' }, month: { $month: '$paidAt' }, day: { $dayOfMonth: '$paidAt' } };

    const [
      flightSummary,
      flightStatusBreakdown,
      revenueAgg,
      passengerAgg,
      routePopularity,
      baggageStats,
      aircraftUtilization,
      revenueTrend,
      bookingsByClass,
      delayReasons,
    ] = await Promise.all([
      // 1. Flight summary
      Flight.aggregate([
        { $match: flightMatch },
        { $group: {
          _id: null,
          totalFlights:    { $sum: 1 },
          delayedFlights:  { $sum: { $cond: [{ $eq: ['$status', 'delayed']   }, 1, 0] } },
          cancelledFlights:{ $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          arrivedFlights:  { $sum: { $cond: [{ $eq: ['$status', 'arrived']   }, 1, 0] } },
          avgDelay:        { $avg: '$delayMinutes' },
          totalBookedSeats:{ $sum: '$bookedSeats' },
          totalSeats:      { $sum: '$totalSeats' },
          flightsToday: {
            $sum: {
              $cond: [{
                $and: [
                  { $gte: ['$scheduledDeparture', new Date(new Date().setHours(0,0,0,0))] },
                  { $lt:  ['$scheduledDeparture', new Date(new Date().setHours(24,0,0,0))] },
                ],
              }, 1, 0],
            },
          },
        }},
      ]),

      // 2. Status breakdown
      Flight.aggregate([
        { $match: flightMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // 3. Revenue
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $lookup: { from: 'flights', localField: 'flight', foreignField: '_id', as: 'flightData' } },
        { $unwind: '$flightData' },
        { $match: { ...bookingFlightFilter, 'flightData.scheduledDeparture': { $gte: start, $lte: end } } },
        { $lookup: { from: 'payments', localField: '_id', foreignField: 'booking', as: 'paymentData' } },
        { $unwind: { path: '$paymentData', preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: null,
          revenue:    { $sum: { $cond: [{ $eq: ['$paymentData.status', 'paid'] }, '$paymentData.amount', 0] } },
          taxes:      { $sum: '$taxes' },
          fees:       { $sum: '$fees' },
          bookings:   { $sum: 1 },
        }},
      ]),

      // 4. Passengers
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $lookup: { from: 'flights', localField: 'flight', foreignField: '_id', as: 'flightData' } },
        { $unwind: '$flightData' },
        { $match: { ...bookingFlightFilter, 'flightData.scheduledDeparture': { $gte: start, $lte: end } } },
        { $group: { _id: null, passengers: { $sum: { $size: '$passengers' } }, bookings: { $sum: 1 } } },
      ]),

      // 5. Route popularity
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $lookup: { from: 'flights', localField: 'flight', foreignField: '_id', as: 'flightData' } },
        { $unwind: '$flightData' },
        { $match: { ...bookingFlightFilter, 'flightData.scheduledDeparture': { $gte: start, $lte: end } } },
        { $group: {
          _id: { dep: '$flightData.departureAirport', arr: '$flightData.arrivalAirport' },
          bookings:   { $sum: 1 },
          passengers: { $sum: { $size: '$passengers' } },
          revenue:    { $sum: '$totalAmount' },
        }},
        { $sort: { bookings: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'airports', localField: '_id.dep', foreignField: '_id', as: 'depAirport' } },
        { $lookup: { from: 'airports', localField: '_id.arr', foreignField: '_id', as: 'arrAirport' } },
      ]),

      // 6. Baggage stats
      Baggage.aggregate([
        { $lookup: { from: 'flights', localField: 'flight', foreignField: '_id', as: 'flightData' } },
        { $unwind: { path: '$flightData', preserveNullAndEmptyArrays: true } },
        { $match: { 'flightData.scheduledDeparture': { $gte: start, $lte: end } } },
        { $group: {
          _id: null,
          total:       { $sum: 1 },
          missing:     { $sum: { $cond: [{ $eq: ['$status', 'missing'] }, 1, 0] } },
          lost:        { $sum: { $cond: [{ $eq: ['$status', 'lost']    }, 1, 0] } },
          claimed:     { $sum: { $cond: [{ $eq: ['$status', 'claimed'] }, 1, 0] } },
          excessFees:  { $sum: '$excessFee' },
          excessPaid:  { $sum: { $cond: ['$excessFeePaid', '$excessFee', 0] } },
          totalWeight: { $sum: '$weight' },
        }},
      ]),

      // 7. Aircraft utilization
      Flight.aggregate([
        { $match: flightMatch },
        { $group: { _id: '$aircraft', flightCount: { $sum: 1 }, bookedSeats: { $sum: '$bookedSeats' }, totalSeats: { $sum: '$totalSeats' } } },
        { $lookup: { from: 'aircraft', localField: '_id', foreignField: '_id', as: 'ac' } },
        { $unwind: '$ac' },
        { $project: {
          aircraft:    '$ac.registrationNumber',
          model:       '$ac.model',
          flightCount: 1,
          loadFactor:  { $round: [{ $multiply: [{ $divide: ['$bookedSeats', { $max: ['$totalSeats', 1] }] }, 100] }, 1] },
          flightsPerDay: { $round: [{ $divide: ['$flightCount', rangeDays] }, 2] },
        }},
        { $sort: { flightCount: -1 } },
        { $limit: 10 },
      ]),

      // 8. Revenue trend
      Payment.aggregate([
        { $match: { status: PAYMENT_STATUS.PAID, paidAt: { $gte: start, $lte: end } } },
        { $group: { _id: paymentGroupId, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),

      // 9. Bookings by seat class
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $lookup: { from: 'flights', localField: 'flight', foreignField: '_id', as: 'flightData' } },
        { $unwind: '$flightData' },
        { $match: { ...bookingFlightFilter, 'flightData.scheduledDeparture': { $gte: start, $lte: end } } },
        { $group: { _id: '$seatClass', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { count: -1 } },
      ]),

      // 10. Delay reasons
      Flight.aggregate([
        { $match: { ...flightMatch, status: 'delayed', delayReason: { $ne: null } } },
        { $group: { _id: '$delayReason', count: { $sum: 1 }, avgDelay: { $avg: '$delayMinutes' } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const fs = flightSummary[0] || {};
    const loadFactor = fs.totalSeats > 0
      ? Math.round((fs.totalBookedSeats / fs.totalSeats) * 100)
      : 0;

    res.json({
      success: true,
      filters: { startDate: start, endDate: end, airlineId: parsedAirlineId, airportId: parsedAirportId, granularity },
      summary: {
        flightsToday:     fs.flightsToday     || 0,
        totalFlights:     fs.totalFlights     || 0,
        delayedFlights:   fs.delayedFlights   || 0,
        cancelledFlights: fs.cancelledFlights || 0,
        arrivedFlights:   fs.arrivedFlights   || 0,
        avgDelayMinutes:  Math.round(fs.avgDelay || 0),
        loadFactor,
        revenue:    revenueAgg[0]?.revenue    || 0,
        taxes:      revenueAgg[0]?.taxes      || 0,
        fees:       revenueAgg[0]?.fees       || 0,
        bookings:   revenueAgg[0]?.bookings   || 0,
        passengers: passengerAgg[0]?.passengers || 0,
      },
      charts: {
        statusBreakdown:    flightStatusBreakdown,
        routePopularity,
        revenueTrend,
        aircraftUtilization,
        bookingsByClass,
        delayReasons,
      },
      baggageIssues: {
        total:       baggageStats[0]?.total       || 0,
        missing:     baggageStats[0]?.missing     || 0,
        lost:        baggageStats[0]?.lost        || 0,
        claimed:     baggageStats[0]?.claimed     || 0,
        excessFees:  baggageStats[0]?.excessFees  || 0,
        excessPaid:  baggageStats[0]?.excessPaid  || 0,
        totalWeight: baggageStats[0]?.totalWeight || 0,
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/reports/revenue ──────────────────────────────────────────────────
exports.getRevenueChart = async (req, res, next) => {
  try {
    const { period = 'monthly' } = req.query;
    const now = new Date();
    const startDate = period === 'daily'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), 0, 1);
    const groupBy = period === 'daily'
      ? { year: { $year: '$paidAt' }, month: { $month: '$paidAt' }, day: { $dayOfMonth: '$paidAt' } }
      : { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } };

    const data = await Payment.aggregate([
      { $match: { status: PAYMENT_STATUS.PAID, paidAt: { $gte: startDate } } },
      { $group: { _id: groupBy, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── GET /api/reports/flights ──────────────────────────────────────────────────
exports.getFlightStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { isActive: true };
    if (startDate && endDate) {
      match.scheduledDeparture = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const [statusBreakdown, routePopularity] = await Promise.all([
      Flight.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $lookup: { from: 'flights', localField: 'flight', foreignField: '_id', as: 'flightData' } },
        { $unwind: '$flightData' },
        { $group: {
          _id: { dep: '$flightData.departureAirport', arr: '$flightData.arrivalAirport' },
          bookings: { $sum: 1 },
          passengers: { $sum: { $size: '$passengers' } },
        }},
        { $sort: { bookings: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'airports', localField: '_id.dep', foreignField: '_id', as: 'depAirport' } },
        { $lookup: { from: 'airports', localField: '_id.arr', foreignField: '_id', as: 'arrAirport' } },
      ]),
    ]);
    res.json({ success: true, statusBreakdown, routePopularity });
  } catch (err) { next(err); }
};

// ── GET /api/reports/audit ────────────────────────────────────────────────────
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { module, actor, action, page = 1, limit = 50 } = req.query;
    const query = {};
    if (module) query.module = module;
    if (actor)  query.actor  = actor;
    if (action) query.action = action;
    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actor', 'firstName lastName email role')
        .skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      AuditLog.countDocuments(query),
    ]);
    res.json({ success: true, logs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};
