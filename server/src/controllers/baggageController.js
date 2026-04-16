/**
 * baggageController.js
 * Full baggage lifecycle management.
 *
 * Endpoints:
 *   GET  /api/baggage/my              - passenger's own baggage
 *   GET  /api/baggage/tag/:tag        - lookup by tag number (public)
 *   GET  /api/baggage                 - all baggage (staff)
 *   GET  /api/baggage/stats           - baggage statistics (staff)
 *   GET  /api/baggage/:id             - single baggage detail
 *   PATCH /api/baggage/:id/status     - update status + tracking event
 *   PATCH /api/baggage/:id/fee-paid   - mark excess fee as paid
 *   POST /api/baggage/:id/lost        - report lost
 *   POST /api/baggage/:id/found       - mark as found
 *   POST /api/baggage/:id/complaint   - file a complaint
 *   GET  /api/baggage/complaints/my   - passenger's complaints
 *   GET  /api/baggage/complaints      - all complaints (staff)
 *   PATCH /api/baggage/complaints/:id - update complaint (staff)
 */

const Baggage   = require('../models/Baggage');
const Complaint = require('../models/Complaint');
const Booking   = require('../models/Booking');
const Notification = require('../models/Notification');
const AppError  = require('../utils/AppError');
const auditLog  = require('../middleware/auditLogger');
const { emitToUser } = require('../socket');
const {
  BAGGAGE_STATUS,
  NOTIFICATION_TYPES,
  BAGGAGE_ALLOWANCE,
  EXCESS_BAGGAGE_RATE,
} = require('../config/constants');

// ── Shared populate ───────────────────────────────────────────────────────────
const BAGGAGE_POPULATE = [
  { path: 'booking', select: 'pnr user' },
  { path: 'flight',  select: 'flightNumber scheduledDeparture departureAirport arrivalAirport',
    populate: [
      { path: 'departureAirport', select: 'code city' },
      { path: 'arrivalAirport',   select: 'code city' },
    ],
  },
  { path: 'trackingHistory.updatedBy', select: 'firstName lastName role' },
];

// ── Helper: notify passenger ──────────────────────────────────────────────────
const notifyPassenger = async (baggage, title, message) => {
  try {
    const booking = await Booking.findById(baggage.booking).select('user');
    if (!booking) return;
    const notif = await Notification.create({
      user:    booking.user,
      type:    NOTIFICATION_TYPES.BAGGAGE_CLAIM,
      title,
      message,
      booking: booking._id,
    });
    emitToUser(booking.user.toString(), 'notification', notif);
  } catch (err) {
    console.error('Baggage notification error:', err.message);
  }
};

// ── GET /api/baggage/my ───────────────────────────────────────────────────────
exports.getMyBaggage = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).select('_id').lean();
    const bookingIds = bookings.map((b) => b._id);

    const baggage = await Baggage.find({ booking: { $in: bookingIds } })
      .populate(BAGGAGE_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, baggage, total: baggage.length });
  } catch (err) { next(err); }
};

// ── GET /api/baggage/tag/:tag ─────────────────────────────────────────────────
exports.getByTag = async (req, res, next) => {
  try {
    const baggage = await Baggage.findOne({ tagNumber: req.params.tag.toUpperCase() })
      .populate(BAGGAGE_POPULATE)
      .lean();

    if (!baggage) return next(new AppError('Baggage not found with that tag number.', 404));
    res.json({ success: true, baggage });
  } catch (err) { next(err); }
};

