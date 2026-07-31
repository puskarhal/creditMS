# CREDIT — Student Credit & Reward Management System

A full-stack web app: Express + MySQL (Aiven) backend, vanilla JS frontend.
**No static/mock data** — every number on the landing page and every table in
the dashboard is a live query against the `cmsweb` MySQL database.

```
cms/
├── backend/         Express API + serves the frontend
│   ├── config/db.js       MySQL connection pool (Aiven, SSL)
│   ├── middleware/auth.js JWT auth + role guard
│   ├── routes/             auth, dashboard, students, credits, rewards,
│   │                       houses, users, reports, public (unauthenticated)
│   ├── schema.sql          full DB schema
│   ├── seed.js             creates schema + demo school/logins
│   ├── server.js           entry point
│   └── .env                DB credentials (already filled in)
└── frontend/
    ├── index.html           marketing/landing page (matches your reference design)
    ├── login.html           sign-in
    ├── dashboard.html       authenticated app shell (sidebar SPA)
    └── js/ css/             app logic + styling
```

## 1. Why I couldn't run this live for you

My build sandbox can only reach package registries (npm/pypi/github) — it has
no route to `puskar-mysql1-puskar.j.aivencloud.com` or to any hosting
provider. So I wrote and syntax-checked all the code here, but **you need to
run the two steps below yourself**, from a machine/host that can actually
reach Aiven (which is any normal laptop or cloud host — Aiven allows public
connections by default).

## 2. Run it locally first

```bash
cd backend
npm install
npm run seed      # creates all tables in `cmsweb` + a demo school/logins
npm start         # starts on http://localhost:3000
```

Then open `http://localhost:3000`. Demo logins created by the seed script:

| Role    | Email                    | Password      |
|---------|--------------------------|---------------|
| Admin   | admin@greenfield.edu     | Admin@123     |
| Teacher | sharma@greenfield.edu    | Teacher@123   |
| Student | aarav@greenfield.edu     | Student@123   |

**Change these passwords (and the DB password) before going live** — they're
in this repo in plaintext for demo convenience only.

## 3. Deploy it live

Any Node host works since it's a single Express process serving both the API
and the static frontend. Two easy free-tier options:

**Render.com**
1. Push this folder to a GitHub repo.
2. New → Web Service → connect the repo, set **Root Directory** to `backend`.
3. Build command: `npm install`. Start command: `npm start`.
4. Add the environment variables from `backend/.env` in Render's dashboard
   (don't commit `.env` to git — add it to `.gitignore`).
5. After first deploy, open the Render **Shell** tab and run `npm run seed`
   once to create the tables and demo data.

**Railway.app** — same idea: new project from repo, root = `backend`,
start command `npm start`, add the env vars, then run `npm run seed` from
Railway's shell.

**A VPS** — `git clone`, `cd backend && npm install`, put a process manager
(`pm2 start server.js`) in front of it, and put Nginx/Caddy in front of that
for HTTPS and your domain.

## 4. What's implemented

- **Logo** — your uploaded logo (`frontend/images/logo.jpeg`) is used in the
  navbar, login page, and dashboard sidebar.
- **Landing page** — matches your reference screenshot: top bar, nav,
  hero with live dashboard mockup + phone mockups, feature cards, and a
  stats strip. The hero mockup numbers and the bottom stats strip both call
  `/api/public/stats` and `/api/public/demo-dashboard` — real DB values.
- **Book a Live Demo / Start 45-Day Free Pilot** — both buttons open a modal
  form (name, phone, email, organization, address — all required) that
  POSTs to `/api/public/demo-request` or `/api/public/pilot-request` and is
  stored in the `demo_requests` / `pilot_requests` tables.
- **Support page** (`support.html`) — contact number, email, and office
  address.
- **About Us page** (`about.html`) — ESPL company profile, values, vision,
  mission, and certifications.
- **Sales-focused homepage** — expanded to match the SaaS marketing structure
  you shared: Product Highlights, role-based Benefits tabs (Principals/
  Teachers/Students/Parents), a live Reward Marketplace preview, the Student
  Journey flow, Platform Overview (Teacher/Student/Parent/Admin), an AI
  Analytics teaser, live Pricing cards, a 45-Day Pilot offer box, sample
  Success Stories, and a final CTA banner.
- **Pricing page** (`pricing.html`) — reads from a `pricing_plans` DB table
  via `/api/public/pricing`, so you can edit prices/features by updating the
  table, no redeploy needed.
- **Solutions page** (`solutions.html`) — Schools / Colleges / Coaching
  Institutes, each with its own benefit list.
- **Contact page** (`contact.html`) — full lead form (school name, contact
  person, designation, email, mobile, student count, city/state, message),
  POSTs to `/api/public/contact` and is stored in `contact_messages`.
- **Unified login** — one login screen for everyone. What you see after
  logging in depends on your role:
  - **Admin** — full school CMS (Students/Credits/Rewards/etc.) **plus**:
    - **Leads** — every Demo request and Free Pilot application from the
      homepage, with a status dropdown (new/contacted/converted/rejected).
    - **Messages** — every submission from the Contact page, with a status
      dropdown (new/contacted/resolved).
  - **Teacher/Parent/Student** ("user") — the scoped school CMS views from
    the original build.
- **Auth** — JWT login/register, bcrypt-hashed passwords, roles
  (admin/teacher/parent/student).
- **Dashboard** — total students, credits issued, rewards redeemed, active
  teachers (all live aggregates + month-over-month deltas), recent activity
  feed, house leaderboard.
- **Students** — searchable list, add student (creates linked login), award
  credit inline.
- **Credits** — award credit form (category + points + note), full
  transaction history.
- **Rewards** — catalog management (admin), redemption flow that atomically
  checks stock + student balance and deducts both.
- **House Points** — live per-house leaderboard from summed credit
  transactions.
- **Reports** — top students, credit category breakdown.
- **Analytics** — 6-month credit trend chart, teacher activity leaderboard.
- **Users** — admin can list/enable/disable accounts.
- **Settings** — current account info.

## 5. Extending it

- Add real photo uploads for avatars (currently placeholder initials/pravatar).
- Add a parent-specific view (the `parent` role exists in the schema/auth
  already — add a `renderParentHome()` view in `app.js` filtered to their
  linked child via `students.parent_id`).
- Add email notifications (e.g. via SendGrid) on credit awards.
- Add pagination to the students/credits tables once data grows.
