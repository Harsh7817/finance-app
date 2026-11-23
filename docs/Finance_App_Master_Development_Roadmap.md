# AI-Powered Personal Finance & Smart Expenditure Advisor
## Master Development Roadmap

**Project stack:** Node.js, Express.js, JavaScript, PostgreSQL, Prisma  
**Database baseline:** Frozen Prisma schema v1.1  
**Initial database migration:** `20261021111649_init`

---

## 1. Project Overview

The application will help users manage financial accounts, track transactions, understand spending patterns, plan budgets and savings goals, and receive data-backed expenditure recommendations.

The existing Prisma schema v1.1 is the approved database baseline. It should remain frozen during ordinary feature development and should only be revisited if a concrete implementation issue requires a change.

### Technology decisions

| Area | Technology / decision |
|---|---|
| Backend runtime | Node.js |
| Backend framework | Express.js |
| Programming language | JavaScript |
| Database | PostgreSQL |
| ORM and migrations | Prisma 6 |
| Database client | Prisma Client |
| First transaction import method | CSV bank statements (via Android file picker & backend processing) |
| Later transaction source | Android SMS, subject to permissions and platform policies |
| Client application (Frontend) | Native Android App (Kotlin / Jetpack Compose) or Cross-Platform Mobile (React Native / Flutter) implementing the approved Figma UI |

### Core design principle

Financial calculations such as balances, budget utilization, affordability and forecasts must be computed by deterministic application logic. An AI/LLM component may explain results and provide natural-language guidance, but must not invent authoritative financial figures.

## 2. Overall Development Phases

1. Environment and database setup
2. Backend foundation
3. Authentication and user management
4. Financial account management
5. Transaction management and CSV imports
6. Financial dashboard and analytics
7. Budget management
8. Financial goals and savings management
9. Recurring expenditure management
10. Financial intelligence and prediction engine
11. AI-powered smart expenditure advisor
12. Notifications, feedback and audit management
13. Android application development & frontend integration
14. Android SMS transaction ingestion
15. Testing, security and mobile optimization
16. Deployment, packaging and final documentation

---

# 3. Detailed Implementation Roadmap

## Phase 1 — Environment and Database Setup

**Status: Completed**

### Tasks
- [x] Install and configure PostgreSQL 18.6.
- [x] Create the `finance_app` database.
- [x] Initialize the Node.js project and `package.json`.
- [x] Install Prisma CLI and Prisma Client 6.19.3.
- [x] Configure the database connection through the root `.env` file.
- [x] Validate the existing Prisma schema v1.1.
- [x] Apply the initial Prisma migration.
- [x] Generate Prisma Client.
- [x] Verify migration status.
- [x] Verify 22 application tables plus `_prisma_migrations`.
- [x] Organize database documentation under `docs/`.
- [x] Place `schema.prisma` under `prisma/`.

### Completion criteria
- PostgreSQL is running locally.
- `finance_app` exists.
- Prisma connects successfully.
- The initial migration is applied.
- Prisma reports that the database schema is up to date.

### Notes
Four Prisma referential-action warnings involving `SetNull` were reported during validation. They did not prevent validation or the initial migration. Keep them documented and investigate if they cause a concrete implementation or data-integrity issue.

---

## Phase 2 — Backend Foundation

**Status: Completed**

### Objectives
Create the Express application infrastructure and establish a reliable connection to PostgreSQL through a reusable Prisma Client.

### 2.1 Express application configuration
- [x] Initialize the Express application.
- [x] Configure JSON request-body parsing.
- [x] Configure CORS according to frontend requirements.
- [x] Add request logging.
- [x] Establish a consistent API response convention.
- [x] Keep application configuration separate from server startup.

### 2.2 Prisma integration
- [x] Create one reusable Prisma Client instance.
- [x] Export the shared instance for use by services and controllers.
- [x] Establish database connectivity handling.
- [x] Handle connection failures.
- [x] Disconnect Prisma gracefully during server shutdown.

