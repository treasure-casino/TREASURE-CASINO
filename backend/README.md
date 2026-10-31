# TREASURE CASINO - Backend API & MySQL Integration Guide

## 1. Overview
The TREASURE Casino backend has been migrated and configured to use **XAMPP MySQL / MariaDB** (`treasure_db`) as the primary relational database. All financial transactions, user authentication, game records, rewards, and administrative actions utilize atomic database transactions, optimistic concurrency control, and an immutable ledger.

---

## 2. Database Architecture (MySQL / MariaDB)

### Database Details:
- **Server:** XAMPP MySQL / MariaDB (10.4+)
- **Database Name:** `treasure_db`
- **Default Port:** `3306`
- **Character Set:** `utf8mb4`
- **Collation:** `utf8mb4_unicode_ci`

### Core Tables Implemented (24 entities):
1. `users` — Authentication credentials, referral code, account status (`ACTIVE`, `SUSPENDED`, `BANNED`).
2. `user_profiles` — Player profile details, country, personal information.
3. `user_sessions` — Active JWT user sessions with IP and user-agent.
4. `identity_verifications` — KYC identity verification requests.
5. `wallets` — Player wallet balance (`balance`), `reserved_balance`, and optimistic locking `version`.
6. `wallet_transactions` — Immutable financial ledger recording all balance changes with idempotency keys.
7. `payment_orders` — Payment gateway orders (configured in `SIMULATED` mode).
8. `deposits` — Deposit records linked to payment orders and wallet transactions.
9. `withdrawals` — Withdrawal payout requests with bank/UPI details and status tracking (`PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`).
10. `game_providers` — Game development studios and provider metadata.
11. `games` (aliased as `game_catalog`) — Catalog of casino games with RTP, betting ranges, and demo modes.
12. `game_sessions` — Game round history with bet amounts and win amounts.
13. `game_favorites` — Player favorite games bookmarks.
14. `rewards` — Daily check-ins, VIP tier perks, and promotional coupon codes.
15. `reward_claims` — Claim history preventing duplicate daily reward exploits.
16. `vip_levels` — Tier configurations (Bronze, Silver, Gold, Platinum, Diamond) with bonus multipliers and perks.
17. `referrals` — Friend invitation tracking and referral reward distribution.
18. `admin_roles` — RBAC roles (`SuperAdmin`, `FinanceManager`, `SupportAgent`, `GameOperator`).
19. `admin_permissions` — Granular resource-action permission matrix.
20. `admin_users` — Administrator login accounts with hashed passwords and audit linkage.
21. `admin_audit_logs` — Immutable audit log recording every sensitive admin mutation with IP address.
22. `support_tickets` — Customer service inquiry tickets.
23. `notifications` — In-app player notifications.
24. `system_settings` — Dynamic server-side flags including maintenance mode and simulation controls.

---

## 3. Database Setup & Migration

### Option A: Direct SQL Import via XAMPP MySQL (Fastest)
Run the automated SQL setup script located at `backend/sql/setup_database.sql`:

```powershell
# From the project root or backend folder:
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "source c:/xampp/htdocs/TREASURE CASINO/backend/sql/setup_database.sql"
```

Or import `backend/sql/setup_database.sql` through **phpMyAdmin** (`http://localhost/phpmyadmin`).

### Option B: Prisma Schema Generation & Push
If deploying through Prisma tooling:

```powershell
cd "c:\xampp\htdocs\TREASURE CASINO\backend"
npx prisma db push
npx prisma generate
```

---

## 4. Environment Variables Configuration

Database credentials are **strictly stored in server environment variables** (`.env`) and are **never exposed to the Android mobile app or web frontend**.

### Local Development (`.env`):
```env
PORT=5000
NODE_ENV=development

# XAMPP MySQL Local Credentials
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=treasure_db
DATABASE_URL="mysql://root:@localhost:3306/treasure_db?connect_timeout=30"

# JWT Secrets
JWT_SECRET=treasure_jwt_secret_dev_key_super_secure_984512
JWT_REFRESH_SECRET=treasure_jwt_refresh_dev_key_super_secure_741258
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=7d

# Regulatory & Provider Approval Safeguards
SIMULATED_PAYMENTS_ONLY=true
PAYMENT_SIMULATION_DELAY_MS=1000
```

### Remote / Production Secured Deployment:
For staging or production hosting (e.g., AWS RDS Aurora MySQL, Google Cloud SQL, or a hardened Linux VPS):

1. **Dedicated Database User:** Never use the `root` superuser. Create a dedicated application user with restricted privileges:
   ```sql
   CREATE USER 'treasure_app'@'%' IDENTIFIED BY 'StrongRandomPassword123#$';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, REFERENCES ON `treasure_db`.* TO 'treasure_app'@'%';
   FLUSH PRIVILEGES;
   ```
2. **Enforce SSL/TLS Connections:**
   ```env
   DATABASE_URL="mysql://treasure_app:StrongRandomPassword123%23%24@db.treasure.prod:3306/treasure_db?sslaccept=strict&sslcert=/path/to/server-ca.pem"
   ```
3. **Firewall & VPC Isolation:** Ensure port `3306` is not exposed to the public internet; bind MySQL to a private subnet accessible only from backend application instances.

---

## 5. Security & Financial Ledger Architecture

- **Simulated Financial Workflows:** Real-money wagering and payment processor transactions remain disabled (`SIMULATED_PAYMENTS_ONLY=true`).
- **Deposit Process:** User submits deposit request -> Simulated payment order created -> Server verifies order -> Wallet credited atomically using an idempotency key -> Transaction recorded in ledger.
- **Withdrawal Process:** User requests withdrawal -> Available balance is validated -> Funds are transferred to `reservedBalance` in a database transaction -> Request placed in `PENDING` status.
- **Admin Review:**
  - **Approve:** `reservedBalance` is deducted, status updated to `COMPLETED`, audit log recorded.
  - **Reject:** `reservedBalance` is released back to available `balance`, status updated to `REJECTED` with reason, refund transaction recorded in ledger, audit log recorded.
- **Password Security:** All passwords are encrypted using `bcrypt` (12 salt rounds).
- **Audit Trails:** All sensitive admin actions (user status updates, withdrawal approvals/rejections, game creation, setting updates) create an immutable entry in `admin_audit_logs`.

---

## 6. How to Run the Backend

```powershell
cd "c:\xampp\htdocs\TREASURE CASINO\backend"

# 1. Install dependencies
npm install

# 2. Generate Prisma Client for MySQL
npx prisma generate

# 3. Build TypeScript
npm run build

# 4. Start production server
npm start

# Or run in live reload development mode:
npm run dev
```

Server endpoints will be active on:
- API Base: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/health`
- Swagger Documentation: `http://localhost:5000/api-docs`

---

## 7. Default Credentials (Seeded)

- **Admin Dashboard:**
  - URL: `http://localhost:5000/api/admin/auth/login`
  - Email: `admin@treasure.com`
  - Password: `Admin123!`
  - Role: `SuperAdmin`

