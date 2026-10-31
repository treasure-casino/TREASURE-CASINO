# PRD — TREASURE CASINO GAMING APP

**Version:** 1.0  
**Platform:** Android  
**App Name:** TREASURE  
**Technology:** Kotlin, Node.js, PostgreSQL  
**Admin Panel:** Web Dashboard

## 1. Product Overview

TREASURE is a premium casino-style gaming application inspired by the provided reference video. It will feature a dark black-and-gold interface, multiple game categories, user accounts, a wallet, rewards, VIP membership, referrals, and a separate admin dashboard.

The application must use a private backend database and secure APIs. Real-money functionality will remain disabled until applicable legal and payment-provider approvals are confirmed.

## 2. Product Objectives

- Deliver a modern, smooth casino-style gaming experience.
- Provide secure registration and login.
- Support a diverse catalog of authorized games.
- Implement a reliable wallet and transaction history.
- Provide deposit and withdrawal workflows.
- Enable administrators to manage users, games, transactions, and promotions.
- Protect financial records and personal information.
- Support future expansion through modular architecture.

## 3. Target Users

- Registered adult users in legally permitted jurisdictions.
- Users interested in casual games and authorized casino-style games.
- Administrators managing application operations.
- Finance staff reviewing payment and withdrawal requests.
- Support staff assisting users.

## 4. Core Features

### 4.1 Home Screen

- Premium black-and-gold design.
- Promotional banners and announcements.
- Featured and popular games.
- Game categories and search.
- Recently played and favorite games.
- Wallet balance display.
- VIP and rewards promotions.
- Bottom navigation: Home, Invite, Deposit, Rewards, Chat, Member.

### 4.2 Authentication

- Email and password registration.
- Mobile-number login.
- OTP verification through a configured provider.
- Password reset and secure logout.
- Account verification and status management.
- Optional two-factor authentication.

### 4.3 Game Lobby

- Slots, arcade, card, casual, fishing, and other permitted categories.
- Game thumbnails and descriptions.
- Game provider integration.
- Favorites and recently played lists.
- Game loading and error states.
- Demo games when production integrations are unavailable.

Only licensed or otherwise authorized games may be integrated. Real-money wagering must be restricted unless legally permitted.

### 4.4 Wallet and Transactions

- Available and reserved balance.
- Deposit history.
- Withdrawal history.
- Transaction IDs and timestamps.
- Transaction status tracking.
- Clear error and failure messages.
- Auditable ledger of every balance movement.

**Deposit workflow:** Create payment order → complete provider payment → verify payment server-side → credit wallet once → record transaction.

**Withdrawal workflow:** Submit request → validate balance and eligibility → reserve funds → admin/provider processing → confirm payout or safely release reserved funds if the payout fails.

Real-money transactions must be disabled until the required approvals are obtained.

### 4.5 Rewards and VIP

- Daily rewards.
- Promotional offers.
- VIP levels and progress.
- Coupon codes.
- Reward claim history.
- Referral rewards.
- Reward eligibility and expiration rules.

Rewards must be validated by the backend and protected against duplicate claims and abuse.

### 4.6 Referral System

- Unique referral codes.
- Shareable invitation links.
- Referral tracking.
- Eligible referral rewards.
- Referral history.
- Duplicate-account and referral-fraud prevention.

### 4.7 User Profile and Support

- Profile information.
- Account verification status.
- Security settings.
- Transaction history.
- Notifications.
- Support tickets or chat.
- Responsible gaming controls.
- Terms, privacy policy, and account deletion requests.

## 5. Admin Panel

Create a separate responsive web dashboard with secure authentication and role-based permissions.

### Dashboard
- Registered and active users.
- Deposit and withdrawal summaries.
- Pending transactions.
- Payment failures.
- Game activity and reward statistics.

### User Management
- Search users.
- Review account status and verification.
- Suspend or reactivate accounts with an audit reason.
- View transaction history.
- Review support tickets.

### Financial Management
- Review payment records.
- Verify provider transaction references.
- Review withdrawal requests.
- Approve or reject eligible requests with recorded reasons.
- Track payout status and reconciliation issues.
- Prevent duplicate credits and payouts.