### 2.3 Server configuration
- [x] Configure the development server and port.
- [x] Start the Express application from a dedicated server entry point.
- [x] Configure Nodemon for development.
- [x] Handle startup errors and graceful shutdown.

### 2.4 API foundation
- [x] Add a basic health-check endpoint.
- [x] Add a database connectivity check.
- [x] Add centralized error-handling middleware.
- [x] Add a 404 handler for unknown routes.

### Expected deliverable
A running Express backend with a health endpoint that confirms the application and PostgreSQL connection are working.

---

## Phase 3 — Authentication and User Management

**Status: Completed**

### 3.1 Registration
- [x] Build the registration endpoint.
- [x] Validate required registration fields.
- [x] Enforce email uniqueness.
- [x] Hash passwords securely.
- [x] Create the user record.
- [x] Create the associated default user profile where appropriate.
- [x] Apply default application preferences.

### 3.2 Login and session management
- [x] Build the login endpoint.
- [x] Verify email and password.
- [x] Implement token-based authentication or the selected session approach.
- [x] Validate authentication credentials on protected requests.
- [x] Implement logout/session invalidation as appropriate.

### 3.3 User profile
- [x] Retrieve the authenticated user's profile.
- [x] Update profile information.
- [x] Configure currency and preferences.
- [x] Configure savings targets.
- [x] Configure financial risk preferences.

### 3.4 Authorization and consent
- [x] Implement authentication middleware.
- [x] Implement role-based access control.
- [x] Enforce user ownership on data access.
- [x] Protect private endpoints.
- [x] Implement consent management.

### Expected deliverable
Users can register and log in, manage their profiles, and access only their own data.

---

## Phase 4 — Financial Data Source & Account Management

**Status: Completed**

> **Note on simplified scope:** Live bank account linking is not required. The application focuses on collecting and managing users' transaction data via CSV statement imports (Phase 5) and SMS parsing (future). Phase 4 provides the data source registry and underlying logical accounts required to track transaction origins (e.g. HDFC statement vs SBI statement vs SMS), detect duplicates, and maintain balance records under the frozen schema.

### 4.1 Data source registry & source tracking
- [x] Register transaction data sources (`CSV_STATEMENT`, `ANDROID_SMS`, `MANUAL_INPUT`).
- [x] Associate data sources with providers (e.g., HDFC Bank, SBI Bank, Android SMS).
- [x] Attach customizable metadata to sources for import tracking.
- [x] Automatically provision underlying logical accounts to satisfy relational integrity without mandatory bank login.
- [x] Activate, deactivate, and update data sources.

### 4.2 Account operations (Optional manual management)
- [x] Retrieve data source details and associated accounts.
- [x] Optional manual creation of accounts (bank, cash, wallet) for users who wish to customize them.
- [x] Support opening balances and balance snapshots.
- [x] List and filter accounts and data sources by user.

### Expected deliverable
Users can define transaction data sources (CSV statements, SMS, etc.) and view their organized accounts without mandatory live bank linking.

---

## Phase 5 — Transaction Management and CSV Imports

**Status: Completed**

### 5.1 Manual transaction management
- [x] Add income transactions.
- [x] Add expense transactions.
- [x] Record transfer transactions.
- [x] Edit transaction details.
- [x] Exclude or reverse transactions according to application rules.
- [x] Retrieve transaction history.

### 5.2 CSV statement import
- [x] Accept CSV files.
- [x] Validate file type, size and structure.
- [x] Parse CSV records.
- [x] Identify transaction date, description, amount and transaction type.
- [x] Normalize transaction descriptions.
- [x] Associate imported records with the correct financial account.
- [x] Validate individual records.
- [x] Identify invalid or incomplete records.
- [x] Detect potential duplicate transactions.
- [x] Create and track import batches.
- [x] Preserve raw import data where required.
- [x] Create valid transaction records.
- [x] Produce an import summary with successful, rejected and duplicate counts.

