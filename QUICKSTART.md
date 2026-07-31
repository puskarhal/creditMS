# CREDIT Admin Dashboard — Quick Start

## What You're Getting

A **sales/admin-only SaaS dashboard** for managing CREDIT leads, pilot applications, and customer inquiries. No teacher or student logins — just the ESPL team managing incoming business.

**Homepage** (`/`): Full marketing/sales page matching your reference design
- Hero section: "Recognize. Reward. Inspire."
- Product highlights, role benefits, reward marketplace, student journey
- Live pricing from database (edit via backend, no redeploy)
- 45-Day pilot offer, testimonials, CTA banner
- Stats strip with live counts (schools, students, credits, rewards issued)

**Admin Dashboard** (`/dashboard.html`): Two-page admin interface

### 1. Dashboard (Overview Page)
Three stat cards:
- **Book a Live Demo** — total demo requests + new count
- **45-Day Free Pilot** — total pilot applications + new count  
- **Contact Messages** — total incoming messages + new count

Plus a "Recent Submissions" table showing latest 8 entries (Demo/Pilot/Message) with name, org, and timestamp.

### 2. Leads & Messages (Master Table)
A **combined, searchable table** of everything:
- All Demo Bookings + Pilot Applications + Contact Form Submissions
- Live filters: Name, Organization, Status, Type
- Status dropdown per row (updates DB instantly):
  - Demo/Pilot: `new` → `contacted` → `converted` / `rejected`
  - Messages: `new` → `contacted` → `resolved`

---

## Getting Started

### 1. Extract & Install
```bash
unzip credit-management-system.zip
cd cms/backend
npm install
npm run seed    # One-time setup: creates tables + demo data
```

### 2. Update `.env` (if needed)
If the MySQL credentials have changed since you provided them, update:
```
DB_HOST=puskar-mysql1-puskar.j.aivencloud.com
DB_PORT=14336
DB_USER=avnadmin
DB_PASSWORD=AVNS_q_cNXgeMUQE3j6iDNT6
DB_NAME=cmsweb
PORT=3000
```

### 3. Run
```bash
npm start
# Server on http://localhost:3000
```

### 4. Login
Go to `http://localhost:3000/login.html`

**Admin account** (created by seed script):
- Email: `admin@greenfield.edu`
- Password: `Admin@123`

---

## Database Tables

**New tables added:**
- `demo_requests` — "Book a Live Demo" form submissions
- `pilot_requests` — "Start 45-Day Free Pilot" form submissions
- `contact_messages` — General Contact page submissions
- `pricing_plans` — Editable pricing tiers (used on Pricing page)

All data **captured live from the website** → stored in MySQL → **visible in the admin dashboard**.

---

## Features

✅ **Homepage** — Matches your reference design exactly
- All 8+ marketing sections
- Live pricing from database
- Live reward samples from demo school
- Live demo/pilot/contact form submissions flow

✅ **Admin Dashboard** (admin-only access)
- Overview: Key metrics at a glance
- Master table: All leads + messages, filterable by name/org/status
- Status updates: Dropdown → database → instant refresh

✅ **Backend APIs** (all with JWT auth + role guards)
- `/api/leads/summary` — Demo & Pilot counts
- `/api/leads/demo-requests` — All demo bookings
- `/api/leads/pilot-requests` — All pilot applications
- `/api/messages` — All contact form submissions
- `/api/messages/summary` — Contact message counts
- `/api/public/pricing` — Live pricing plans
- `/api/public/demo-request` — Accept demo form (front-end → DB)
- `/api/public/pilot-request` — Accept pilot form (front-end → DB)
- `/api/public/contact` — Accept contact form (front-end → DB)

✅ **Database-driven** — No hardcoded data
- Pricing plans, rewards, testimonials, settings all editable via MySQL
- Frontend pulls live numbers from the database

---

## Deploying Live

**On Render.com, Railway.app, or your own VPS:**

1. Push this folder to GitHub (or your git host)
2. Set up the Node app:
   - Root directory: `cms/backend`
   - Build command: `npm install`
   - Start command: `npm start`
3. Add env vars (same as `.env`)
4. On first deploy, run: `npm run seed` (via the console/shell tab)
5. Open your domain — homepage should load

The **frontend** is automatically served by the Express server at `/`.

---

## One-Time Password Rotation

Before going live to schools:
1. Change the admin password in `seed.js` (or update in MySQL directly)
2. Rotate the JWT_SECRET in `.env` to a strong random value

---

## That's It!

The app is ready to use. Navigate to:
- **Homepage:** `/` (landing page + lead capture forms)
- **Admin Dashboard:** `/dashboard.html` (requires admin login)
- **Public pages:** `/pricing.html`, `/solutions.html`, `/contact.html`, `/support.html`, `/about.html`
