# LifeLink Data Architecture & Domain Model

## 1. Architectural Overview & Data Residency

LifeLink combines cloud-native document persistence, secure tokenized identity, and role-scoped AI tooling:

| Layer | Technology | Residency & Security Policy |
| :--- | :--- | :--- |
| **Primary Database** | Google Cloud Firestore | Real cloud Firestore project (`lifelink-f6f3b`). Atomic multi-document transactions govern email uniqueness (`emails` collection) and request-pledge allocations. |
| **Identity & OAuth** | Firebase Auth + JWT | Google sign-in tokens are verified server-side with `firebase-admin/auth` (`verifyIdToken`). Session credentials issue signed 30-day JWTs with role claims (`id`, `accountType`). |
| **Password Storage** | Bcrypt | 10 salt rounds applied to standard email/password registration. Generated random 24-byte hex passwords applied to first-time Google OAuth registrations. |
| **AI Assistant** | Google Gemini + Tool Mesh | Tool-only execution. Gemini has zero direct database write permissions. Context-aware server tools enforce role boundaries, data masking (no donor phone/email leaks), and read-only access. |
| **Chat Memory** | Ephemeral Browser State | AI chat history resides in React memory during the user session and is never persisted to Firestore, protecting user search privacy. |

---

## 2. Firestore Collections Schema

| Collection | Key Document Fields | Description |
| :--- | :--- | :--- |
| `users` | `_id`, `name`, `email`, `password`, `accountType` (`user`, `hospital`, `admin`), `hospitalId`, `phone`, `createdAt`, `updatedAt` | Core identity document. |
| `emails` | `_id` (normalized email), `userId`, `email`, `createdAt` | Transactional uniqueness lock preventing race-condition duplicate account registrations. |
| `donorProfiles` | `_id`, `user` (ref), `bloodGroup`, `bloodGroupConfirmed`, `isAvailable` (standby), `location` (`Point [lon, lat]`), `address`, `lastDonationDate`, `healthFlags`, `totalDonations`, `profileComplete` | Donor clinical and standby state. |
| `hospitals` | `_id`, `user` (ref), `name`, `licenseNumber`, `phone`, `address`, `location` (`Point [lon, lat]`), `isVerified`, `inventory` (`Array<{ bloodGroup, units }>`) | Verified partner facilities and blood bank stock. |
| `bloodRequests` | `_id`, `requester` (ref), `targetHospital` (ref), `patientName`, `bloodGroup`, `unitsNeeded`, `unitsFulfilled`, `urgency` (`critical`, `high`, `medium`, `low`), `status`, `location`, `matchedDonorsCount` | Emergency clinical demands and fulfillment tracking. |
| `donations` | `_id`, `donor` (ref), `donorProfile` (ref), `request` (ref), `hospital` (ref), `unitsDonated`, `status` (`pledged`, `completed`, `cancelled`), `completedAt` | Donor commitments, hospital intakes, and historical donation records. |
| `notifications` | `_id`, `recipient` (ref), `type`, `title`, `message`, `read`, `link`, `createdAt` | Targeted alerts and emergency broadcast pings. |
| `aiInsights` | `_id`, `title`, `summary`, `metrics` (`highRiskBloodGroups`, `surplusGroups`), `recommendations`, `createdAt` | AI-generated network risk and reserve shortage alerts. |
| `inventoryTransactions` | `_id`, `hospital` (ref), `bloodGroup`, `change` (integer), `reason`, `request` (ref), `createdAt` | Complete audit log of blood stock increments and debits. |
| `loginAuditLogs` | `_id`, `userId`, `email`, `timestamp`, `ipAddress` | Non-blocking security audit trail for user authentication events. |

---

## 3. Request & Pledge Lifecycles

### Blood Request Lifecycle
```mermaid
stateDiagram-v2
    [*] --> OPEN: Hospital or Patient submits request
    OPEN --> MATCHING: Auto-matching identifies compatible standby donors
    MATCHING --> PARTIALLY_FULFILLED: Donor pledges some required units
    PARTIALLY_FULFILLED --> FULFILLED: All required units pledged & verified
    OPEN --> FULFILLED: Direct hospital inventory allocation
    OPEN --> CANCELLED: Requester or Hospital cancels request
    PARTIALLY_FULFILLED --> CANCELLED: Request cancelled (releases active pledges)
    FULFILLED --> CLOSED: Patient discharge / intake finalized
    CLOSED --> [*]
    CANCELLED --> [*]
```

### Donor Pledge Lifecycle
```mermaid
sequenceDiagram
    autonumber
    actor Donor
    participant Web as LifeLink Web App
    participant API as Backend API & Tools
    participant DB as Firestore
    actor Hospital as Hospital Staff

    Donor->>Web: Clicks "Review & Pledge" on compatible request
    Web->>API: POST /api/donations/pledge { requestId, units: 1 }
    API->>DB: Create donation (status: 'pledged')
    API->>DB: Increment request.matchedDonorsCount
    API-->>Web: Pledge confirmed
    Note over Donor,Hospital: Donor travels to Medical Facility

    Hospital->>Web: Opens "Active Requests" > "Awaiting Confirmation"
    Web->>API: GET /api/donations/hospital-pending
    API-->>Web: Returns pending pledges (donor name, units, blood group)
    Hospital->>Web: Confirms donor donation intake
    Web->>API: POST /api/donations/:id/confirm
    API->>DB: Update donation status: 'completed'
    API->>DB: Update request unitsFulfilled (+1)
    API->>DB: Update donorProfile lastDonationDate (triggers 90-day cooldown)
    API->>DB: Increment hospital inventory stock (+1 unit)
    API-->>Web: Intake verified & stock credited
```