### 5.3 Transaction categorization
- [x] Build rule-based categorization.
- [x] Support system-defined categories.
- [x] Support user-defined categories.
- [x] Handle unknown or ambiguous merchants.
- [x] Allow users to correct categories.
- [x] Record categorization history.
- [x] Use feedback to improve future categorization rules.

Example merchant mappings:

| Description | Possible category |
|---|---|
| Swiggy | Food & Dining |
| Uber | Transportation |
| Amazon | Shopping |
| Netflix | Entertainment |
| Electricity bill | Utilities |

Merchant names are clues, not guaranteed classifications. Provide a review path for ambiguous records.

### 5.4 Search and filtering
- [x] Filter by date range.
- [x] Filter by category.
- [x] Filter by account.
- [x] Filter by transaction type and status.
- [x] Search merchant or description.
- [x] Sort by amount and date.
- [x] Add pagination.

### Expected deliverable
A reliable transaction management system with CSV importing, duplicate handling and editable categorization.

---

## Phase 6 — Financial Dashboard and Analytics

**Status: Completed**

### 6.1 Dashboard overview
- [x] Display total income.
- [x] Display total expenditure.
- [x] Display account balances.
- [x] Calculate net savings.
- [x] Calculate monthly savings rate.

### 6.2 Expense analytics
- [x] Category-wise spending.
- [x] Account-wise spending.
- [x] Daily expenditure.
- [x] Weekly expenditure.
- [x] Monthly expenditure.
- [x] Income-versus-expenditure summaries.

### 6.3 Historical comparisons
- [x] Compare current month with previous month.
- [x] Compare current week with previous week.
- [x] Show spending trends.
- [x] Show category-level spending changes.

### 6.4 Visualizations
- [x] Income and expense charts.
- [x] Category distribution charts.
- [x] Monthly spending trends.
- [x] Savings progress charts.

### Expected deliverable
A dashboard that clearly explains where money comes from, where it goes and how spending changes over time.

---

## Phase 7 — Budget Management

**Status: Completed**

### 7.1 Budget creation
- [x] Create monthly budgets.
- [x] Create weekly budgets.
- [x] Create category-specific budgets.
- [x] Configure overall spending limits.

### 7.2 Budget tracking
- [x] Calculate actual expenditure for each budget period.
- [x] Calculate remaining budget.
- [x] Calculate budget utilization.
- [x] Track spending against limits.

### 7.3 Budget alerts
- [x] Notify users when approaching a budget limit.
- [x] Notify users when a limit is reached.
- [x] Notify users when a budget is exceeded.
- [x] Identify category-level overspending.

### 7.4 Budget analytics
- [x] Compare planned and actual expenditure.
- [x] Show historical budget performance.
- [x] Identify frequently exceeded categories.

### Expected deliverable
Users can create budgets and understand whether their spending is within planned limits.

---

## Phase 8 — Financial Goals and Savings Management

**Status: Completed**

### 8.1 Goal creation
- [x] Create savings goals.
- [x] Define target amounts.
- [x] Define target dates.
- [x] Configure goal priority.

### 8.2 Contributions
- [x] Record contributions.
- [x] Track accumulated savings.
- [x] Maintain contribution history.
- [x] Associate contributions with financial accounts where appropriate.

### 8.3 Progress monitoring
- [x] Calculate goal completion percentage.
- [x] Calculate remaining amount.
- [x] Estimate required periodic savings.
- [x] Identify delayed goals.

### 8.4 Goal analytics
- [x] Display completed goals.
- [x] Display active goals.
- [x] Track progress over time.
- [x] Summarize savings performance.

### Expected deliverable
Users can track progress toward short-term and long-term financial objectives.

---

## Phase 9 — Recurring Expenditure Management

**Status: Completed**

### 9.1 Recurring commitment management
- [x] Add recurring commitments.
- [x] Configure supported frequencies.
- [x] Define expected amounts.
- [x] Maintain expected payment dates.

