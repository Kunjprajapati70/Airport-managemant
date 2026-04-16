const User = require('../models/User');
const Staff = require('../models/Staff');
const { generateEmployeeId } = require('../utils/generatePNR');
const auditLog = require('../middleware/auditLogger');

// @GET /api/users  (admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, isActive, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName:  { $regex: search, $options: 'i' } },
        { email:     { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).populate('airline', 'name code').populate('airport', 'name code')
        .skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);
    res.json({ success: true, users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

// @GET /api/users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('airline', 'name code').populate('airport', 'name code');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (error) { next(error); }
};

// @POST /api/users  (admin creates staff/admin accounts)
exports.createUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role, phone, airline, airport,
            department, position, shift } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists.' });

    const user = await User.create({ firstName, lastName, email, password, role, phone, airline, airport });

    // If staff role, create staff record
    const staffRoles = ['checkin_staff', 'boarding_staff', 'baggage_staff', 'security_officer', 'maintenance_staff', 'airport_admin', 'airline_manager'];
    if (staffRoles.includes(role)) {
      await Staff.create({
        user: user._id,
        employeeId: generateEmployeeId(),
        department: department || role,
        position: position || role,
        airport: airport || null,
        airline: airline || null,
        shift: shift || 'morning',
      });
    }

    await auditLog(req, 'CREATE', 'User', user._id, `Created user ${email} with role ${role}`);
    res.status(201).json({ success: true, message: 'User created.', user });
  } catch (error) { next(error); }
};

// @PUT /api/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const before = await User.findById(req.params.id);
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    await auditLog(req, 'UPDATE', 'User', user._id, `Updated user ${user.email}`, before, user);
    res.json({ success: true, message: 'User updated.', user });
  } catch (error) { next(error); }
};

// @DELETE /api/users/:id  (soft delete)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    await auditLog(req, 'DELETE', 'User', user._id, `Deactivated user ${user.email}`);
    res.json({ success: true, message: 'User deactivated.' });
  } catch (error) { next(error); }
};
