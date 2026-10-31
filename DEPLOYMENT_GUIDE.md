# TREASURE CASINO — Full-Stack Free Public Deployment Guide (Render)

This repository is fully configured for deployment on **Render** (or any cloud container platform) with a free public HTTPS subdomain (`.onrender.com`).

---

## 1. Project Architecture
- **Backend (`/backend`)**: Node.js + TypeScript, Express, Prisma ORM (MySQL), Swagger/OpenAPI.
- **Frontend (`/admin`)**: React 18 + Vite, TailwindCSS, Three.js, Lucide Icons, React Router SPA.
- **Database**: MySQL / MariaDB (`treasure_db`).

---

## 2. Persistent Free Cloud MySQL Setup
Because Render's free tier does not host MySQL, use one of the following 100% free, persistent cloud MySQL hosts:
- **Aiven for MySQL** (Free tier, 5 GB SSD, standard MySQL 8.0 SSL): [https://aiven.io/](https://aiven.io/)
- **TiDB Cloud (Serverless)** (Free tier, 5 GB storage, MySQL 8.0 wire-compatible): [https://tidbcloud.com/](https://tidbcloud.com/)

### Non-Destructive Local Database Export
To export your existing database (users, demo wallet balances, game history, and admin credentials) without losing data:
```powershell
& "C:\xampp\mysql\bin\mysqldump.exe" -u root --default-character-set=utf8mb4 treasure_db > treasure_db_dump.sql
```
Import it into your cloud database via:
```bash
mysql -h <HOST> -P <PORT> -u <USER> -p <DBNAME> < treasure_db_dump.sql
```

---

## 3. Render Deployment Setup

This repository contains a ready-to-use [`render.yaml`](./render.yaml) blueprint.

### Step 1: Deploy Backend Web Service
1. Log in to [Render Dashboard](https://dashboard.render.com/) > **New +** > **Web Service**.
2. Connect your private GitHub repository.
3. Configure:
   - **Name**: `treasure-casino-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
   - **Health Check Path**: `/health`
4. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `DATABASE_URL`: Your cloud MySQL connection string
   - `JWT_SECRET`: Random 64-character secret
   - `JWT_REFRESH_SECRET`: Random 64-character secret
   - `CORS_ORIGIN`: `https://treasure-casino-frontend.onrender.com` (update after Step 2)
   - `SIMULATED_PAYMENTS_ONLY`: `true`
   - `ADMIN_DEFAULT_EMAIL`: `admin@treasure.com`
   - `ADMIN_DEFAULT_PASSWORD`: Your chosen admin password
5. Click **Create Web Service**.

### Step 2: Deploy Frontend Static Site
1. Render Dashboard > **New +** > **Static Site**.
2. Connect the same repository.
3. Configure:
   - **Name**: `treasure-casino-frontend`
   - **Root Directory**: `admin`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Environment Variables:
   - `VITE_API_URL`: `https://treasure-casino-backend.onrender.com` (from Step 1)
5. Redirects/Rewrites (Crucial for React Router SPA):
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`
6. Click **Create Static Site**.

### Step 3: Link CORS
Update `CORS_ORIGIN` in the backend service with your assigned frontend URL:
`https://treasure-casino-frontend.onrender.com`

