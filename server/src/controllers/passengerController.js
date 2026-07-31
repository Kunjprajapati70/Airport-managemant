const Passenger = require('../models/Passenger');
const Booking = require('../models/Booking');

exports.getMyProfile = async (req, res, next) => {
  try {
    let profile = await Passenger.findOne({ user: req.user._id })
      .populate('user', 'firstName lastName email phone avatar')
      .populate('frequentFlyerAirline', 'name code');
    if (!profile) {
      profile = await Passenger.create({ user: req.user._id });
    }
    res.json({ success: true, profile });
  } catch (error) { next(error); }
};

exports.updateMyProfile = async (req, res, next) => {
  try {
    const profile = await Passenger.findOneAndUpdate(
      { user: req.user._id },
      req.body,
      { new: true, upsert: true, runValidators: true }
    ).populate('user', 'firstName lastName email phone avatar');
    res.json({ success: true, message: 'Profile updated.', profile });
  } catch (error) { next(error); }
};

exports.getTravelHistory = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id, status: 'completed' })
      .populate({ path: 'flight', populate: [
        { path: 'departureAirport', select: 'name code city country' },
        { path: 'arrivalAirport',   select: 'name code city country' },
        { path: 'airline',          select: 'name code logo' },
      ]})
      .sort({ createdAt: -1 });
    res.json({ success: true, history: bookings });
  } catch (error) { next(error); }
};

exports.getAllPassengers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) query.$or = [
      { passportNumber: { $regex: search, $options: 'i' } },
      { nationality: { $regex: search, $options: 'i' } },
    ];
    const skip = (page - 1) * limit;
    const [passengers, total] = await Promise.all([
      Passenger.find(query)
        .populate('user', 'firstName lastName email phone')
        .skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Passenger.countDocuments(query),
    ]);
    res.json({ success: true, passengers, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};