### 9.2 Recurring expense identification
- [x] Analyze transaction history.
- [x] Identify repeated merchant names.
- [x] Compare transaction intervals.
- [x] Identify recurring payment patterns.
- [x] Provide a review mechanism before treating uncertain patterns as confirmed commitments.

### 9.3 Monitoring
- [x] Display upcoming recurring expenses.
- [x] Calculate monthly recurring expenditure.
- [x] Identify changes in recurring payment amounts.
- [x] Highlight potentially forgotten subscriptions.

### Expected deliverable
Users can understand and monitor their recurring financial obligations.

---

## Phase 10 — Financial Intelligence and Prediction Engine

**Status: Pending**

### 10.1 Spending analysis
- [ ] Analyze spending patterns.
- [ ] Identify high-expenditure categories.
- [ ] Detect unusual spending increases.
- [ ] Identify frequent merchants.
- [ ] Calculate average daily and monthly spending.

### 10.2 Financial forecasting
- [ ] Forecast future expenses.
- [ ] Estimate month-end expenditure.
- [ ] Estimate future account balances.
- [ ] Predict category-level spending where sufficient data exists.

### 10.3 Financial health analysis
- [ ] Calculate savings rate.
- [ ] Analyze income-to-expense ratio.
- [ ] Analyze budget performance.
- [ ] Evaluate recurring obligations.
- [ ] Track financial goal progress.

### 10.4 Anomaly detection
- [ ] Identify unusually high transactions.
- [ ] Identify sudden spending increases.
- [ ] Identify unusual transaction patterns.
- [ ] Flag suspicious or unexpected records for user review.

### 10.5 Prediction evaluation
- [ ] Store prediction results.
- [ ] Compare predictions with actual outcomes.
- [ ] Measure prediction errors.
- [ ] Improve forecasting methods based on historical performance.

### Expected deliverable
A financial intelligence engine that produces explainable, data-backed insights and forecasts.

---

## Phase 11 — AI-Powered Smart Expenditure Advisor

**Status: Pending — Core differentiating feature**

### 11.1 Financial context preparation
Collect relevant, permissioned information:
- [ ] Current account balances.
- [ ] Monthly income.
- [ ] Monthly expenditure.
- [ ] Budget utilization.
- [ ] Savings targets.
- [ ] Financial goals.
- [ ] Recurring commitments.
- [ ] Recent spending patterns.

### 11.2 Affordability analysis
Evaluate:
- [ ] Proposed purchase amount.
- [ ] Available balance.
- [ ] Remaining budget.
- [ ] Essential upcoming expenses.
- [ ] Savings commitments.
- [ ] Existing financial obligations.
- [ ] User's configured financial risk preference.

### 11.3 Recommendation engine
Use the outcomes already represented in the project schema:

| Outcome | Intended meaning |
|---|---|
| `BUY` | The purchase appears affordable within the evaluated financial context. |
| `CONSIDER_WAITING` | Delaying the purchase may be financially preferable. |
| `AVOID_FOR_NOW` | The purchase could negatively affect financial commitments. |

- [ ] Define transparent affordability rules.
- [ ] Define how conflicting financial signals are handled.
- [ ] Include data freshness and insufficient-data handling.
- [ ] Store the recommendation and supporting context appropriately.

**Important:** Deterministic financial calculations produce authoritative figures and recommendation inputs. The AI component explains those results; it must not invent balances, budgets or affordability calculations.

### 11.4 AI-generated explanations
- [ ] Explain why a recommendation was generated.
- [ ] Explain possible effects on monthly spending.
- [ ] Identify affected budgets.
- [ ] Explain possible effects on savings goals.
- [ ] Suggest practical alternatives.
- [ ] Present insights in natural language.

### 11.5 Advisory history and feedback
- [ ] Store advisory requests.
- [ ] Store recommendation decisions.
- [ ] Track decision history.
- [ ] Allow users to submit feedback.
- [ ] Analyze recommendation usefulness.

