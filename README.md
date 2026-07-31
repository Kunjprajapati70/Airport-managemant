# ✈️ AeroManage — Airport Management System

A complete, enterprise-grade Airport Management System built with React, Node.js, Express, and MongoDB.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account (free tier works fine)

### 1. Configure MongoDB Atlas
1. Create a free cluster at https://cloud.mongodb.com
2. Under **Database Access**, create a user with read/write permissions
3. Under **Network Access**, add `0.0.0.0/0` for dev
4. Click **Connect → Drivers**, copy the connection string
5. Paste it into `server/.env` as `MONGO_URI`

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
- Designed the MongoDB database schema & manage database
- Created and optimized database models
- Worked on UI/UX design and user interface improvements
- Assisted with responsive layouts and user experience enhancements

---

## 🚀 Deploy on Render

This project includes a `render.yaml` for one-click deployment. Here's the full manual guide:

### Step 1 — Deploy the Backend (Web Service)

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Node version:** 18+
4. Add these **Environment Variables** in the Render dashboard:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | your Atlas connection string |
| `JWT_SECRET` | a long random secret |
| `JWT_EXPIRE` | `7d` |
| `CLIENT_URL` | your frontend Render URL (added after step 2) |
| `FROM_EMAIL` | `noreply@aeromanage.com` |
| `FROM_NAME` | `AeroManage` |

5. Click **Deploy**. Note your backend URL: `https://aeromanage-api.onrender.com`

---

### Step 2 — Deploy the Frontend (Static Site)

1. Go to Render → **New → Static Site**
2. Connect the same GitHub repo
3. Settings:
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Add this **Environment Variable**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://aeromanage-api.onrender.com` ← your backend URL |

5. Under **Redirects/Rewrites**, add:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Type:** Rewrite
   *(This enables React SPA routing — without it, direct URL visits return 404)*

6. Click **Deploy**. Note your frontend URL: `https://aeromanage.onrender.com`

---

### Step 3 — Link frontend URL to backend

Go back to your **backend service** on Render → Environment → update:

```
CLIENT_URL = https://aeromanage.onrender.com
```

Then click **Save** — Render will redeploy automatically.

---

### Step 4 — Seed the database

After both services are running, open a terminal and seed your Atlas database:

```bash
cd server
npm run seed
```

Or set `MONGO_URI` in your local `.env` and run it locally — the seed writes directly to Atlas.

---

### Notes

- Free tier Render services **spin down after inactivity** — first request after idle takes ~30s
- `uploads/` folder (avatars) is **ephemeral** on Render free tier — files reset on redeploy. For persistent uploads, use Cloudinary or S3.
- Socket.IO works on Render — no extra config needed
