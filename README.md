# LifeLink: Emergency Blood Donation & Medical Reserve Network 🩸

LifeLink is an emergency response web application powered by **Google Firebase Firestore & Firebase Auth** with Express.js and React. It bridges standby blood donors, individuals in critical need, and medical facilities through smart donor matching, real-time inventory management, and role-based workflows.

> ⚠️ **Security note:** Real credentials and `.env` files are never committed to GitHub. Copy `.env.example` templates to `.env` and configure your credentials locally.

---

## 🚀 Key Features

- 📍 **Smart Donor Matching Engine**: In-code spatial distance calculation and compatibility matrix ranking standby donors based on ABO/Rh RBC compatibility, 90-day donation cooldown eligibility, proximity distance, and availability.
- ⚡ **Emergency Request Broadcast**: Instant creation of emergency blood requests with live matched donor rankings and automated notification dispatch.
- 🏥 **Hospital Command Hub**: Medical facilities manage reserve stock, process blood requests, allocate inventory units, and track donor fulfillments with atomic transaction guarantees.
- 👤 **Donor Portal & Google Sign-In**: Standby donors manage availability, receive notifications, and sign in via traditional credentials or verified Google Single Sign-On (Firebase Auth).
- 🛡️ **Role-Based Governance**: Strict JWT authentication with distinct access controls for standard `user` (donor/recipient), verified `hospital`, and system `admin`.
- 📊 **AI Insights & Platform Analytics**: Administrative dashboard with emergency response time indicators, platform health metrics, and donor conversion insights computed in-code.
- 🧪 **Automated Backend Tests**: 177 Jest + Supertest tests using an isolated in-memory test database engine with full transaction support.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TailwindCSS, Lucide Icons, Axios, Firebase Web SDK (Auth) |
| **Backend** | Node.js, Express.js, JWT, bcryptjs, Zod validation, `firebase-admin` |
| **Database** | Google Cloud Firestore (Uniform Repository Architecture) |
| **Authentication** | Custom JWT + bcryptjs & Google Login (Firebase Auth ID Token verification) |
| **Testing** | Jest, Supertest (177 automated tests) |

---

## 👥 Role Architecture & Account Types

| Role | Registration | Key Privileges |
|---|---|---|
| **`user`** (Donor & Recipient) | Public sign-up / Google Sign-In | Post emergency requests, pledge donations, manage donor profile |
| **`hospital`** | Public sign-up | Broadcast requests (after admin approval), manage blood inventory |
| **`admin`** | Seed script only | Approve hospitals, manage users, view AI insights & analytics |

> **Role Elevation Guard:** Google Sign-In strictly provisions accounts with `accountType: "user"`. Hospital and Admin accounts cannot be created via Google Sign-In.

---

## 💻 Setup & Installation

### Prerequisites
- Node.js v18+ and npm
- A Firebase project with Cloud Firestore and Firebase Authentication enabled

### 1. Clone the repository
```bash
git clone https://github.com/tejas-coder28/LifeLink.git
cd LifeLink
```

### 2. Install dependencies

```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

### 3. Firebase Configuration & Environment Variables

#### Backend (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```bash
cp server/.env.example server/.env
```

Generate a Firebase Service Account key:
1. In the [Firebase Console](https://console.firebase.google.com/), open **Project Settings** > **Service accounts**.
2. Click **Generate new private key** and download the JSON file.
3. Place the JSON file securely (e.g., in `server/` or a secure directory) — ensure the file name matches `service-account*.json` (already in `.gitignore`).
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

### 4. Database Seeding & Verification

Verify backend health:
```bash
# Start backend in development
cd server
npm run dev
```
Visit `GET http://localhost:5000/api/health` to confirm:
```json
{
  "success": true,
  "status": "operational",
  "dbType": "firestore",
  "projectId": "your-firebase-project",
  "timestamp": "..."
}
```

Seed initial demo data:
```bash
cd server
npm run seed
```

### 5. Start the Application

```bash
# Terminal 1 — Start the API server
cd server
npm run dev

# Terminal 2 — Start the React frontend
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔄 MongoDB to Firestore Migration Tool

If you are migrating existing data from an existing MongoDB instance:

```bash
# 1. Inspect MongoDB collections in DRY RUN mode (safe, read-only):
node server/scripts/migrate-from-mongo.js

# 2. Execute live write to Firestore:
node server/scripts/migrate-from-mongo.js --confirm
```

**Safety Guarantees:**
- Defaults to **DRY RUN** mode (reports document counts and samples without modifying anything).
- MongoDB is **strictly read-only**; no documents are modified or removed.
- Preserves all original `_id` identifiers, references, timestamps, and nested data structures.
- Batches writes into chunks of 450 (well under Firestore's 500-op limit).

---

## 📜 NPM Scripts

### Server (`cd server`)

| Command | Description |
|---|---|
| `npm start` | Start production server |
| `npm run dev` | Start dev server with file watching |
| `npm run seed` | Seed demo accounts and inventory (safe, non-destructive) |
| `npm test` | Run all 177 automated tests (fast in-memory test runner) |

### Client (`cd client`)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build |

---

## 🔑 Demo Login Credentials

Seeded automatically by `npm run seed`:

| Role | Email | Password | Access & Privileges |
|---|---|---|---|
| **User** | `user@lifelink.com` | `user123` | Standby donor dashboard, pledge donations, update availability & location |
| **Hospital** | `hospital@lifelink.com` | `hospital123` | Broadcast requests, manage RBC inventory stock, confirm pledges |
| **Admin** | `admin@lifelink.com` | `admin123` | Approve hospital registrations, view system AI insights & analytics |

---

## 🗂️ Project Structure

```
LifeLink/
├── client/                      # React + Vite frontend
│   ├── src/
│   │   ├── api/                 # Axios service modules
│   │   ├── components/          # Reusable UI components & GoogleLoginButton
│   │   ├── context/             # Auth, Theme, Toast contexts
│   │   ├── pages/               # Route-level page components
│   │   ├── firebase.js          # Firebase Web Client Auth setup
│   │   └── routes/              # Protected & Role-based route wrappers
│   └── .env.example
├── server/                      # Express API backend
│   ├── src/
│   │   ├── config/              # Firebase Admin & Firestore initialization
│   │   ├── controllers/         # Express route handlers
│   │   ├── middleware/          # Auth, Role, Validate, RateLimit
│   │   ├── repositories/        # Firestore Repository abstraction layer
│   │   ├── routes/              # Express routers
│   │   ├── services/            # Domain logic, matching, and transactions
│   │   ├── utils/               # Blood compatibility, geo & response helpers
│   │   ├── validations/         # Zod schemas (including googleAuthSchema)
│   │   ├── app.js               # Express application factory
│   │   ├── index.js             # Server entry point
│   │   └── seed.js              # Database seed script
│   ├── scripts/
│   │   └── migrate-from-mongo.js# MongoDB to Firestore migration CLI
│   ├── tests/                   # Jest + Supertest suites (177 tests)
│   └── .env.example
├── firestore.indexes.json       # Composite Firestore index specifications
└── .gitignore
```
