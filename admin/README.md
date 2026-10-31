# TREASURE Casino — Admin Management Portal

## Overview
The TREASURE Casino Admin Management Portal is a React 18 + TypeScript + Vite web application styled with a luxury black-and-gold theme. It connects strictly to the Node.js + TypeScript backend running at `http://localhost:5000` via authenticated REST APIs.

---

## Key Features Implemented

1. **Admin Authentication & RBAC:**
   - Dedicated login page at `/login`.
   - Authenticates against `POST /api/admin/auth/login` using seeded credentials (`admin@treasure.com` / `Admin123!`).
   - Secure session management with JWT tokens stored in `localStorage` and validated on boot (`GET /api/admin/auth/me`).
   - Auto-redirection for unauthenticated routes.

2. **Command Dashboard (`/`):**
   - KPI Stat Cards displaying live metrics: Total Registered Players, Active Players, Casino Games, Pending Withdrawals, and Gross Gaming Revenue.
   - Pending withdrawal alerts requiring financial administrator review.
   - Recent simulated deposit ledger log.
   - Game catalogue distribution by category.

3. **Player & User Management (`/users` & `/users/:id`):**
   - Paginated player search by email, phone, and referral code.
   - Status filtering (`ACTIVE`, `SUSPENDED`, `BANNED`).
   - Individual user inspection view showing profile details, wallet balance, reserved funds, immutable ledger history, game session rounds, and support tickets.
   - Status modification modal with mandatory audit reason logging (`PUT /api/admin/users/:id/status`).

4. **Simulated Financial Management (`/finance/deposits` & `/finance/withdrawals`):**
   - **Simulated Deposits Log:** Displays all deposit orders with payment provider channel and status.
   - **Withdrawal Review Desk:** Allows administrators to Approve (permanently deducts reserved funds) or Reject (safely refunds reserved funds to player balance with a recorded reason).
   - Clear compliance banners emphasizing simulated mode (no live payment gateway active).

5. **Game Catalogue Management (`/games`):**
   - Browse games by category (`SLOTS`, `CARD`, `ARCADE`, `CASUAL`, `FISHING`).
   - Register new authorized game titles (`POST /api/admin/games`).
   - Configure RTP %, betting limits (min/max bet), and active lobby visibility (`PUT /api/admin/games/:id`).

6. **Audit Logs & Security (`/audit-logs`):**
   - Immutable audit trail of every sensitive admin action with administrator identity, timestamp, and IP address.

7. **System Configuration (`/settings`):**
   - View and modify runtime platform parameters.
   - Verification of simulated financial controls.

8. **Unimplemented Backend Routes Handling (`/promotions`, `/support`):**
   - Displays clear `"Not Implemented in Backend"` notice instead of mock or fake actions, pointing out the required backend routes.

---

## Local Development & Testing Instructions

### 1. Ensure MySQL and Backend are running
Ensure XAMPP MySQL is started and the backend server is active:
```powershell
cd "c:\xampp\htdocs\TREASURE CASINO\backend"
npm start
```
Verify backend health: `http://localhost:5000/health`

### 2. Start Admin Frontend
Open a new PowerShell terminal:
```powershell
cd "c:\xampp\htdocs\TREASURE CASINO\admin"
npm run dev
```
Open your browser at: **`http://localhost:5173`**

### 3. Log In with Default Credentials
- **Email:** `admin@treasure.com`
- **Password:** `Admin123!`

