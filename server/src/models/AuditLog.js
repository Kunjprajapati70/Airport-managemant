const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorName:  { type: String },
  actorRole:  { type: String },
  action:     { type: String, required: true },
  module:     { type: String, required: true },
  targetId:   { type: mongoose.Schema.Types.ObjectId },
  targetType: { type: String },
  description:{ type: String },
  before:     { type: mongoose.Schema.Types.Mixed },
  after:      { type: mongoose.Schema.Types.Mixed },
  ipAddress:  { type: String },
  userAgent:  { type: String },
  status:     { type: String, enum: ['success', 'failure'], default: 'success' },
}, { timestamps: true });

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
module.exports = mongoose.model('AuditLog', auditLogSchema);
