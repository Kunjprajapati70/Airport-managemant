const Staff = require('../models/Staff');
const CrewAssignment = require('../models/CrewAssignment');
const StaffAttendance = require('../models/StaffAttendance');
const auditLog = require('../middleware/auditLogger');

exports.getAll = async (req, res, next) => {
  try {
    const { department, airport, airline, isActive, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (department) query.department = department;
    if (airport) query.airport = airport;
    if (airline) query.airline = airline;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    const skip = (page - 1) * limit;
    const [staff, total] = await Promise.all([
      Staff.find(query)
        .populate('user', 'firstName lastName email phone avatar role')
        .populate('airport', 'name code')
        .populate('airline', 'name code')
        .skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Staff.countDocuments(query),
    ]);
    res.json({ success: true, staff, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id)
      .populate('user', 'firstName lastName email phone avatar role')
      .populate('airport', 'name code city')
      .populate('airline', 'name code');
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });
    res.json({ success: true, staff });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const before = await Staff.findById(req.params.id);
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });
    await auditLog(req, 'UPDATE', 'Staff', staff._id, `Updated staff ${staff.employeeId}`, before, staff);
    res.json({ success: true, message: 'Staff updated.', staff });
  } catch (error) { next(error); }
};

exports.assignCrew = async (req, res, next) => {
  try {
    const { flightId, staffId, role } = req.body;

    // Check for overlapping flight assignments
    const flight = require('../models/Flight');
    const targetFlight = await flight.findById(flightId);
    if (!targetFlight) return res.status(404).json({ success: false, message: 'Flight not found.' });

    const existingAssignments = await CrewAssignment.find({ staff: staffId }).populate('flight');
    for (const assignment of existingAssignments) {
      const af = assignment.flight;
      if (!af) continue;
      const overlap = (
        new Date(targetFlight.scheduledDeparture) < new Date(af.scheduledArrival) &&
        new Date(targetFlight.scheduledArrival)   > new Date(af.scheduledDeparture)
      );
      if (overlap) {
        return res.status(400).json({ success: false, message: `Crew member already assigned to overlapping flight ${af.flightNumber}.` });
      }
    }

    const assignment = await CrewAssignment.create({
      flight: flightId, staff: staffId, role, assignedBy: req.user._id,
    });
    await auditLog(req, 'ASSIGN_CREW', 'CrewAssignment', assignment._id, `Assigned crew to flight ${flightId}`);
    res.status(201).json({ success: true, message: 'Crew assigned.', assignment });
  } catch (error) { next(error); }
};

exports.getCrewForFlight = async (req, res, next) => {
  try {
    const crew = await CrewAssignment.find({ flight: req.params.flightId })
      .populate({ path: 'staff', populate: { path: 'user', select: 'firstName lastName email phone' } });
    res.json({ success: true, crew });
  } catch (error) { next(error); }
};

exports.markAttendance = async (req, res, next) => {
  try {
    const { staffId, status, checkIn, checkOut, notes } = req.body;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const attendance = await StaffAttendance.findOneAndUpdate(
      { staff: staffId, date: today },
      { status, checkIn, checkOut, notes },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Attendance recorded.', attendance });
  } catch (error) { next(error); }
};
