/**
 * seedData.js
 * Static demo data arrays used by the seeder.
 * Keeping data separate from seeder logic makes both easier to read and update.
 */

const { ROLES, AIRCRAFT_STATUS, SEAT_CLASS } = require('../config/constants');

// ── Airports ──────────────────────────────────────────────────────────────────
const AIRPORTS = [
  { name: 'John F. Kennedy International Airport', code: 'JFK', icaoCode: 'KJFK', city: 'New York',    country: 'USA',       timezone: 'America/New_York',    latitude: 40.6413, longitude: -73.7781 },
  { name: 'Los Angeles International Airport',     code: 'LAX', icaoCode: 'KLAX', city: 'Los Angeles', country: 'USA',       timezone: 'America/Los_Angeles', latitude: 33.9425, longitude: -118.4081 },
  { name: 'Heathrow Airport',                      code: 'LHR', icaoCode: 'EGLL', city: 'London',      country: 'UK',        timezone: 'Europe/London',       latitude: 51.4700, longitude: -0.4543 },
  { name: 'Dubai International Airport',           code: 'DXB', icaoCode: 'OMDB', city: 'Dubai',       country: 'UAE',       timezone: 'Asia/Dubai',          latitude: 25.2532, longitude: 55.3657 },
  { name: 'Singapore Changi Airport',              code: 'SIN', icaoCode: 'WSSS', city: 'Singapore',   country: 'Singapore', timezone: 'Asia/Singapore',      latitude: 1.3644,  longitude: 103.9915 },
];

// ── Airlines (hub airports resolved after airport insert) ─────────────────────
const getAirlines = (airports) => [
  { name: 'American Airlines',  code: 'AA', icaoCode: 'AAL', country: 'USA',       foundedYear: 1930, headquarters: 'Fort Worth, TX', hubAirports: [airports[0]._id, airports[1]._id] },
  { name: 'British Airways',    code: 'BA', icaoCode: 'BAW', country: 'UK',        foundedYear: 1974, headquarters: 'London, UK',     hubAirports: [airports[2]._id] },
  { name: 'Emirates',           code: 'EK', icaoCode: 'UAE', country: 'UAE',       foundedYear: 1985, headquarters: 'Dubai, UAE',     hubAirports: [airports[3]._id] },
  { name: 'Singapore Airlines', code: 'SQ', icaoCode: 'SIA', country: 'Singapore', foundedYear: 1947, headquarters: 'Singapore',      hubAirports: [airports[4]._id] },
];

// ── Aircraft (airline resolved after airline insert) ──────────────────────────
const getAircraft = (airlines) => [
  { registrationNumber: 'N101AA',  model: 'Boeing 737-800',   manufacturer: 'Boeing', airline: airlines[0]._id, totalSeats: 162, economySeats: 126, businessSeats: 24, firstClassSeats: 12, yearManufactured: 2018, maxRange: 5765,  cruisingSpeed: 842, status: AIRCRAFT_STATUS.AVAILABLE },
  { registrationNumber: 'N202AA',  model: 'Boeing 777-300ER', manufacturer: 'Boeing', airline: airlines[0]._id, totalSeats: 304, economySeats: 224, businessSeats: 52, firstClassSeats: 28, yearManufactured: 2019, maxRange: 13650, cruisingSpeed: 905, status: AIRCRAFT_STATUS.AVAILABLE },
  { registrationNumber: 'G301BA',  model: 'Airbus A380-800',  manufacturer: 'Airbus', airline: airlines[1]._id, totalSeats: 469, economySeats: 303, businessSeats: 97, firstClassSeats: 69, yearManufactured: 2017, maxRange: 15200, cruisingSpeed: 903, status: AIRCRAFT_STATUS.AVAILABLE },
  { registrationNumber: 'A6401EK', model: 'Boeing 777-300ER', manufacturer: 'Boeing', airline: airlines[2]._id, totalSeats: 354, economySeats: 266, businessSeats: 60, firstClassSeats: 28, yearManufactured: 2020, maxRange: 13650, cruisingSpeed: 905, status: AIRCRAFT_STATUS.AVAILABLE },
  { registrationNumber: '9V501SQ', model: 'Airbus A350-900',  manufacturer: 'Airbus', airline: airlines[3]._id, totalSeats: 253, economySeats: 187, businessSeats: 42, firstClassSeats: 24, yearManufactured: 2021, maxRange: 15000, cruisingSpeed: 910, status: AIRCRAFT_STATUS.AVAILABLE },
];

// ── Demo users — one for every role ──────────────────────────────────────────
const getUsers = (airports, airlines) => [
  // ── Admins
  {
    firstName: 'Super', lastName: 'Admin',
    email: 'superadmin@ams.com', password: 'Admin@123',
    role: ROLES.SUPER_ADMIN, isActive: true, isEmailVerified: true,
  },
  {
    firstName: 'Airport', lastName: 'Admin',
    email: 'airportadmin@ams.com', password: 'Admin@123',
    role: ROLES.AIRPORT_ADMIN, airport: airports[0]._id,
    isActive: true, isEmailVerified: true,
  },
  {
    firstName: 'John', lastName: 'Manager',
    email: 'airlinemanager@ams.com', password: 'Admin@123',
    role: ROLES.AIRLINE_MANAGER, airline: airlines[0]._id,
    isActive: true, isEmailVerified: true,
  },
  // ── Passengers
  {
    firstName: 'Alice', lastName: 'Johnson',
    email: 'passenger@ams.com', password: 'Admin@123',
    role: ROLES.PASSENGER, phone: '+1-555-0101',
    isActive: true, isEmailVerified: true,
  },
  {
    firstName: 'Bob', lastName: 'Williams',
    email: 'passenger2@ams.com', password: 'Admin@123',
    role: ROLES.PASSENGER, phone: '+1-555-0102',
    isActive: true, isEmailVerified: true,
  },
  // ── Operational staff
  {
    firstName: 'Sara', lastName: 'Chen',
    email: 'checkin@ams.com', password: 'Admin@123',
    role: ROLES.CHECKIN_STAFF, airport: airports[0]._id,
    isActive: true, isEmailVerified: true,
  },
  {
    firstName: 'Mike', lastName: 'Torres',
    email: 'boarding@ams.com', password: 'Admin@123',
    role: ROLES.BOARDING_STAFF, airport: airports[0]._id,
    isActive: true, isEmailVerified: true,
  },
  {
    firstName: 'Lisa', lastName: 'Park',
    email: 'baggage@ams.com', password: 'Admin@123',
    role: ROLES.BAGGAGE_STAFF, airport: airports[0]._id,
    isActive: true, isEmailVerified: true,
  },
  {
    firstName: 'James', lastName: 'Okafor',
    email: 'security@ams.com', password: 'Admin@123',
    role: ROLES.SECURITY_OFFICER, airport: airports[0]._id,
    isActive: true, isEmailVerified: true,
  },
  {
    firstName: 'Tom', lastName: 'Nguyen',
    email: 'maintenance@ams.com', password: 'Admin@123',
    role: ROLES.MAINTENANCE_STAFF, airport: airports[0]._id,
    isActive: true, isEmailVerified: true,
  },
];

module.exports = { AIRPORTS, getAirlines, getAircraft, getUsers };