### Expected deliverable
A user can enter a proposed purchase and receive a comprehensible, financially grounded recommendation.

---

## Phase 12 — Notifications, Feedback and Audit Management

**Status: Pending**

### 12.1 Notifications
- [ ] Budget threshold notifications.
- [ ] Budget exceeded notifications.
- [ ] Upcoming recurring payment notifications.
- [ ] Financial goal updates.
- [ ] Unusual spending alerts.
- [ ] Import completion notifications.

### 12.2 Feedback
- [ ] Collect feedback on advisory recommendations.
- [ ] Record whether recommendations were useful.
- [ ] Analyze feedback trends.

### 12.3 Audit management
- [ ] Record important account actions.
- [ ] Track important financial data changes.
- [ ] Maintain relevant activity history.
- [ ] Support administrative auditing.

### Expected deliverable
A transparent application with useful notifications and traceable operations.

---

## Phase 13 — Android Application Development & Frontend Integration

**Status: Pending**

Implement the approved Figma UI design for Android, ensuring native mobile ergonomics, responsive touch interactions, and secure API communication with the Node.js backend.

### 13.1 Android mobile foundation
- [ ] Set up the Android application project (Gradle configuration, dependencies, AndroidManifest).
- [ ] Implement the approved Figma design system (typography, colors, themes, dark/light mode).
- [ ] Configure Android navigation architecture (Navigation graphs, bottom navigation bar, deep links).
- [ ] Create reusable mobile UI components (buttons, input fields, cards, metric chips, loaders).
- [ ] Configure networking client (Retrofit / Ktor / Axios) with base URL, timeout handling, and JSON serialization.
- [ ] Implement secure authentication storage using Android Keystore / EncryptedSharedPreferences.
- [ ] Set up HTTP authentication interceptor for JWT token injection and 401 automatic logout handling.

### 13.2 Authentication & profile screens
- [ ] Registration screen with input validation.
- [ ] Login screen with JWT token acquisition and secure storage.
- [ ] Optional biometric login prompt (Fingerprint / Face Unlock via BiometricPrompt API).
- [ ] User profile screen (currency preference, monthly stated income, savings targets).
- [ ] Consent management screen (view, grant, and withdraw privacy consents).

### 13.3 Core financial screens
- [ ] Dashboard screen (summary cards, net balance, monthly income vs expense quick view).
- [ ] Financial accounts screen (list accounts, cached balances, account creation).
- [ ] Transaction history screen (infinite scrolling / pagination, search query bar, filter chips).
- [ ] Manual transaction entry dialog (amount, date, merchant, category selector, debit/credit toggle).
- [ ] CSV statement upload (Android Storage Access Framework / file picker `Intent.ACTION_GET_CONTENT` with multipart upload).
- [ ] Category management screen (system categories, custom category creator, color/icon picker).
- [ ] Budget management screen (budget cards, utilization progress bars, threshold warning badges).
- [ ] Financial goals screen (target tracking, goal progress bars, quick-contribution modal).
- [ ] Recurring commitments screen (upcoming subscriptions list, monthly commitment breakdown).

### 13.4 Intelligence & advisory screens
- [ ] Financial analytics & insights screen (visual charts, category spending breakdown, historical trends).
- [ ] Expense predictions screen (forecasted month-end spending, category forecasts).
- [ ] Smart Expenditure Advisor screen (interactive "Can I afford this?" purchase evaluation input).
- [ ] Advisory recommendation modal (decision badge: `BUY`, `CONSIDER_WAITING`, `AVOID_FOR_NOW`, affordability score, budget/goal impact breakdown, AI natural-language explanation).
- [ ] Advisory history and user feedback submission (thumbs up/down, helpfulness rating).
- [ ] In-app notification center (budget warnings, recurring payment due reminders, alert dismissals).

### 13.5 Mobile user experience & offline resiliency
- [ ] Shimmer loading states and skeleton screens.
- [ ] Informative empty states with actionable buttons.
- [ ] Pull-to-refresh on financial lists and dashboard.
- [ ] Network status banner / offline detector.
- [ ] Form validation with immediate inline mobile error messaging.
- [ ] Destructive action confirmation dialogs (delete account, archive budget, delete goal).

