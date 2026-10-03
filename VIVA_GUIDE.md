# 🎓 LifeLink: Viva Presentation & Code Walkthrough Guide

This guide is designed to help you confidently present the LifeLink project in your viva examination. It contains the optimal demonstration sequence and concise 2-3 line explanations for every key file in the codebase.

---

## 🎬 Recommended Viva Demo Order

1. **Public Landing Page & Search Directory (`/` and `/find-donors`)**:
   - Show the emergency response hero section, statistics, and verified donor/hospital directory filters.
   - Explain how public visitors can search for standby donors by blood group or location.

2. **User Experience & Pledging (`user@lifelink.com` / `user123`)**:
   - Log in as universal donor Alex Rivera (`O-`).
   - View standby availability toggle, cooldown status, emergency request feed, and pledge history.
   - Click **"Pledge Donation"** on an active emergency request.

3. **Hospital Hub & Unverified Gate (`hospital@lifelink.com` / `hospital123`)**:
   - Log in as City General Hospital.
   - Demonstrate the blood inventory stock management screen (units per blood group).
   - Show how unverified hospital accounts display a "Pending Admin Approval" banner and have request creation disabled.

4. **Admin AI Insights & Verification (`admin@lifelink.com` / `admin123`)**:
   - Log in as System Administrator.
   - View system analytics, total completed donations, and hospital approval table.
   - Verify a pending hospital account with 1-click approval.

5. **End-to-End Pledge Fulfill & Tracking (`/individual/track/:id`)**:
   - Open the tracked request page.
   - Show the Smart Matching Engine ranking candidates based on distance, compatibility matrix, and cooldown.
   - Click **"Mark Donation Completed"** — highlight that donor `lastDonationDate` updates instantly and hospital inventory stock increases automatically.

---

## 📁 Key File Explanations (2-3 Lines Each)

### Backend (Server)

- **`server/src/index.js`**: Application entry point that initializes express, CORS, rate limiting, MongoDB connection (or in-memory server), and mounts API router endpoints.
- **`server/src/config/db.js`**: Database connection utility that connects Mongoose to MongoDB or fallback in-memory database during local development.
- **`server/src/models/User.js`**: Mongoose schema for user accounts defining fields `name`, `email`, `password` (bcrypt hashed), `accountType` (`user`, `hospital`, `admin`), and linked `hospitalId`.
- **`server/src/models/DonorProfile.js`**: Schema storing donor health metrics, blood group, 2dsphere GeoJSON location coordinates, availability state, total donations, and `lastDonationDate`.
- **`server/src/models/Hospital.js`**: Schema for medical centers holding address, license number, `isVerified` status flag, and array of blood group inventory stock.
- **`server/src/models/BloodRequest.js`**: Schema representing emergency blood demands with patient name, required units, blood group, urgency level, 2dsphere location, and lifecycle status (`open`, `matching`, `fulfilled`, `cancelled`).
- **`server/src/models/Donation.js`**: Ledger schema linking donors and requests, tracking pledge date, completed donation timestamp, units donated, and status (`pledged`, `completed`).
- **`server/src/services/matching.service.js`**: Core algorithm querying MongoDB `$near` 2dsphere index and scoring candidates based on ABO/Rh compatibility, distance score, 90-day cooldown, and health flags.
- **`server/src/services/donation.service.js`**: Handles pledge creation and completion logic; updates donor `lastDonationDate`, increments total donations, marks requests fulfilled, and updates hospital inventory.
- **`server/src/services/auth.service.js`**: Handles user authentication, registration security (blocking API admin creation), password hashing, JWT token generation, and domain profile instantiation.
- **`server/src/services/request.service.js`**: Manages blood request creation with hospital verification check (`isVerified: true`), status updates, and automated donor notification triggers.
- **`server/src/middleware/auth.middleware.js`**: Express middleware verifying JWT authorization headers (`Bearer <token>`) and attaching authenticated user object to `req.user`.
- **`server/src/middleware/role.middleware.js`**: Role authorization middleware ensuring endpoints are restricted to specific `accountType` values (`user`, `hospital`, `admin`).
- **`server/src/utils/bloodCompatibility.js`**: Pure utility defining whole blood and RBC donor-recipient compatibility rules for all 8 blood types (`A+`, `O-`, etc.).

---

### Frontend (Client)

- **`client/src/App.jsx`**: Main client application component defining React Router routes, navbar layout, and protected route wrappers.
- **`client/src/context/AuthContext.jsx`**: Global authentication context provider managing user login state, JWT local storage persistence, and current profile hydration.
- **`client/src/context/ToastContext.jsx`**: Global toast notification context rendering animated success, error, and info popups across pages.
- **`client/src/routes/RoleRoute.jsx`**: Guard component enforcing account type route access, redirecting unauthorized users to their respective dashboards.
- **`client/src/pages/public/Home.jsx`**: Landing page displaying emergency request feed, platform statistics, features, and quick pledge triggers.
- **`client/src/pages/public/FindDonors.jsx`**: Regional directory search page enabling filtering of standby donors and verified hospital inventories by blood group and city.
- **`client/src/pages/donor/DonorDashboard.jsx`**: Standby donor command hub for managing availability status, viewing matching requests, and tracking pledge history.
- **`client/src/pages/hospital/HospitalDashboard.jsx`**: Hospital management dashboard featuring active request feeds, verification status banners, and donor match pings.
- **`client/src/pages/admin/AdminDashboard.jsx`**: Control panel for administrators to verify hospital registrations and review platform analytics.
- **`client/src/pages/individual/CreateRequest.jsx`**: Form component allowing users and hospitals to broadcast emergency blood requests with location inputs.
- **`client/src/pages/individual/TrackRequest.jsx`**: Real-time request tracking page rendering candidate donor rankings, pledge history, and donation completion actions.
- **`client/src/api/axiosClient.js`**: Centralized Axios instance configured with base URL and automatic JWT Authorization header interceptors.