// ── GET /api/baggage/stats ────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const stats = await Baggage.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byStatus = Object.fromEntries(stats.map((s) => [s._id, s.count]));
    const total    = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const missing  = (byStatus.missing ?? 0) + (byStatus.lost ?? 0);
    const excessRevenue = await Baggage.aggregate([
      { $match: { excessFee: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$excessFee' }, paid: { $sum: { $cond: ['$excessFeePaid', '$excessFee', 0] } } } },
    ]);

    res.json({
      success: true,
      stats: {
        total,
        byStatus,
        missing,
        excessRevenue: excessRevenue[0]?.total ?? 0,
        excessRevenuePaid: excessRevenue[0]?.paid ?? 0,
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/baggage ──────────────────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const {
      flight, status, search, isLost,
      page = 1, limit = 20,
    } = req.query;

    const query = {};
    if (flight) query.flight = flight;
    if (status) query.status = status;
    if (isLost !== undefined) query.isLost = isLost === 'true';
    if (search) {
      query.$or = [
        { tagNumber:     { $regex: search.trim(), $options: 'i' } },
        { passengerName: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [baggage, total] = await Promise.all([
      Baggage.find(query)
        .populate({ path: 'booking', select: 'pnr' })
        .populate({ path: 'flight',  select: 'flightNumber scheduledDeparture' })
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .lean(),
      Baggage.countDocuments(query),
    ]);

    res.json({
      success: true,
      baggage,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) { next(err); }
};

// ── GET /api/baggage/:id ──────────────────────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    const baggage = await Baggage.findById(req.params.id)
      .populate(BAGGAGE_POPULATE)
      .lean();

    if (!baggage) return next(new AppError('Baggage not found.', 404));
    res.json({ success: true, baggage });
  } catch (err) { next(err); }
};

// ── PATCH /api/baggage/:id/status ─────────────────────────────────────────────
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, location, notes } = req.body;

    const baggage = await Baggage.findById(req.params.id);
    if (!baggage) return next(new AppError('Baggage not found.', 404));

    const previousStatus = baggage.status;

    // Validate status transition
    const terminalStatuses = [BAGGAGE_STATUS.CLAIMED, BAGGAGE_STATUS.LOST];
    if (terminalStatuses.includes(baggage.status) && baggage.status !== status) {
      return next(new AppError(`Cannot change status from "${baggage.status}" — it is a terminal state.`, 400));
    }

    baggage.status = status;
    baggage.trackingHistory.push({
      status,
      location: location?.trim() || '',
      updatedBy: req.user._id,
      timestamp: new Date(),
      notes:     notes?.trim() || null,
    });

    // Auto-set lost flag
    if (status === BAGGAGE_STATUS.LOST) {
      baggage.isLost = true;
      if (!baggage.lostReportedAt) baggage.lostReportedAt = new Date();
    }
    if (status === BAGGAGE_STATUS.CLAIMED) {
      baggage.isLost = false;
    }

    await baggage.save();

    // Notify passenger for significant status changes
    const notifyStatuses = [
      BAGGAGE_STATUS.ARRIVED,
      BAGGAGE_STATUS.CLAIMED,
      BAGGAGE_STATUS.MISSING,
      BAGGAGE_STATUS.LOST,
    ];
    if (notifyStatuses.includes(status)) {
      const titles = {
        [BAGGAGE_STATUS.ARRIVED]: 'Baggage Arrived',
        [BAGGAGE_STATUS.CLAIMED]: 'Baggage Claimed ✅',
        [BAGGAGE_STATUS.MISSING]: '⚠️ Baggage Missing',
        [BAGGAGE_STATUS.LOST]:    '🚨 Baggage Reported Lost',
      };
      const messages = {
        [BAGGAGE_STATUS.ARRIVED]: `Your baggage (${baggage.tagNumber}) has arrived at ${location || 'the baggage claim area'}.`,
        [BAGGAGE_STATUS.CLAIMED]: `Your baggage (${baggage.tagNumber}) has been claimed.`,
        [BAGGAGE_STATUS.MISSING]: `Your baggage (${baggage.tagNumber}) cannot be located. Our team is investigating. ${notes || ''}`,
        [BAGGAGE_STATUS.LOST]:    `Your baggage (${baggage.tagNumber}) has been reported as lost. Please file a complaint for compensation.`,
      };
      await notifyPassenger(baggage, titles[status], messages[status]);
    }

    await auditLog(
      req, 'UPDATE_STATUS', 'Baggage', baggage._id,
      `Baggage ${baggage.tagNumber}: ${previousStatus} → ${status}${location ? ` @ ${location}` : ''}`
    );

    res.json({ success: true, message: 'Baggage status updated.', baggage });
  } catch (err) { next(err); }
};

// ── PATCH /api/baggage/:id/fee-paid ──────────────────────────────────────────
exports.markFeePaid = async (req, res, next) => {
  try {
    const baggage = await Baggage.findById(req.params.id);
    if (!baggage) return next(new AppError('Baggage not found.', 404));

    if (baggage.excessFee <= 0) {
      return next(new AppError('This baggage has no excess fee.', 400));
    }
    if (baggage.excessFeePaid) {
      return next(new AppError('Excess fee has already been marked as paid.', 400));
    }

    baggage.excessFeePaid  = true;
    baggage.excessFeePaidAt = new Date();
    baggage.trackingHistory.push({
      status:    baggage.status,
      location:  'Check-in Counter',
      updatedBy: req.user._id,
      timestamp: new Date(),
      notes:     `Excess baggage fee of $${baggage.excessFee} paid`,
    });
    await baggage.save();

    await auditLog(req, 'FEE_PAID', 'Baggage', baggage._id, `Excess fee paid for ${baggage.tagNumber}`);
    res.json({ success: true, message: 'Excess fee marked as paid.', baggage });
  } catch (err) { next(err); }
};

// ── POST /api/baggage/:id/lost ────────────────────────────────────────────────
exports.reportLost = async (req, res, next) => {
  try {
    const { description, lastSeenLocation } = req.body;

    const baggage = await Baggage.findById(req.params.id);
    if (!baggage) return next(new AppError('Baggage not found.', 404));

    if (baggage.status === BAGGAGE_STATUS.CLAIMED) {
      return next(new AppError('Cannot report claimed baggage as lost.', 400));
    }

    baggage.isLost          = true;
    baggage.status          = BAGGAGE_STATUS.LOST;
    baggage.lostReportedAt  = new Date();
    baggage.lostDescription = description;
    baggage.trackingHistory.push({
      status:    BAGGAGE_STATUS.LOST,
      location:  lastSeenLocation || 'Unknown',
      updatedBy: req.user._id,
      timestamp: new Date(),
      notes:     description,
    });
    await baggage.save();

    await notifyPassenger(
      baggage,
      '🚨 Baggage Reported Lost',
      `Your baggage (${baggage.tagNumber}) has been reported as lost. Please file a complaint for assistance.`
    );

    await auditLog(req, 'REPORT_LOST', 'Baggage', baggage._id, `Lost report: ${baggage.tagNumber}`);
    res.json({ success: true, message: 'Baggage reported as lost.', baggage });
  } catch (err) { next(err); }
};

// ── POST /api/baggage/:id/found ───────────────────────────────────────────────
exports.markFound = async (req, res, next) => {
  try {
    const { location, notes } = req.body;

    const baggage = await Baggage.findById(req.params.id);
    if (!baggage) return next(new AppError('Baggage not found.', 404));

    baggage.isLost        = false;
    baggage.foundAt       = new Date();
    baggage.foundLocation = location || null;
    baggage.status        = BAGGAGE_STATUS.ARRIVED;
    baggage.trackingHistory.push({
      status:    BAGGAGE_STATUS.ARRIVED,
      location:  location || 'Lost & Found',
      updatedBy: req.user._id,
      timestamp: new Date(),
      notes:     notes || 'Baggage located and recovered',
    });
    await baggage.save();

    await notifyPassenger(
      baggage,
      '✅ Baggage Found',
      `Great news! Your baggage (${baggage.tagNumber}) has been found at ${location || 'our facility'}. Please collect it at the Lost & Found desk.`
    );

    await auditLog(req, 'MARK_FOUND', 'Baggage', baggage._id, `Found: ${baggage.tagNumber} at ${location}`);
    res.json({ success: true, message: 'Baggage marked as found.', baggage });
  } catch (err) { next(err); }
};

// ── POST /api/baggage/:id/complaint ──────────────────────────────────────────
exports.fileComplaint = async (req, res, next) => {
  try {
    const {
      type, subject, description, priority,
      baggageDescription, baggageColor, lastSeenLocation,
    } = req.body;

    const baggage = await Baggage.findById(req.params.id)
      .populate('booking', 'user flight')
      .populate('flight', 'flightNumber');

    if (!baggage) return next(new AppError('Baggage not found.', 404));

    // Only the baggage owner can file a complaint
    const booking = await Booking.findById(baggage.booking).select('user');
    if (booking.user.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to file a complaint for this baggage.', 403));
    }

    const complaint = await Complaint.create({
      user:               req.user._id,
      booking:            baggage.booking,
      flight:             baggage.flight,
      baggage:            baggage._id,
      type,
      subject,
      description,
      priority:           priority || 'medium',
      baggageTagNumber:   baggage.tagNumber,
      baggageDescription: baggageDescription || baggage.description,
      baggageColor:       baggageColor || baggage.color,
      lastSeenLocation,
    });

    // Link complaint to baggage
    baggage.complaint = complaint._id;
    await baggage.save();

    await auditLog(req, 'FILE_COMPLAINT', 'Baggage', baggage._id, `Complaint filed for ${baggage.tagNumber}`);
    res.status(201).json({ success: true, message: 'Complaint filed successfully.', complaint });
  } catch (err) { next(err); }
};

// ── GET /api/baggage/complaints/my ───────────────────────────────────────────
exports.getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ user: req.user._id })
      .populate('baggage', 'tagNumber weight status')
      .populate('flight',  'flightNumber scheduledDeparture')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, complaints, total: complaints.length });
  } catch (err) { next(err); }
};