### Expected deliverable
A fully functional Android application communicating securely with the backend API, rendering all core financial and advisory features.

---

## Phase 14 — Android SMS Transaction Ingestion

**Status: Pending — Mobile-first data source**

### 14.1 Android permissions & Google Play policy compliance
- [ ] Review Google Play Financial App SMS policy requirements (`RECEIVE_SMS`, `READ_SMS`).
- [ ] Implement runtime permission request flow with clear in-app disclosure and user consent.
- [ ] Provide fallback ingestion alternatives (SMS Retriever / User Consent API or CSV-only mode) if elevated permissions are withheld or restricted.
- [ ] Implement user toggle in Settings to enable/disable background SMS sync at any time.

### 14.2 Android background SMS capture & sync
- [ ] Create an Android `BroadcastReceiver` / `Telephony.Sms.Intents.SMS_RECEIVED_ACTION` for real-time incoming SMS.
- [ ] Schedule background sync via Android `WorkManager` for batch ingestion and periodic checks.
- [ ] Pre-filter candidate bank/financial SMS based on approved sender IDs (e.g., bank header alphacodes) and currency keywords to avoid scanning personal texts.
- [ ] Sanitize and redact raw SMS locally before transmission (strip OTPs, CVVs, full card numbers, and unrelated text).

### 14.3 Backend SMS ingestion & parsing integration
- [ ] Implement backend endpoint `POST /api/v1/imports/sms` accepting structured/sanitized SMS payloads.
- [ ] Store raw message preview and content hash in `raw_messages` table to prevent duplicate ingestion.
- [ ] Apply bank-specific regex/NLP parsing pipeline to extract amount, merchant, date, and transaction type.
- [ ] Auto-assign financial account and predict category using the categorization engine.
- [ ] Flag ambiguous messages (`FLAGGED_FOR_REVIEW`) for user confirmation in the Android review queue.

### Expected deliverable
An end-to-end automated SMS transaction ingestion pipeline running on Android and syncing seamlessly with the backend database.

---

## Phase 15 — Testing, Security and Mobile Optimization

**Status: Pending**

### 15.1 Backend & database testing
- [ ] Unit tests for all business services (budget, goals, recurring, advisory, calculations).
- [ ] API integration tests across all route endpoints.
- [ ] Authentication and tenant isolation tests (`WHERE user_id = req.user.id`).
- [ ] Database constraint, concurrency, and transaction integrity tests.
- [ ] Performance profiling on complex SQL aggregation queries.

### 15.2 Android application testing
- [ ] Unit tests for client-side viewmodels, state reducers, and parsing utilities.
- [ ] API client mock tests (handling 200, 400, 401, 403, 500 responses).
- [ ] Android UI instrumentation tests (screen navigation, form validations, dialog interactions).
- [ ] Offline handling and retry test cases.

### 15.3 End-to-end security & mobile hardening
- [ ] Secure password hashing (Bcrypt / Argon2id).
- [ ] Token lifecycle management (short-lived access tokens, refresh mechanisms).
- [ ] Android Keystore token storage encryption (no plaintext tokens in basic SharedPreferences).
- [ ] Android Network Security Configuration (enforce HTTPS, disable cleartext traffic).
- [ ] Sensitive financial data protection (mask account numbers to last 4 digits; redact OTPs).
- [ ] Backend rate limiting, CORS restrictions, and file upload sanitization.

### 15.4 Mobile performance optimization
- [ ] Image, icon, and font asset optimization.
- [ ] Network payload minimization (pagination, compressed responses).
- [ ] Background battery optimization (efficient `WorkManager` constraints like `NetworkType.CONNECTED` and `BatteryNotLow`).
- [ ] Memory leak prevention (lifecycle-aware components, coroutine cancellation).

