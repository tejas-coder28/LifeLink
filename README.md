# LifeLink: Emergency Blood Donation & Medical Reserve Network 🩸

LifeLink is an emergency response web application built with the **MERN stack** (MongoDB, Express, React, Node.js). It bridges standby blood donors, individuals in critical need, and medical facilities through automated 2dsphere geospatial donor matching, real-time inventory management, and role-based workflows.

> ⚠️ **Security note:** The real `server/.env` is never committed. Copy `server/.env.example` to `server/.env` and fill in your own credentials before running locally.

---

## 🚀 Key Features

- 📍 **Smart Donor Matching Engine**: Geospatial `2dsphere` query scoring candidate donors based on ABO/Rh RBC compatibility matrix, 90-day donation cooldown eligibility, proximity distance, and health safety flags.
- ⚡ **Emergency Request Broadcast**: Instant creation of emergency blood requests with live matched donor rankings and automated notification dispatch.
- 🏥 **Hospital Command Hub**: Medical facilities manage reserve stock, process blood requests, view matched candidate pings, and track donor fulfillments.
- 👤 **Donor Portal**: Active standby donors manage profile availability, view nearby emergencies, track lifesaving pledge history, and receive notifications.
- 🛡️ **Role-Based Governance**: Strict JWT authentication with distinct access controls for standard `user` (donor/recipient), verified `hospital`, and system `admin`.
- 📊 **AI Insights & Analytics**: Administrative dashboard with platform health metrics, emergency response time indicators, and donor conversion insights.
- 🧪 **Automated Backend Tests**: 148 Jest + Supertest tests using an in-memory MongoDB (MongoMemoryServer) — never touches the real database.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TailwindCSS, Lucide Icons, Axios |
| **Backend** | Node.js, Express.js, JWT, bcryptjs, Zod validation |
| **Database** | MongoDB Atlas with Mongoose (Geospatial `2dsphere` indexing) |
| **Testing** | Jest, Supertest, mongodb-memory-server |

---

## 👥 Role Architecture & Account Types

| Role | Registration | Key Privileges |
|---|---|---|
| **`user`** (Donor & Recipient) | Public sign-up | Post emergency requests, pledge donations, manage donor profile |
| **`hospital`** | Public sign-up | Broadcast requests (after admin approval), manage blood inventory |
| **`admin`** | Seed script only | Approve hospitals, manage users, view AI insights & analytics |

> Admin accounts **cannot** be created via the API — only through `npm run seed`.

---

## 💻 Setup — Getting Started on a New Machine

### Prerequisites
- Node.js v18+ and npm
- A MongoDB Atlas cluster (or leave `MONGODB_URI=memory` to use in-memory dev DB)

### 1. Clone the repository

```bash
git clone https://github.com/tejas-coder28/LifeLink.git
cd LifeLink
```

### 2. Install dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 3. Configure environment

```bash
# Copy the example file and fill in your values
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<dbname>?retryWrites=true&w=majority
JWT_SECRET=<generate-a-strong-random-secret>
NODE_ENV=development
```

> **Tip:** To run without Atlas during local development, set `MONGODB_URI=memory` — the server will start an in-memory MongoDB automatically.

### 4. Seed demo data & start servers

```bash
# Terminal 1 — Start the API server (with auto-seed on empty DB)
cd server
npm run dev

# Terminal 2 — Start the React frontend
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📜 NPM Scripts

### Server (`cd server`)

| Command | Description |
|---|---|
| `npm start` | Start production server |
| `npm run dev` | Start dev server with file watching |
| `npm run seed` | Seed demo users, hospitals, requests |
| `npm run seed:reset` | Wipe DB and re-seed from scratch |
| `npm test` | Run all 148 automated tests (uses in-memory DB, safe) |

### Client (`cd client`)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview the production build |

---

## 🔑 Demo Login Credentials

> These credentials are seeded by `npm run seed`. They are for local demo only.

| Role | Email | Password | Access & Privileges |
|---|---|---|---|
| **User** | `user@lifelink.com` | `user123` | Standby donor dashboard, pledge donations, update availability & location |
| **Hospital** | `hospital@lifelink.com` | `hospital123` | Broadcast requests, manage RBC inventory stock, confirm pledges |
| **Admin** | `admin@lifelink.com` | `admin123` | Approve hospital registrations, view system AI insights & analytics |

---

## 🔐 Security & Environment Variables

- `server/.env` is listed in `.gitignore` and is **never committed to this repository**.
- Copy `server/.env.example` to `server/.env` and supply your own Atlas URI and JWT secret.
- The `npm test` command uses `MONGODB_URI=memory` (MongoMemoryServer) — it will **never read your real Atlas URI**.

---

## 🗂️ Project Structure

```
LifeLink/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── api/             # Axios service modules
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # Auth, Theme, Toast contexts
│   │   ├── pages/           # Route-level page components
│   │   └── routes/          # Protected & Role-based route wrappers
│   └── .env.example
├── server/                  # Express API backend
│   ├── src/
│   │   ├── config/          # MongoDB connection
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/       # Auth, Role, Validate, RateLimit
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Business logic layer
│   │   ├── utils/           # Blood compatibility, geo helpers
│   │   ├── validations/     # Zod schemas
│   │   ├── app.js           # Express app factory (no listen — for testing)
│   │   └── index.js         # Server entry point
│   ├── tests/               # Jest + Supertest test suites (148 tests)
│   ├── docs/                # Postman collection
│   ├── .env.example         # ← Copy this to .env
│   └── .env                 # ← NOT committed (gitignored)
└── .gitignore
```