// ── GET /api/baggage/complaints ───────────────────────────────────────────────
exports.getAllComplaints = async (req, res, next) => {
  try {
    const { status, type, priority, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status)   query.status   = status;
    if (type)     query.type     = type;
    if (priority) query.priority = priority;

    const skip = (Number(page) - 1) * Number(limit);
    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate('user',    'firstName lastName email')
        .populate('baggage', 'tagNumber weight status')
        .populate('flight',  'flightNumber')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .lean(),
      Complaint.countDocuments(query),
    ]);

    res.json({
      success: true,
      complaints,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) { next(err); }
};

// ── PATCH /api/baggage/complaints/:id ────────────────────────────────────────
exports.updateComplaint = async (req, res, next) => {
  try {
    const { status, resolution, internalNotes, assignedTo, priority } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError('Complaint not found.', 404));

    const updates = {};
    if (status)        updates.status        = status;
    if (resolution)    updates.resolution    = resolution;
    if (internalNotes) updates.internalNotes = internalNotes;
    if (assignedTo)    updates.assignedTo    = assignedTo;
    if (priority)      updates.priority      = priority;
    if (status === 'resolved' || status === 'closed') {
      updates.resolvedAt = new Date();
    }

    const updated = await Complaint.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email');

    // Notify passenger when resolved
    if (status === 'resolved') {
      const notif = await Notification.create({
        user:    complaint.user,
        type:    NOTIFICATION_TYPES.BAGGAGE_CLAIM,
        title:   'Complaint Resolved',
        message: `Your complaint "${complaint.subject}" has been resolved. ${resolution || ''}`,
      });
      emitToUser(complaint.user.toString(), 'notification', notif);
    }

    await auditLog(req, 'UPDATE_COMPLAINT', 'Complaint', complaint._id, `Complaint ${complaint._id} → ${status}`);
    res.json({ success: true, message: 'Complaint updated.', complaint: updated });
  } catch (err) { next(err); }
};