### Expected deliverable
A secure, resilient, and performant backend and Android client ready for release candidate packaging.

---

## Phase 16 — Deployment, Packaging and Final Documentation

**Status: Pending**

### 16.1 Backend deployment
- [ ] Prepare production server environment (Docker / Cloud VM / PaaS).
- [ ] Deploy production PostgreSQL database with automated backup schedules.
- [ ] Deploy Node.js backend service with process manager (PM2 / container orchestration).
- [ ] Configure production environment variables, CORS origins, and SSL/TLS HTTPS domain.
- [ ] Verify production database health and migration status.

### 16.2 Android packaging & release build
- [ ] Configure Android build types and product flavors (`debug`, `release`).
- [ ] Configure ProGuard / R8 code shrinking and obfuscation rules.
- [ ] Generate Android production signing Keystore.
- [ ] Build signed release Android App Bundle (AAB) and standalone APK (`.apk`).
- [ ] Test release APK on physical Android test devices across various screen sizes and OS versions (Android 10 through 14+).

### 16.3 Production verification
- [ ] Verify end-to-end registration, login, and profile creation from the mobile device.
- [ ] Test live CSV statement import using the Android file picker.
- [ ] Test live SMS capture (or simulated test SMS broadcast) and transaction parsing.
- [ ] Verify budget alerts, goal tracking, and recurring commitment calculations.
- [ ] Verify AI Smart Expenditure Advisor recommendation responses and explanations.

### 16.4 Final-year project deliverables
- [ ] System architecture diagram (Android App ↔ Express Backend ↔ PostgreSQL & AI Engine).
- [ ] Database ER diagram and complete Data Dictionary.
- [ ] Full OpenAPI / Swagger API documentation.
- [ ] Android App Installation & User Guide (with APK distribution).
- [ ] Comprehensive Project Report & Software Requirements Specification (SRS).
- [ ] Test cases, test coverage metrics, and evaluation results.
- [ ] Presentation slides and live demonstration walkthrough video / script.

### Expected deliverable
A completely deployed backend and packaged Android release build (.apk/.aab) accompanied by exhaustive academic project documentation.

---

# 4. Delivery Milestones

## Milestone 1 — Functional Finance Management System
**Includes:** Phases 1–9, with the relevant frontend screens.

Deliverables:
- User registration and login.
- Financial account management.
- CSV imports and transaction management.
- Transaction categorization.
- Dashboard and analytics.
- Budgets.
- Financial goals.
- Recurring commitments.

**Outcome:** A working personal finance management application.

## Milestone 2 — Intelligent Financial Advisor
**Includes:** Phases 10–12 and integration with the frontend.

Deliverables:
- Spending analysis.
- Expense predictions.
- Financial health calculations.
- Purchase affordability analysis.
- AI-generated explanations.
- Recommendation feedback and notifications.

**Outcome:** A smart expenditure advisor with data-backed financial recommendations.

## Milestone 3 — Production-Ready Android Application
**Includes:** Phases 13–16, along with final testing, packaging, and deployment.

Deliverables:
- Android mobile application implementing all UI screens and features.
- Android SMS transaction ingestion workflow and background sync.
- Backend production deployment and mobile release build (.apk/.aab).
- Security, performance, and battery optimization.
- Documentation, presentation slides, and live demonstration.

**Outcome:** A complete, secure Android personal finance application ready for deployment and academic demonstration.

---

# 5. Current Project Status

This status reflects work completed and reported so far.

