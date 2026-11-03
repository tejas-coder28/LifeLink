# LifeLink: Emergency Blood Donation & Medical Reserve Network 🩸

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase Firestore](https://img.shields.io/badge/Google_Firestore-Cloud_DB-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Firebase Auth](https://img.shields.io/badge/Firebase_Auth-Google_SSO-FFA000?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Jest Tests](https://img.shields.io/badge/Jest_Tests-177_Passed-C21325?logo=jest&logoColor=white)](https://jestjs.io/)
[![WCAG](https://img.shields.io/badge/WCAG_2.1-AA%2FAAA_Compliant-005A9C)](https://www.w3.org/WAI/standards-guidelines/wcag/)

LifeLink is an emergency response web application powered by **Google Cloud Firestore & Firebase Auth** with Express.js and React. It bridges standby blood donors, individuals in critical need, and medical facilities through smart donor matching, real-time inventory management, spatial UI design, and role-based workflows.

> [!WARNING]
> **Security Note:** Real credentials and `.env` files are never committed to GitHub. Copy `.env.example` templates to `.env` in both `server/` and `client/` directories and configure your credentials locally.

---

## 🚀 Key Capabilities

- 📍 **Smart Donor Matching Engine**: In-code spatial distance calculation and compatibility matrix ranking standby donors based on ABO/Rh RBC compatibility, 90-day donation cooldown eligibility, proximity distance, and availability.
- ⚡ **Emergency Request Broadcast & Tracking**: Instant creation of emergency blood requests (`/individual/create`) with live matched donor rankings and automated notification dispatch. Recipients can monitor progress in real time via an interactive stepper tracking portal (`/individual/track/:id`).
- 🏥 **Hospital Command Hub & Reserve Stock**: Medical facilities manage reserve stock across all 8 standard blood groups, process incoming requests, allocate inventory units, and track donor fulfillments with atomic transaction guarantees.
- 👤 **Donor Portal & Google Sign-In**: Standby donors manage availability, track donation history and cooldown eligibility, and authenticate via traditional credentials or verified Google Single Sign-On (Firebase Auth ID Token verification).
- 🛡️ **Role-Based Access Control**: Strict JWT authentication with distinct access controls for standard `user` (donor & recipient), verified `hospital`, and system `admin`.
- 💎 **Liquid Glass & Spatial UI**: Apple-inspired translucent glass aesthetic with 5 spatial elevation tiers, 4 harmonic drifting atmospheric orbs, dynamic refraction filters, and full light/dark mode support.
- 📊 **AI Insights & Platform Analytics**: Administrative dashboard with emergency response time indicators, platform health metrics, shortage prediction alerts, and an interactive AI Chatbot assistant.
- 🧪 **Comprehensive Automated Testing & QA**: 177 automated Jest + Supertest backend tests (10 test suites, 100% pass) alongside automated WCAG 2.1 AA/AAA contrast checks and Playwright visual audits.

---

## 🎨 Liquid Glass & Spatial UI Design System

LifeLink features a refined **"Midnight Navy + Crimson + Ice"** design system built for life-critical healthcare applications, balancing visceral cinematic depth with clinical calm and uncompromising accessibility across both dark and light modes:

- **Midnight Navy + Crimson + Ice Direction**:
  - **Clinical, Trustworthy, Calm**: Midnight Navy (`#0A0F1C`) dark foundation and Cool White (`#F4F7FB`) light canvas base, paired with Silver-blue neutrals and clear semantic signals.
  - **10% Emergency Crimson Budget**: Crimson is reserved strictly for life-critical signals (primary CTAs, emergency/critical badges, urgent request status indicators, active nav indicator). It represents $\le 10\%$ of any viewport, preserving its immediate urgency.
  - **Semantic Mapping**: ONLINE / Verified Facility / Confirmed / Fulfilled $\rightarrow$ `success`; cooldown / low stock / pending $\rightarrow$ `warning`; critical stock / urgent request $\rightarrow$ `danger`; informational / focus $\rightarrow$ `info`. Always paired with icons and text labels (never color alone).

### Semantic Design Tokens (Single Source of Truth)

| Token | Dark Mode | Light Mode | Usage & Purpose |
|---|---|---|---|
| `canvas` | `#0A0F1C` | `#F4F7FB` | Base viewport foundation |
| `surface` | `#111A2E` | `#FFFFFF` | Core data cards, inputs, containers |
| `raised` | `#18233D` | `#E9EFF7` | Filter panels, interactive forms, active cards |
| `overlay` | `#1F2C4A` | `#FFFFFF` + shadow | Dialog modals, full-screen sheets |
| `text-primary` | `#E8EEF9` | `#0F1A2E` | High-contrast headings and key data values |
| `text-muted` | `#9DAAC6` | `#4A5A78` | Captions, secondary subtitles, metadata |
| `hairline` | `rgba(147,161,189,0.16)` | `rgba(15,26,46,0.12)` | Subtle glass borders and divider lines |
| `specular rim` | `rgba(255,255,255,0.08)` | `rgba(255,255,255,0.90)` | Top-edge optical specular highlight |
| `danger` (text/icon/badge) | `#E5484D` | `#C8102E` | Critical shortages, emergency request badges |
| `danger-solid` (button fill) | `#D13438` | `#C8102E` | Primary emergency CTAs with white text ($\ge 4.5:1$) |
| `danger hover` | `#FF6166` | `#A80D26` | Interactive hover state for danger buttons |
| `danger pressed` | `#B82C30` | `#8A0A1F` | Pressed active state for danger buttons |
| `success` | `#34D399` | `#0A7A62` | ONLINE status, verified facilities, fulfilled donations |
| `warning` | `#FBBF24` | `#9A5B00` | Cooldown warnings, low stock, pending reviews |
| `info / focus` | `#60A5FA` | `#1D6FD6` | Keyboard focus ring (2px with 2px offset), info pills |
| `ice` (accent) | `#A5D8FF` | `#1D6FD6` | AI assistance, secondary highlights, subtle glow accents |

- **5-Tier Spatial Elevation System**:
  - `elevation-canvas` (Level 0): Viewport foundation and atmospheric canvas.
  - `elevation-base` (Level 1): Standard data cards, list tiles, and tabular rows.
  - `elevation-raised` (Level 2): Active items, interactive forms, and filter panels.
  - `elevation-floating` (Level 3): Floating navigation bar, AI chat widget, and toast alerts.
  - `elevation-overlay` (Level 4): High-priority dialog modals and full-screen drawers.
- **Atmospheric Canvas**: 4 harmonic, hardware-accelerated (`translate3d`) ambient orbs (dim crimson, royal blue `#2B4C8C`, ice blue `#A5D8FF`, and silver-blue `#93A1BD`), dimmed to $\le 12\%$ opacity in dark mode and $\le 8\%$ in light mode with `prefers-reduced-motion` fallback.
- **Optics & Refraction**: Neutral navy-tinted glass in dark mode, clean white glass with genuine elevation shadows (`0 1px 2px rgba(15,26,46,.06)`, `0 8px 24px rgba(15,26,46,.08)`) in light mode, SVG displacement map filters (`#liquid-refraction`), and top specular rims.
- **Accessibility & Contrast**: 100% WCAG 2.1 AA/AAA compliance verified across all routes and state views in both modes (body text $\ge 11.8:1$ dark, $\ge 15.0:1$ light; white text on danger-solid $\ge 4.9:1$ dark, $\ge 5.8:1$ light; focus rings $\ge 4.5:1$). Tabular numeric fonts (`tabular-nums`) prevent layout shifts.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, Framer Motion, Lucide Icons, Recharts, Axios |
| **Backend** | Node.js, Express.js 4, `firebase-admin` 14, JWT, bcryptjs, Zod validation |
| **Database & Cloud** | Google Cloud Firestore (Uniform Repository Architecture), Firebase Auth |
| **Authentication** | Custom JWT + bcryptjs & Google Login (Firebase Auth ID Token verification) |
| **Testing & QA** | Jest, Supertest, Playwright, `@axe-core/playwright` (177 automated tests) |

---

## 👥 Role Architecture & Account Types

| Role / Account Type | Registration | Key Privileges |
|---|---|---|
| **`user`** (Donor & Recipient) | Public registration / Google Sign-In | Post emergency requests, track request progress, pledge donations, manage availability & donor profile |
| **`hospital`** | Public registration (requires admin approval) | Broadcast emergency requests, manage RBC inventory units, ping matching donors, confirm fulfilled donations |
| **`admin`** | Database seed script | Approve hospital registrations, manage platform users & requests, view AI insights & analytics |

> [!NOTE]
> **Role Elevation Guard:** Google Sign-In strictly provisions accounts with `accountType: "user"`. Hospital and Admin accounts cannot be provisioned via Google Sign-In, protecting elevated system roles.

---

## 💻 Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher) and `npm`
- A [Firebase Project](https://console.firebase.google.com/) with **Cloud Firestore** and **Firebase Authentication** (Email/Password & Google Provider) enabled

---

### 1. Clone the Repository
```bash
git clone https://github.com/tejas-coder28/LifeLink.git
cd LifeLink
```

---

### 2. Install Dependencies
You can install dependencies for the root, server, and client simultaneously from the repository root:

```bash
# Install all dependencies across client and server
npm run install:all
```

Or install them individually:
```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

---

### 3. Environment Configuration

#### Backend (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```bash
cp server/.env.example server/.env
```

Generate a Firebase Service Account key:
1. In the [Firebase Console](https://console.firebase.google.com/), navigate to **Project Settings** > **Service accounts**.
2. Click **Generate new private key** and download the resulting JSON file.
3. Save the JSON file securely (e.g. `server/service-account.json` — already included in `.gitignore`).
4. Configure `server/.env`:
```env
PORT=5000
JWT_SECRET=your_super_secret_jwt_key
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
NODE_ENV=development
```

#### Frontend (`client/.env`)
Copy `client/.env.example` to `client/.env`:
```bash
cp client/.env.example client/.env
```

Populate the Firebase Web SDK credentials from **Project Settings** > **General** > **Your apps** > **Web app**:
```env
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

### 4. Database Seeding & Health Check

Verify backend health:
```bash
# Start backend in development
npm run dev:server
```
Visit `GET http://localhost:5000/api/health` to confirm operational status:
```json
{
  "success": true,
  "status": "operational",
  "dbType": "firestore",
  "projectId": "your-firebase-project",
  "timestamp": "..."
}
```

Seed initial demo accounts and inventory stock:
```bash
# From root
npm run seed

# Or to reset and re-seed clean data
npm run seed:reset
```

---

### 5. Running the Application

You can run both client and server using the root convenience scripts or dedicated terminals:

#### Option A: Dedicated Terminals (Recommended for Development)
```bash
# Terminal 1 — Start the API Server (Port 5000)
npm run dev:server

# Terminal 2 — Start the React Client (Port 5180)
npm run dev:client
```

#### Option B: From Subdirectories
```bash
# Terminal 1:
cd server && npm run dev

# Terminal 2:
cd client && npm run dev
```

Open your browser at **[http://localhost:5180](http://localhost:5180)**.

> [!TIP]
> The client Vite dev server runs on port **5180** with an automated proxy forwarding `/api/*` requests to the Express backend on `http://127.0.0.1:5000`.

---

## 🧪 Testing & Quality Assurance

LifeLink includes a rigorous automated testing and accessibility assurance suite:

### Backend Automated Tests (Jest + Supertest)
```bash
# Run 177 automated backend tests
cd server
npm test
```
- **10 Test Suites / 177 Tests**: 100% pass rate.
- Covers authentication, blood compatibility scoring, spatial matching algorithms, donation fulfillment, hospital workflows, transaction integrity, rate limiting, and role guards.

### Automated WCAG Contrast Audit
```bash
# Run automated color contrast validation
npm run check:contrast
```
- Evaluates all token foreground and background color combinations in both Dark and Light modes.
- Enforces WCAG 2.1 AA/AAA compliance (normal text $\ge 4.5:1$, large text / UI elements $\ge 3.0:1$).

### Playwright & axe-core Full-Route Audit
```bash
# Run headless browser audit with automated screenshot capture
npm run audit:pages
```
- Traverses every public, donor, hospital, and admin route.
- Verifies contrast, focus rings, interactive states, and saves high-resolution screenshots to `scripts/screenshots/`.

---

## 🔑 Demo Credentials

Seeded automatically by `npm run seed`:

| Role | Email | Password | Access & Privileges |
|---|---|---|---|
| **User / Donor** | `user@lifelink.com` | `user123` | Standby donor dashboard, pledge donations, track requests, update availability & location |
| **Hospital** | `hospital@lifelink.com` | `hospital123` | Broadcast emergency requests, manage 8-group RBC inventory stock, ping donors, confirm pledges |
| **Admin** | `admin@lifelink.com` | `admin123` | Approve hospital registrations, manage platform accounts, view AI insights & analytics |

---

## 📡 API Endpoint Reference

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/auth/register` | `POST` | Public | Register standard donor or hospital account |
| `/api/auth/login` | `POST` | Public | Authenticate with email/password and obtain JWT |
| `/api/auth/google` | `POST` | Public | Verify Firebase Google ID token and issue JWT session |
| `/api/requests` | `GET` | Public / Auth | List blood requests with filter criteria |
| `/api/requests` | `POST` | `user`, `hospital` | Create a new emergency blood request |
| `/api/requests/:id` | `GET` | Authenticated | Retrieve request details with live matched donors |
| `/api/donors` | `GET` | Public / Auth | Query standby donors by blood group and radius |
| `/api/donations/pledge` | `POST` | `user` | Pledge donation for an active emergency request |
| `/api/donations/:id/fulfill`| `POST` | `hospital`, `admin`| Confirm donation fulfillment and update inventory |
| `/api/hospitals/inventory` | `GET`, `PUT` | `hospital` | View and update RBC reserve units |
| `/api/hospitals/pending` | `GET` | `admin` | View hospital accounts awaiting verification |
| `/api/hospitals/:id/approve`| `PUT` | `admin` | Approve registered hospital |
| `/api/analytics` | `GET` | `admin` | Aggregate platform donation metrics and trends |
| `/api/ai/insights` | `GET` | `admin` | Predictive regional blood supply insights |
| `/api/health` | `GET` | Public | Backend health check and Firestore connection status |

---

## 🗂️ Project Structure

```
LifeLink/
├── client/                          # React + Vite frontend (Port 5180)
│   ├── src/
│   │   ├── api/                     # Axios service API clients
│   │   ├── components/              # Modular UI component library
│   │   │   ├── ai/                  # AI Chat Widget & Insight Cards
│   │   │   ├── auth/                # Google Login Button & Auth Panels
│   │   │   ├── cards/               # Donor, Request, and Stat Cards
│   │   │   ├── charts/              # Recharts Visualizations (Blood Group Bar, Trends, Status Pie)
│   │   │   ├── common/              # GlassCard, GlassModal, Navbar, Footer, ThemeToggle
│   │   │   └── forms/               # DonorProfileForm, InventoryForm, RequestForm
│   │   ├── context/                 # AuthContext, ThemeContext, ToastContext
│   │   ├── hooks/                   # useTheme, useChartTheme, useTypewriterFill
│   │   ├── pages/                   # Application views
│   │   │   ├── admin/               # AdminDashboard, UserManagement, RequestManagement, AIInsights
│   │   │   ├── auth/                # Login, Register, ForgotPassword
│   │   │   ├── donor/               # DonorDashboard, DonorProfile, DonationHistory
│   │   │   ├── hospital/            # HospitalDashboard, InventoryManager, MatchingDonors
│   │   │   ├── individual/          # CreateRequest, TrackRequest, IndividualDashboard
│   │   │   └── public/              # Home, About, FindDonors, EmergencyRequest
│   │   ├── routes/                  # ProtectedRoute and AccountTypeRoute wrappers
│   │   ├── theme/                   # Central design system tokens (tokens.js)
│   │   ├── utils/                   # statusHelper, date formatting, geo helpers
│   │   ├── firebase.js              # Firebase Web SDK initialization
│   │   └── index.css                # Liquid Glass design system styles & CSS variables
│   ├── tailwind.config.js           # Tailwind configuration with spatial elevations
│   ├── vite.config.js               # Vite server configuration & API proxy
│   └── .env.example
├── server/                          # Express API backend (Port 5000)
│   ├── src/
│   │   ├── config/                  # Firebase Admin & Firestore initialization
│   │   ├── controllers/             # Express route handler controllers
│   │   ├── middleware/              # JWT Auth, RoleGuard, Zod Validation, RateLimiter
│   │   ├── repositories/            # Google Cloud Firestore Uniform Repository layer
│   │   ├── routes/                  # Express API routers
│   │   ├── services/                # Domain logic, matching engine, atomic transactions
│   │   ├── utils/                   # ABO/Rh compatibility, geo math, response helpers
│   │   ├── validations/             # Zod input validation schemas
│   │   ├── app.js                   # Express application setup
│   │   ├── index.js                 # Server entry point
│   │   └── seed.js                  # Database seed and reset script
│   ├── tests/                       # Automated Jest + Supertest suites (177 tests)
│   └── .env.example
├── docs/                            # Documentation
│   ├── design-system.md             # Liquid Glass & Spatial UI specification
│   └── ui-audit.md                  # Comprehensive UI inventory and audit
├── scripts/                         # QA & Verification Tools
│   ├── check-contrast.js            # Automated WCAG 2.1 AA/AAA token contrast checker
│   └── audit-pages.js               # Playwright + axe-core full-route auditor
├── firestore.indexes.json           # Composite Firestore database indexes
├── package.json                     # Monorepo management scripts
└── README.md
```

---

## 📜 NPM Scripts Summary

### Root Scripts (`LifeLink/`)

| Script | Command | Purpose |
|---|---|---|
| `npm run install:all` | `npm install --prefix server && npm install --prefix client` | Install all dependencies across both projects |
| `npm run dev:server` | `npm run dev --prefix server` | Start Express backend in watch mode (Port 5000) |
| `npm run dev:client` | `npm run dev --prefix client` | Start Vite frontend dev server (Port 5180) |
| `npm run seed` | `npm run seed --prefix server` | Seed demo accounts, inventory, and sample requests |
| `npm run seed:reset` | `npm run seed:reset --prefix server` | Clear and re-seed database |
| `npm run build` | `npm run build --prefix client` | Build optimized client production bundle |
| `npm run check:contrast`| `node scripts/check-contrast.js` | Run automated WCAG AA/AAA contrast audit |
| `npm run audit:pages` | `node scripts/audit-pages.js` | Run Playwright visual and accessibility route audit |

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
