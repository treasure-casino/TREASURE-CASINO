# TREASURE CASINO — Render Production Deployment Guide

This guide provides end-to-end instructions for deploying the **TREASURE CASINO** backend Web Service and frontend Static Site to [Render](https://render.com/) with HTTPS, simulated demo financials, and persistent cloud MySQL.

---

## 1. Project Architecture & Directories

| Component | Path | Technology | Render Service Type |
| :--- | :--- | :--- | :--- |
| **Backend API** | `/backend` | Node.js 20 LTS, Express, TypeScript, Prisma ORM | **Web Service** |
| **Frontend UI** | `/admin` | React 18, Vite, TypeScript, TailwindCSS, Three.js | **Static Site** |
| **Database** | External Cloud | MySQL 8.0+ / MariaDB | **Managed Cloud Database** |

---

## 2. Persistent Cloud MySQL Database Options

Render's native PostgreSQL does not match MySQL syntax or Prisma's MySQL schema. Use any standard MySQL 8.0+ persistent cloud database provider:

1. **Aiven for MySQL** (Free tier available, 5 GB storage, MySQL 8.0 with SSL): [https://aiven.io/](https://aiven.io/)
2. **TiDB Cloud Serverless** (Free tier available, 5 GB storage, MySQL 8.0 protocol compatible): [https://tidbcloud.com/](https://tidbcloud.com/)
3. **Railway MySQL** (Persistent MySQL container): [https://railway.app/](https://railway.app/)
4. **AWS RDS / DigitalOcean Managed MySQL** (Production scale)

### Connection URL Format
```text
mysql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>?sslaccept=strict&connect_timeout=30
```
*(For Aiven or TiDB, append `?sslaccept=strict` or SSL parameters provided by the cloud console).*

---

## 3. Database Initialization (Zero Data Loss)

You have two simple options to initialize your cloud MySQL database:

### Option A: Clean Schema Push (Recommended for fresh deployment)
From your local terminal, point your cloud database URL temporarily to push the 34 tables:
```bash
cd backend
npx prisma db push
```
> **Automatic Bootstrapping**: When the backend starts for the first time, `bootstrapSystem()` automatically provisions the in-house game provider (`prov-inhouse`), the `Super Admin` role, the default admin account, and registers all 8 in-house games (`Treasure Hotline`, `Treasure Chicken Run`, `Treasure Limbo`, `Treasure Dice`, `Treasure Blackjack`, `Treasure Plinko`, `Treasure Keno`, `Treasure Hilo`).

### Option B: Export Existing Local XAMPP Data (Preserves all history & test users)
Export your local database without altering or deleting any local data:
```powershell
& "C:\xampp\mysql\bin\mysqldump.exe" -u root --default-character-set=utf8mb4 treasure_db > treasure_db_backup.sql
```
Import into your cloud MySQL database:
```bash
mysql -h <CLOUD_HOST> -P <CLOUD_PORT> -u <CLOUD_USER> -p <CLOUD_DB_NAME> < treasure_db_backup.sql
```

---

## 4. Render Deployment Step-by-Step

### Method 1: Blueprint Deployment via `render.yaml` or `render-admin.yaml`

#### Deploying ONLY the Admin Dashboard (Leaves existing backend untouched)
If your backend is already deployed and you want to deploy **only** the Admin Dashboard via Blueprint:
1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** > **Blueprint**.
2. Connect your repository `https://github.com/treasure-casino/TREASURE-CASINO`.
3. Set the **Blueprint Spec Path** to:
   ```text
   render-admin.yaml
   ```
4. Render will parse [`render-admin.yaml`](./render-admin.yaml) and deploy only the `treasure-casino-admin` Static Site without touching the backend!

#### Full Blueprint Deployment (Both Backend & Admin)
1. In the Render Dashboard, click **New +** > **Blueprint**.
2. Connect your repository. Render will automatically parse [`render.yaml`](./render.yaml).
4. Supply the pending variables prompted by Render:
   - `DATABASE_URL`: Your cloud MySQL connection string.
   - `ADMIN_DEFAULT_PASSWORD`: A secure password for the admin account.
   - `CORS_ORIGIN`: Your frontend URL (or leave blank and configure after step 2).

---

### Method 2: Manual Web Service Setup (Step-by-Step)

#### Step 4.1: Deploy Backend Web Service
1. Log in to [Render Dashboard](https://dashboard.render.com/) > **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name**: `treasure-casino-backend`
   - **Region**: `Oregon (US West)` (or your preferred region)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install --include=dev && npx prisma db push --accept-data-loss && npm run build
     ```
     *(Note: `--include=dev` guarantees Prisma CLI and TypeScript compile successfully in production mode).*
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Plan**: `Free`
   - **Health Check Path**: `/health`

4. Add **Environment Variables** in the Render Dashboard:

| Variable Name | Example / Recommended Value | Description |
| :--- | :--- | :--- |
| `NODE_VERSION` | `20` | Node.js runtime version |
| `NODE_ENV` | `production` | Production environment flag |
| `PORT` | `10000` | Render standard internal listening port |
| `DATABASE_URL` | `mysql://user:pass@host:port/dbname?sslaccept=strict` | Persistent cloud MySQL connection |
| `JWT_SECRET` | *(64-char random string or click Generate)* | Signing secret for user sessions |
| `JWT_REFRESH_SECRET` | *(64-char random string or click Generate)* | Signing secret for refresh tokens |
| `JWT_EXPIRATION` | `24h` | Access token lifespan |
| `JWT_REFRESH_EXPIRATION` | `7d` | Refresh token lifespan |
| `CORS_ORIGIN` | `https://treasure-casino-frontend.onrender.com` | Allowed frontend origin(s), comma-separated |
| `SIMULATED_PAYMENTS_ONLY` | `true` | Restricts financial operations to simulated demo mode |
| `PAYMENT_SIMULATION_DELAY_MS` | `1000` | Simulated latency for demo deposits/withdrawals |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window in ms (15 minutes) |
| `RATE_LIMIT_MAX` | `500` | Max requests per window |
| `ADMIN_DEFAULT_EMAIL` | `admin@treasure.com` | Default administrator username |
| `ADMIN_DEFAULT_PASSWORD` | *(Your secure password)* | Default administrator password |

5. Click **Create Web Service**. Wait for the build and deployment to complete.
6. Copy your assigned backend URL (e.g., `https://treasure-casino-backend.onrender.com`).

---

#### Step 4.2: Deploy Admin Dashboard Static Site
1. In the Render Dashboard, click **New +** > **Static Site**.
2. Connect your GitHub repository (`treasure-casino/TREASURE-CASINO`).
3. Configure the settings:
   - **Name**: `treasure-casino-admin`
   - **Region**: `Oregon (US West)` (or same as backend)
   - **Branch**: `main`
   - **Root Directory**: `admin`
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
   - **Publish Directory**: `dist`
4. Add **Environment Variables**:
   - `NODE_VERSION`: `20`
   - `VITE_API_URL`: `https://treasure-casino.onrender.com`
5. Configure **Redirects / Rewrites** (Essential for React Router SPA):
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
6. Click **Create Static Site**.
7. Your final live Admin Panel URL:
   ```text
   https://treasure-casino-admin.onrender.com
   ```

---

#### Step 4.3: Synchronize CORS
1. Go back to your **treasure-casino-backend** Web Service on Render.
2. Under **Environment**, update `CORS_ORIGIN` to match your frontend URL:
   ```text
   https://treasure-casino-frontend.onrender.com
   ```
   *(If you also access it locally or use a custom domain, separate them with commas: `https://treasure-casino-frontend.onrender.com,http://localhost:5173`).*
3. Render will automatically redeploy the backend service with the updated CORS origin.

---

## 5. Deployment Verification Checklist

Once both services show **Live**:

### 1. Backend Health Check
```bash
curl https://treasure-casino-backend.onrender.com/health
```
Expected output:
```json
{
  "status": "UP",
  "database": "MySQL / MariaDB Connected (treasure_db)",
  "simulatedMode": true,
  "timestamp": "..."
}
```

### 2. API Documentation (Swagger)
Open in browser:
```text
https://treasure-casino-backend.onrender.com/api-docs
```

### 3. Admin Authentication Check
```bash
curl -X POST https://treasure-casino-backend.onrender.com/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@treasure.com","password":"<YOUR_ADMIN_PASSWORD>"}'
```
Expected output:
```json
{
  "success": true,
  "message": "Admin authentication successful",
  "data": { "token": "..." }
}
```

### 4. Game Configuration & Endpoint Verifications
- `GET https://treasure-casino-backend.onrender.com/api/hotline/config`
- `GET https://treasure-casino-backend.onrender.com/api/chicken-run/config`
- `GET https://treasure-casino-backend.onrender.com/api/limbo/config`
- `GET https://treasure-casino-backend.onrender.com/api/dice/config`
- `GET https://treasure-casino-backend.onrender.com/api/blackjack/config`
- `GET https://treasure-casino-backend.onrender.com/api/plinko/config`
- `GET https://treasure-casino-backend.onrender.com/api/keno/config`
- `GET https://treasure-casino-backend.onrender.com/api/hilo/config`

---

## 6. Safety Commitments Maintained

- **Local Development Untouched**: Local `.env` files, local XAMPP databases, and dev commands (`npm run dev`) remain 100% intact.
- **Zero Hardcoded Secrets**: All keys, passwords, and tokens are read dynamically from environment variables.
- **Simulated Demo Mode Active**: Financial features default strictly to demo credits (`SIMULATED_PAYMENTS_ONLY=true`).
- **Idempotency & Provably Fair Engines**: All original games run server-authoritative calculations with nonces and SHA-256 commitments.
