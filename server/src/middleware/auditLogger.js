/**
 * auditLogger.js
 * Writes an immutable audit log entry for every significant admin/staff action.
 * Called at the END of controller functions — never blocks the response.
 *
 * Usage in controllers:
 *   await auditLog(req, 'CREATE', 'Flight', flight._id, `Created flight ${flight.flightNumber}`);
 *   await auditLog(req, 'UPDATE', 'Booking', booking._id, 'Cancelled booking', beforeDoc, afterDoc);
 *
 * Parameters:
 *   req         - Express request (provides actor identity + IP)
 *   action      - Verb: CREATE | UPDATE | DELETE | STATUS_UPDATE | CANCEL | CHECKIN | BOARD | etc.
 *   module      - Domain: Flight | Booking | User | Aircraft | Security | etc.
 *   targetId    - MongoDB ObjectId of the affected document (optional)
 *   description - Plain-English summary of what happened
 *   before      - Document state before the change (optional, for UPDATE/DELETE)
 *   after       - Document state after the change (optional, for CREATE/UPDATE)
 */

const AuditLog = require('../models/AuditLog');

const auditLog = async (
  req,
  action,
  module,
  targetId    = null,
  description = '',
  before      = null,
  after       = null
) => {
  try {
    // req.user is guaranteed to exist when auditLog is called from protected routes
    if (!req.user) return;

    await AuditLog.create({
      actor:       req.user._id,
      actorName:   `${req.user.firstName} ${req.user.lastName}`,
      actorRole:   req.user.role,
      action,
      module,
      targetId,
      targetType:  module,
      description,
      before:      before  ? JSON.parse(JSON.stringify(before))  : null,
      after:       after   ? JSON.parse(JSON.stringify(after))   : null,
      ipAddress:   req.ip  || req.connection?.remoteAddress,
      userAgent:   req.headers['user-agent'],
      status:      'success',
    });
  } catch (err) {
    // Audit log failure must never crash the main request
    console.error(`⚠️  Audit log write failed [${action}/${module}]: ${err.message}`);
  }
};

module.exports = auditLog;