| Component | Status |
|---|---|
| PostgreSQL 18.6 installation | Complete |
| `finance_app` database | Complete |
| Prisma 6.19.3 installation | Complete |
| Schema v1.1 validation | Complete |
| Initial migration | Complete |
| 22 application tables | Verified |
| Express & Node.js backend foundation | Complete |
| Phase 1: Environment & Database Setup | Complete |
| Phase 2: Backend Foundation | Complete |
| Phase 3: Authentication & User Management | Complete |
| Phase 4: Financial Data Source Management | Complete |
| Phase 5: Transaction Management & CSV Imports | Complete |
| Phase 6: Financial Dashboard & Analytics | Complete |
| Phase 7: Budget Management | Complete |
| Phase 8: Financial Goals & Savings Management | Complete |
| Phase 9: Recurring Expenditure Management | Complete |
| Phase 10: Financial Intelligence & Prediction Engine | Next In Queue |
| Phase 11: AI-Powered Smart Expenditure Advisor | Pending |
| Phase 12: Notifications, Feedback & Audit Management | Pending |
| Phase 13: Mobile App Development & Walley UI Integration | Complete (React Native / Expo) |
| Phase 14: Android SMS Transaction Ingestion | In Progress (Upcoming Module Prepared) |
| Phase 15: Testing, Security & Mobile Optimization | Pending |
| Phase 16: Deployment, Packaging & Final Documentation | Pending |

### Mobile Implementation Progress (Walley Theme)
- **Design System & Theme**: Custom Walley tokens (`theme.js`), light & dark modes, SVG gradient cards, custom logos.
- **Authentication**: `AuthScreen.js` (Sign In / Register, min 8-char password, offline demo mode, server IP selector).
- **Post-Login Account Management**:
  - `AccountSelectionScreen.js`: User account list, tap-to-select, bank dropdown with all major banks, IFSC code, account holder name, and logout button.
- **Transaction Ingestion & Method Flow**:
  - `ImportMethodScreen.js`: Post-account selection module offering **Upload CSV** (active file picker and simulation fallback), **SMS Parsing (Upcoming)**, and **Skip to Dashboard**.
- **Dashboard & Account Details**:
  - `HomeScreen.js`: Single WalleyCard for active account, Featured Quick Actions (Add Transaction, Upload CSV, Set Monthly Budget, New Savings Goal), and Transactions list with recent 4 preview and "See all" toggle.
  - `AccountDetailsScreen.js`: Detailed accounts screen with purple banner, account count badge, combined balance, and show/hide individual account numbers.
- **Bottom Navigation**: 4-tab pill nav (Home, Statistic, Wallet, Profile) with floating shadow.
- **Supporting Screens**: `StatisticScreen`, `WalletScreen`, `ProfileScreen`, `TransferScreen`, `ConfirmTransferScreen`, `TransferSuccessScreen`, `RequestScreen`, `BillPayScreen`, `PayToScreen`, `SelectCardScreen`.

The four existing Prisma `SetNull` referential-action warnings remain documented. They did not prevent validation or the initial migration.

---

# 6. Project Working Rules

1. **One step at a time:** Explain each task, wait for confirmation and then continue.
2. **Explain before implementation:** Explain the purpose of each file, folder, API and service.
3. **Avoid unnecessary terminal commands:** Provide clear VS Code actions and explanations; provide commands or code only when requested or necessary.
4. **No repeated corrections:** Once a task is completed and verified, do not repeatedly reopen it.
5. **Preserve the database schema:** Keep Prisma schema v1.1 frozen unless an actual implementation issue requires a change.
6. **Verify every milestone:** Do not build further features on an unverified foundation.
7. **Maintain synchronization:** Keep Prisma schema, migration history, API behavior and documentation consistent.
8. **Protect credentials:** Never commit `.env` or expose database passwords.
9. **Keep financial calculations reliable:** Deterministic application logic is authoritative for financial figures; AI explains rather than invents them.
10. **Document meaningful decisions:** Record implementation decisions and changes that affect architecture or behavior.

---

# 7. Immediate Next Step

**Current phase: Phase 10 — Financial Intelligence and Prediction Engine**

Phases 1 through 9 are completely implemented and verified. The next milestone is to build the deterministic spending analysis, expense forecasting, financial health calculations, and anomaly detection services.

---

## Roadmap Maintenance

Update this document as phases and tasks are completed. Treat it as the master development checklist, not as proof that an item has been implemented merely because it appears here.