### Game and Promotion Management
- Manage authorized game listings.
- Organize game categories.
- Update promotional banners.
- Configure rewards and VIP tiers.
- Manage referral campaigns.

### System Management
- Configure integrations through secure server-side settings.
- Enable maintenance mode.
- Review security alerts.
- Manage administrator roles and permissions.
- View audit logs.

No admin action may silently overwrite completed financial records or erase audit history.

## 6. Private Database

Use PostgreSQL hosted in a secured server environment.

Required tables:

- `users`
- `user_profiles`
- `user_sessions`
- `identity_verifications`
- `wallets`
- `wallet_transactions`
- `payment_orders`
- `deposits`
- `withdrawals`
- `game_catalog`
- `game_providers`
- `game_sessions`
- `rewards`
- `reward_claims`
- `vip_levels`
- `referrals`
- `notifications`
- `support_tickets`
- `admin_users`
- `admin_roles`
- `admin_permissions`
- `admin_audit_logs`
- `system_settings`

Use foreign keys, indexes, database constraints, secure access controls, migrations, and backups.

Passwords must be hashed. Secrets must be stored outside the source code. Financial operations must use database transactions, idempotency protection, and an auditable ledger.

## 7. Technical Architecture

| Component | Technology |
|---|---|
| Android application | Kotlin |
| UI framework | Jetpack Compose |
| Backend API | Node.js + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Admin panel | React + TypeScript |
| Authentication | Secure backend authentication |
| Payment integration | Authorized provider APIs |
| API documentation | OpenAPI/Swagger |
| Deployment | Secured backend and database hosting |

The Android application, backend API, database, and admin dashboard are separate components connected through authenticated HTTPS APIs.

## 8. Security Requirements

- HTTPS for all network requests.
- Secure password hashing.
- Role-based access control.
- Rate limiting and login protection.
- Server-side input validation.
- Protected environment variables.
- Payment webhook signature verification.
- Duplicate transaction prevention.
- Audit logging.
- Database backups and recovery procedures.
- Administrator multi-factor authentication.
- Protection against unauthorized balance modification.
- Personal-data minimization and appropriate retention controls.

## 9. Legal and Compliance Requirements

Before production launch, verify applicable Indian central and state laws, game eligibility, age and location restrictions, payment-provider terms, identity verification requirements, privacy obligations, and any necessary licensing or approvals.

The app must not enable prohibited gambling or unauthorized payment processing. A disclaimer alone is not sufficient to establish legality.

## 10. MVP Scope

The initial release should include:

1. Android app UI and navigation.
2. Registration and login.
3. Game lobby with demo games.
4. User profile and support.
5. Private PostgreSQL database.
6. Backend APIs.
7. Wallet and transaction history using simulated funds.
8. Simulated deposit and withdrawal workflows.
9. Admin dashboard.
10. Rewards and referrals.
11. Automated security and workflow tests.

Production payment integration is a later milestone, conditional on legal and provider approval.

## 11. Acceptance Criteria

- Users can register, log in, and log out securely.
- Game categories and demo games work correctly.
- User data persists in the private database.
- Wallet transactions are recorded consistently.
- Duplicate payment events cannot credit the wallet twice.
- Concurrent withdrawals cannot overspend the balance.
- Admin permissions are enforced server-side.
- All sensitive admin actions are audited.
- Failed operations produce understandable errors.
- Automated tests cover authentication, financial workflows, and access control.
- The Android app can be built as a debug APK.
- Setup and deployment instructions are documented.

## 12. Development Roadmap

**Phase 1:** UI design and Android navigation.  
**Phase 2:** Authentication, backend APIs, and database.  
**Phase 3:** Game lobby and demo integrations.  
**Phase 4:** Wallet, ledger, and simulated payments.  
**Phase 5:** Admin panel and transaction management.  
**Phase 6:** Rewards, VIP, referrals, and support.  
**Phase 7:** Security testing, deployment preparation, and legal review.  
**Phase 8:** Authorized production payment integration, if permitted.

## 13. Final Deliverables

- Complete Android Kotlin source code.
- Backend source code.
- Private database schema and migrations.
- Admin dashboard source code.
- API documentation.
- Environment configuration template.
- Automated tests.
- APK build instructions.
- Deployment and backup guide.
- Security and production-readiness checklist.
