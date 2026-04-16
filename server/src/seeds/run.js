/**
 * seeds/run.js
 * Database seeder — populates all collections with realistic demo data.
 *
 * Run:
 *   npm run seed
 *
 * What it seeds:
 *   - 5 international airports
 *   - 4 airlines
 *   - 5 aircraft with full seat layouts
 *   - 5 terminals, 50 gates, 5 runways, 5 parking bays
 *   - 10 users covering all 9 roles
 *   - 2 passenger profiles
 *   - 5 staff records
 *   - 5 flights (scheduled, boarding, delayed)
 *
 * All existing data is cleared before seeding.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const { addHours, subMinutes, addDays } = require('date-fns');

// Models
const User           = require('../models/User');
const Passenger      = require('../models/Passenger');
const Staff          = require('../models/Staff');
const Airport        = require('../models/Airport');
const Airline        = require('../models/Airline');
const Aircraft       = require('../models/Aircraft');
const AircraftSeat   = require('../models/AircraftSeat');
const Terminal       = require('../models/Terminal');
const Gate           = require('../models/Gate');
const Runway         = require('../models/Runway');
const ParkingBay     = require('../models/ParkingBay');
const Flight         = require('../models/Flight');
const Booking        = require('../models/Booking');
const Payment        = require('../models/Payment');
const Notification   = require('../models/Notification');
const AuditLog       = require('../models/AuditLog');
const Baggage        = require('../models/Baggage');
const BoardingPass   = require('../models/BoardingPass');
const SecurityCheck  = require('../models/SecurityCheck');
const MaintenanceLog = require('../models/MaintenanceLog');
const CrewAssignment = require('../models/CrewAssignment');
const StaffAttendance= require('../models/StaffAttendance');
const Complaint      = require('../models/Complaint');

const { SEAT_CLASS, CHECKIN_WINDOW, BOARDING_CLOSE_MINUTES } = require('../config/constants');
const { AIRPORTS, getAirlines, getAircraft, getUsers } = require('./seedData');

// ── Seat layout generator ─────────────────────────────────────────────────────
const generateSeats = async (aircraft) => {
  const seats = [];
  const allCols = ['A', 'B', 'C', 'D', 'E', 'F'];
  let currentRow = 1;

  // First class — 4 seats per row (A B  C D), wider layout
  const firstClassCols = ['A', 'B', 'C', 'D'];
  const firstRows = Math.ceil(aircraft.firstClassSeats / firstClassCols.length);
  for (let r = currentRow; r < currentRow + firstRows; r++) {
    firstClassCols.forEach((col) => {
      seats.push({
        aircraft:   aircraft._id,
        seatNumber: `${r}${col}`,
        row:        r,
        column:     col,
        class:      SEAT_CLASS.FIRST,
        isWindow:   col === 'A' || col === 'D',
        isAisle:    col === 'B' || col === 'C',
        isMiddle:   false,
        price:      150,
      });
    });
  }
  currentRow += firstRows;

  // Business class — 6 seats per row (A B C  D E F)
  const bizRows = Math.ceil(aircraft.businessSeats / allCols.length);
  for (let r = currentRow; r < currentRow + bizRows; r++) {
    allCols.forEach((col) => {
      seats.push({
        aircraft:   aircraft._id,
        seatNumber: `${r}${col}`,
        row:        r,
        column:     col,
        class:      SEAT_CLASS.BUSINESS,
        isWindow:   col === 'A' || col === 'F',
        isAisle:    col === 'C' || col === 'D',
        isMiddle:   col === 'B' || col === 'E',
        price:      75,
      });
    });
  }
  currentRow += bizRows;

  // Economy class — 6 seats per row
  const ecoRows = Math.ceil(aircraft.economySeats / allCols.length);
  const exitRow = currentRow + Math.floor(ecoRows / 2); // middle exit row
  for (let r = currentRow; r < currentRow + ecoRows; r++) {
    allCols.forEach((col) => {
      seats.push({
        aircraft:     aircraft._id,
        seatNumber:   `${r}${col}`,
        row:          r,
        column:       col,
        class:        SEAT_CLASS.ECONOMY,
        isWindow:     col === 'A' || col === 'F',
        isAisle:      col === 'C' || col === 'D',
        isMiddle:     col === 'B' || col === 'E',
        isExitRow:    r === exitRow,
        extraLegroom: r === exitRow,
        price:        0,
      });
    });
  }

  if (seats.length > 0) {
    // ordered: false — continue even if a few duplicates exist from a partial previous run
    await AircraftSeat.insertMany(seats, { ordered: false }).catch(() => {});
  }
};

// ── Main seeder ───────────────────────────────────────────────────────────────
const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\n✅ Connected to MongoDB');

    // ── Clear all collections ─────────────────────────────────────────────────
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany(),          Passenger.deleteMany(),
      Staff.deleteMany(),         Airport.deleteMany(),
      Airline.deleteMany(),       Aircraft.deleteMany(),
      AircraftSeat.deleteMany(),  Terminal.deleteMany(),
      Gate.deleteMany(),          Runway.deleteMany(),
      ParkingBay.deleteMany(),    Flight.deleteMany(),
      Booking.deleteMany(),       Payment.deleteMany(),
      Notification.deleteMany(),  AuditLog.deleteMany(),
      Baggage.deleteMany(),       BoardingPass.deleteMany(),
      SecurityCheck.deleteMany(), MaintenanceLog.deleteMany(),
      CrewAssignment.deleteMany(),StaffAttendance.deleteMany(),
      Complaint.deleteMany(),
    ]);
    console.log('   Done.\n');

    // ── Airports ──────────────────────────────────────────────────────────────
    const airports = await Airport.insertMany(AIRPORTS);
    console.log(`✅ Airports (${airports.length})`);

    // ── Airlines ──────────────────────────────────────────────────────────────
    const airlines = await Airline.insertMany(getAirlines(airports));
    console.log(`✅ Airlines (${airlines.length})`);

    // ── Aircraft ──────────────────────────────────────────────────────────────
    const aircraft = await Aircraft.insertMany(getAircraft(airlines));
    console.log(`✅ Aircraft (${aircraft.length})`);

    // ── Seat layouts ──────────────────────────────────────────────────────────
    for (const ac of aircraft) {
      await generateSeats(ac);
    }
    const seatCount = await AircraftSeat.countDocuments();
    console.log(`✅ Seats generated (${seatCount} total)`);

    // ── Terminals ─────────────────────────────────────────────────────────────
    const terminals = await Terminal.insertMany([
      { airport: airports[0]._id, name: 'Terminal 1', code: 'T1', type: 'international', totalGates: 20 },
      { airport: airports[0]._id, name: 'Terminal 4', code: 'T4', type: 'international', totalGates: 15 },
      { airport: airports[1]._id, name: 'Terminal B', code: 'TB', type: 'international', totalGates: 18 },
      { airport: airports[2]._id, name: 'Terminal 5', code: 'T5', type: 'international', totalGates: 25 },
      { airport: airports[3]._id, name: 'Terminal 3', code: 'T3', type: 'international', totalGates: 30 },
    ]);
    console.log(`✅ Terminals (${terminals.length})`);

    // ── Gates (10 per terminal) ───────────────────────────────────────────────
    const gateNums = ['A1','A2','A3','A4','B1','B2','B3','B4','C1','C2'];
    const gateData = [];
    for (const terminal of terminals) {
      for (const gn of gateNums) {
        gateData.push({
          terminal:   terminal._id,
          airport:    terminal.airport,
          gateNumber: gn,
          type:       'international',
          status:     'available',
        });
      }
    }
    const gates = await Gate.insertMany(gateData);
    console.log(`✅ Gates (${gates.length})`);

    // ── Runways ───────────────────────────────────────────────────────────────
    const runways = await Runway.insertMany([
      { airport: airports[0]._id, runwayId: '04L', length: 4423, width: 61, surface: 'asphalt',  status: 'active' },
      { airport: airports[0]._id, runwayId: '04R', length: 3460, width: 46, surface: 'asphalt',  status: 'active' },
      { airport: airports[1]._id, runwayId: '24L', length: 3685, width: 61, surface: 'asphalt',  status: 'active' },
      { airport: airports[2]._id, runwayId: '09L', length: 3902, width: 61, surface: 'concrete', status: 'active' },
      { airport: airports[3]._id, runwayId: '12L', length: 4000, width: 60, surface: 'asphalt',  status: 'active' },
    ]);
    console.log(`✅ Runways (${runways.length})`);

    // ── Parking bays ──────────────────────────────────────────────────────────
    const bays = await ParkingBay.insertMany([
      { airport: airports[0]._id, bayNumber: 'P01', type: 'contact', status: 'available' },
      { airport: airports[0]._id, bayNumber: 'P02', type: 'contact', status: 'available' },
      { airport: airports[1]._id, bayNumber: 'P01', type: 'contact', status: 'available' },
      { airport: airports[2]._id, bayNumber: 'P01', type: 'contact', status: 'available' },
      { airport: airports[3]._id, bayNumber: 'P01', type: 'contact', status: 'available' },
    ]);
    console.log(`✅ Parking bays (${bays.length})`);

    // ── Users (all 9 roles) ───────────────────────────────────────────────────
    // insertMany does NOT trigger pre-save hooks, so we must create individually
    // to ensure passwords are hashed by the User model's bcrypt hook.
    const usersData = getUsers(airports, airlines);
    const users = [];
    for (const userData of usersData) {
      const user = await User.create(userData);
      users.push(user);
    }
    console.log(`✅ Users (${users.length}) — all roles covered`);

    // ── Passenger profiles ────────────────────────────────────────────────────
    // users[3] = Alice (passenger), users[4] = Bob (passenger)
    await Passenger.insertMany([
      {
        user:           users[3]._id,
        passportNumber: 'US123456789',
        nationality:    'American',
        dateOfBirth:    new Date('1990-05-15'),
        gender:         'female',
        mealPreference: 'vegetarian',
        seatPreference: 'window',
        emergencyContactName:     'Robert Johnson',
        emergencyContactPhone:    '+1-555-0199',
        emergencyContactRelation: 'Spouse',
      },
      {
        user:           users[4]._id,
        passportNumber: 'US987654321',
        nationality:    'American',
        dateOfBirth:    new Date('1985-08-22'),
        gender:         'male',
        mealPreference: 'standard',
        seatPreference: 'aisle',
        emergencyContactName:     'Carol Williams',
        emergencyContactPhone:    '+1-555-0198',
        emergencyContactRelation: 'Sister',
      },
    ]);
    console.log('✅ Passenger profiles (2)');

    // ── Staff records ─────────────────────────────────────────────────────────
    // users[5..9] = operational staff
    const staffMeta = [
      { dept: 'Check-in Operations',  position: 'Check-in Agent',       shift: 'morning' },
      { dept: 'Boarding Operations',  position: 'Boarding Agent',        shift: 'morning' },
      { dept: 'Baggage Handling',     position: 'Baggage Handler',       shift: 'afternoon' },
      { dept: 'Security',             position: 'Security Officer',      shift: 'morning' },
      { dept: 'Aircraft Maintenance', position: 'Maintenance Technician',shift: 'night' },
    ];
    const staffDocs = [];
    for (let i = 0; i < 5; i++) {
      const staffDoc = await Staff.create({
        user:          users[5 + i]._id,
        employeeId:    `EMP-${String(1001 + i).padStart(5, '0')}`,
        department:    staffMeta[i].dept,
        position:      staffMeta[i].position,
        airport:       airports[0]._id,
        shift:         staffMeta[i].shift,
        dateOfJoining: new Date('2022-01-15'),
        salary:        55000 + i * 5000,
      });
      staffDocs.push(staffDoc);
    }
    console.log(`✅ Staff records (${staffDocs.length})`);

    // ── Flights ───────────────────────────────────────────────────────────────
    const now = new Date();

    const buildFlight = (data) => ({
      ...data,
      checkInOpenTime:   addHours(data.scheduledDeparture, -CHECKIN_WINDOW.OPEN_HOURS),
      checkInCloseTime:  addHours(data.scheduledDeparture, -CHECKIN_WINDOW.CLOSE_HOURS),
      boardingOpenTime:  subMinutes(data.scheduledDeparture, 60),
      boardingCloseTime: subMinutes(data.scheduledDeparture, BOARDING_CLOSE_MINUTES),
    });

    const flightsData = [
      buildFlight({
        flightNumber: 'AA101',
        airline: airlines[0]._id, aircraft: aircraft[0]._id,
        departureAirport: airports[0]._id, arrivalAirport: airports[1]._id,
        scheduledDeparture: addHours(now, 6), scheduledArrival: addHours(now, 11),
        departureTerminal: terminals[0]._id, departureGate: gates[0]._id,
        runway: runways[0]._id, parkingBay: bays[0]._id,
        economyPrice: 299, businessPrice: 799, firstClassPrice: 1499,
        totalSeats: aircraft[0].totalSeats, availableSeats: aircraft[0].totalSeats,
        status: 'scheduled',
      }),
      buildFlight({
        flightNumber: 'AA202',
        airline: airlines[0]._id, aircraft: aircraft[1]._id,
        departureAirport: airports[1]._id, arrivalAirport: airports[2]._id,
        scheduledDeparture: addHours(now, 8), scheduledArrival: addHours(now, 18),
        departureTerminal: terminals[2]._id, departureGate: gates[20]._id,
        runway: runways[2]._id, parkingBay: bays[2]._id,
        economyPrice: 599, businessPrice: 1499, firstClassPrice: 2999,
        totalSeats: aircraft[1].totalSeats, availableSeats: aircraft[1].totalSeats,
        status: 'scheduled',
      }),
      buildFlight({
        flightNumber: 'BA301',
        airline: airlines[1]._id, aircraft: aircraft[2]._id,
        departureAirport: airports[2]._id, arrivalAirport: airports[3]._id,
        scheduledDeparture: addHours(now, 2), scheduledArrival: addHours(now, 9),
        departureTerminal: terminals[3]._id, departureGate: gates[30]._id,
        runway: runways[3]._id, parkingBay: bays[3]._id,
        economyPrice: 499, businessPrice: 1299, firstClassPrice: 2499,
        totalSeats: aircraft[2].totalSeats, availableSeats: aircraft[2].totalSeats,
        status: 'boarding',
      }),
      buildFlight({
        flightNumber: 'EK401',
        airline: airlines[2]._id, aircraft: aircraft[3]._id,
        departureAirport: airports[3]._id, arrivalAirport: airports[4]._id,
        scheduledDeparture: addHours(now, 4), scheduledArrival: addHours(now, 11),
        departureTerminal: terminals[4]._id, departureGate: gates[40]._id,
        runway: runways[4]._id, parkingBay: bays[4]._id,
        economyPrice: 399, businessPrice: 999, firstClassPrice: 1999,
        totalSeats: aircraft[3].totalSeats, availableSeats: aircraft[3].totalSeats,
        status: 'delayed', delayMinutes: 45, delayReason: 'Air traffic control delay',
        estimatedDeparture: addHours(now, 4.75),
      }),
      buildFlight({
        flightNumber: 'SQ501',
        airline: airlines[3]._id, aircraft: aircraft[4]._id,
        departureAirport: airports[4]._id, arrivalAirport: airports[0]._id,
        scheduledDeparture: addDays(now, 1), scheduledArrival: addHours(addDays(now, 1), 20),
        departureTerminal: terminals[4]._id, departureGate: gates[40]._id,
        runway: runways[4]._id,
        economyPrice: 799, businessPrice: 1999, firstClassPrice: 3999,
        totalSeats: aircraft[4].totalSeats, availableSeats: aircraft[4].totalSeats,
        status: 'scheduled',
      }),
    ];

    const flights = await Flight.insertMany(flightsData);
    console.log(`✅ Flights (${flights.length})`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(55));
    console.log('🎉  Seed complete! Demo credentials:');
    console.log('─'.repeat(55));
    const creds = [
      ['Super Admin',       'superadmin@ams.com'],
      ['Airport Admin',     'airportadmin@ams.com'],
      ['Airline Manager',   'airlinemanager@ams.com'],
      ['Passenger (Alice)', 'passenger@ams.com'],
      ['Passenger (Bob)',   'passenger2@ams.com'],
      ['Check-in Staff',    'checkin@ams.com'],
      ['Boarding Staff',    'boarding@ams.com'],
      ['Baggage Staff',     'baggage@ams.com'],
      ['Security Officer',  'security@ams.com'],
      ['Maintenance Staff', 'maintenance@ams.com'],
    ];
    creds.forEach(([role, email]) => {
      console.log(`  ${role.padEnd(20)} ${email.padEnd(30)} Admin@123`);
    });
    console.log('─'.repeat(55) + '\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

seed();
