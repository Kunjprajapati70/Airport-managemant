# ✈️ AeroManage — Airport Management System

A complete, enterprise-grade Airport Management System built with React, Node.js, Express, and MongoDB.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB running locally on port 27017
- Git (for cloning and pushing)

### 1. Start MongoDB
Make sure MongoDB is running:
```bash
mongod
```

### 2. Setup & Run Backend
```bash
cd server
npm install
npm run seed      # Seeds demo data + all user accounts
npm run dev       # Starts on http://localhost:5000
```

> On Windows PowerShell, if you get `npm.ps1 cannot be loaded`, use:
> - `npm.cmd install`
> - `npm.cmd run dev`

### 2a. Enable email sending (optional)
By default, emails are skipped in development unless SMTP credentials are configured.

- Copy `server/.env.example` → `server/.env`
- Set `SMTP_USER` and `SMTP_PASS` (and either `SMTP_HOST`/`SMTP_PORT` or `SMTP_SERVICE`)
- Set `FROM_EMAIL` to the mail id you want to send from

### 3. Setup & Run Frontend
```bash
cd client
npm install
npm run dev       # Starts on http://localhost:5173
```

Open http://localhost:5173

---

## ✅ Default Test Flow

After running the seed command, verify quickly with:

1. Login as `passenger@ams.com / Admin@123`
2. Search flights (`/flights/search`)
3. Book a flight
4. Open My Bookings (`/passenger/bookings`)
5. Login as `airlinemanager@ams.com / Admin@123`
6. Check flight scheduling access

---

## 🧰 Useful Scripts

### Server
- `npm run dev` — start backend in development mode
- `npm run seed` — reset and seed database with demo data
- `npm start` — run backend in normal mode

### Client
- `npm run dev` — start Vite development server
- `npm run build` — create production build
- `npm run preview` — preview production build

---

## 🔑 Demo Login Credentials

| Role              | Email                      | Password   |
|-------------------|----------------------------|------------|
| Super Admin       | superadmin@ams.com         | Admin@123  |
| Airport Admin     | airportadmin@ams.com       | Admin@123  |
| Airline Manager   | airlinemanager@ams.com     | Admin@123  |
| Passenger         | passenger@ams.com          | Admin@123  |
| Check-in Staff    | checkin@ams.com            | Admin@123  |
| Boarding Staff    | boarding@ams.com           | Admin@123  |
| Baggage Staff     | baggage@ams.com            | Admin@123  |
| Security Officer  | security@ams.com           | Admin@123  |
| Maintenance Staff | maintenance@ams.com        | Admin@123  |

---

## 🏗️ Architecture

```
airport-management-system/
├── server/                    # Node.js + Express backend
│   ├── src/
│   │   ├── app.js             # Entry point
│   │   ├── config/            # DB + constants
│   │   ├── models/            # 15+ Mongoose models
│   │   ├── controllers/       # Business logic
│   │   ├── routes/            # REST API routes
│   │   ├── middleware/        # Auth, error, audit, upload
│   │   ├── services/          # Shared services
│   │   ├── socket/            # Socket.IO real-time
│   │   ├── utils/             # JWT, QR, PDF, email
│   │   └── seeds/             # Demo data seeder
│   └── uploads/               # File uploads
│
└── client/                    # React + Vite frontend
    └── src/
        ├── pages/
        │   ├── public/        # Home, Search, Status, About
        │   ├── auth/          # Login, Register, Reset
        │   ├── passenger/     # Full passenger portal
        │   ├── admin/         # Admin dashboards
        │   └── staff/         # Operational consoles
        ├── components/        # Reusable UI components
        ├── store/             # Redux Toolkit state
        ├── services/          # Axios + Socket.IO
        └── utils/             # Helpers
```

---

## 📦 Tech Stack

| Layer       | Technology                              |
|-------------|----------------------------------------|
| Frontend    | React 18, Vite, Tailwind CSS, Redux    |
| Backend     | Node.js, Express.js                    |
| Database    | MongoDB + Mongoose                     |
| Auth        | JWT + bcrypt                           |
| Real-time   | Socket.IO                              |
| PDF/QR      | PDFKit + qrcode                        |
| Email       | Nodemailer                             |
| Charts      | Recharts                               |

---

## 🔐 User Roles & Permissions

| Role              | Access                                          |
|-------------------|-------------------------------------------------|
| Super Admin       | Everything                                      |
| Airport Admin     | Flights, staff, infrastructure, reports         |
| Airline Manager   | Own airline aircraft, crew, schedules           |
| Passenger         | Search, book, check-in, baggage, boarding pass  |
| Check-in Staff    | Check-in console, baggage registration          |
| Boarding Staff    | Boarding console, QR scan                       |
| Baggage Staff     | Baggage tracking and status updates             |
| Security Officer  | Security clearance desk                         |
| Maintenance Staff | Aircraft maintenance logs                       |

---

## 🌐 API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/flights/search
GET    /api/flights/live
POST   /api/flights
PATCH  /api/flights/:id/status

POST   /api/bookings
GET    /api/bookings/my
POST   /api/bookings/:id/cancel

POST   /api/checkin/:bookingId
GET    /api/boarding/pass/:id/pdf

GET    /api/baggage/my
GET    /api/baggage/tag/:tag
PATCH  /api/baggage/:id/status

GET    /api/security
PATCH  /api/security/:id

GET    /api/reports/dashboard
GET    /api/reports/revenue
GET    /api/reports/audit
```

---

## 🛠️ Troubleshooting

### Backend starts but crashes on MongoDB connection
- Ensure MongoDB service is running.
- If `localhost` fails on Windows, use:
  - `MONGO_URI=mongodb://127.0.0.1:27017/airport_management`

### No data visible after login
- Run:
  - `cd server`
  - `npm run seed`

### Email not sending
- Configure SMTP fields in `server/.env`:
  - `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`
  - and either `SMTP_HOST`/`SMTP_PORT` or `SMTP_SERVICE`

---

## 👥 Contributors

| Contributor | Role |
|------------|------|
| **Kunj Prajapati** | Full-stack Development |
| **Sumit Prajapati** | Database & UI/UX |

### Responsibilities

#### Kunj Prajapati
- Developed the frontend using React and Vite
- Built backend APIs with Node.js and Express.js
- Implemented authentication and authorization
- Integrated frontend with backend services
- Developed flight booking, check-in, baggage, and dashboard modules
- Managed GitHub repository and project integration

#### Sumit Prajapati
- Designed the MongoDB database schema
- Created and optimized database models
- Worked on UI/UX design and user interface improvements
- Assisted with responsive layouts and user experience enhancements
