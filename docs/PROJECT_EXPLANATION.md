# Personal Finance & AI Expenditure Advisor: Comprehensive System Architecture & Documentation

---

## 1. Executive Summary & Vision

The **Personal Finance & AI Expenditure Advisor** (internally branded as **Walley**) is an enterprise-grade, full-stack personal financial management (PFM) system designed to give users autonomous, real-time control over their financial health. 

Built to eliminate the manual bookkeeping burden of traditional finance trackers, the system combines:
1. **Multi-Source Financial Ingestion**: Bank-agnostic statement processing (specifically tailored for Indian banking formats such as PNB, SBI, HDFC, ICICI), mobile notifications, and manual account management.
2. **Automated Transaction Ingestion & Deduplication**: High-performance deduplication engine powered by SHA-256 idempotency hashing to prevent duplicate entries across re-imports.
3. **Smart Categorization Engine**: Rule-based categorization, user feedback correction learning, and system fallback classifiers across 17 default system categories.
4. **Real-Time Financial Analytics & Visualizations**: Deep cash-flow summaries, dynamic category spending distribution charts, monthly comparisons, and financial health telemetry.
5. **Proactive Budgeting & Overspend Alerts**: Threshold monitoring with automated warning triggers at 80% and breach alerts at 100%.
6. **Goals & Smart Commitments**: Target tracking, goal contributions, and dedicated balance reservations.
7. **Recurring Subscription & Bill Detection**: Pattern-recognition algorithm detecting recurring utility bills and subscriptions with lookback analysis.
8. **Modern Mobile Client**: A cross-platform mobile experience (iOS/Android via React Native & Expo) featuring a fintech aesthetic, Indian Rupee (₹) localization, dark/light theme switching, and client-side data isolation.

---

## 2. High-Level Architecture

The platform operates on a decoupled client-server architecture:

```mermaid
graph TD
    subgraph "Frontend Layer (Mobile App)"
        A[React Native / Expo App]
        A1[Screen Router & State]
        A2[Unified API Client / SecureStore]
        A3[Dynamic SVG Charts & Walley UI]
    end

    subgraph "Backend API Layer (Node.js / Express)"
        B[Express 5 Server :3000]
        B1[Auth & JWT Middleware]
        B2[Validation Middlewares]
        B3[Service Controllers]
        
        subgraph "Core Business Services"
            C1[Auth & Profile Service]
            C2[Data Source & Account Service]
            C3[CSV Statement Ingestion Service]
            C4[Transaction & Transfer Service]
            C5[Categorization Engine]
            C6[Analytics & Visualization Service]
            C7[Budget Monitoring Service]
            C8[Goal & Contribution Service]
            C9[Recurring Commitment Detector]
        end
    end

    subgraph "Data Storage Layer (PostgreSQL)"
        D[(PostgreSQL Database)]
        D1[Prisma ORM Client]
        D2[15+ Relational Tables]
    end

    A -->|HTTPS / JSON REST API| B
    B --> B1 --> B2 --> B3
    B3 --> C1 & C2 & C3 & C4 & C5 & C6 & C7 & C8 & C9
    C1 & C2 & C3 & C4 & C5 & C6 & C7 & C8 & C9 --> D1 --> D
```

---

## 3. Technology Stack

### Backend Stack
| Layer | Technology | Details |
|---|---|---|
| **Runtime** | Node.js (v18+) | Non-blocking asynchronous I/O |
| **Framework** | Express.js (v5.3.0) | RESTful API server, routing, and middleware pipelines |
| **Database** | PostgreSQL (v14+) | ACID-compliant relational storage with UUID primary keys |
| **ORM** | Prisma (v6.19.3) | Type-safe database client and automated migrations |
| **Authentication** | JWT (`jsonwebtoken` v9.0.3) + `bcryptjs` (v3.0.3) | Stateless Bearer token auth, salt rounds = 12 |
| **File Processing** | `multer` (v2.5.0) + `csv-parser` (v3.2.1) | In-memory buffer streaming, auto-preamble detection |
| **Security & Utilities** | `cors`, `dotenv`, `morgan`, `crypto` | SHA-256 content hashing, request logging, CORS protection |

### Mobile Client Stack
| Layer | Technology | Details |
|---|---|---|
| **Framework** | React Native (v0.88.1) | Native mobile UI components |
| **Platform SDK** | Expo (SDK 58) | Managed Expo workflow (`npx expo start`) |
| **Language** | Modern JavaScript (ES2022+ / JSX) | Full functional component architecture with hooks |
| **Icons & Visuals** | `lucide-react-native` (v1.77.0) + `react-native-svg` | Vector iconography and hardware-accelerated SVG charts |
| **Local Security** | `expo-secure-store` | Hardware-backed keystore/keychain storage for auth tokens |
| **Document Picker** | `expo-document-picker` | Native file picker for bank CSV statement uploads |
| **Design System** | Custom "Walley" Theme | Indian numbering format (₹ / k / L / Cr), dark & light modes |

---

## 4. Backend Architecture & Business Services (`src/`)

```
src/
├── config/
│   └── prisma.js             # Singleton Prisma Client instance
├── controllers/              # HTTP request parsers and response formatters
│   ├── analyticsController.js
│   ├── authController.js
│   ├── budgetController.js
│   ├── categoryController.js
│   ├── consentController.js
│   ├── dataSourceController.js
│   ├── goalController.js
│   ├── importController.js
│   ├── profileController.js
│   ├── recurringController.js
│   └── transactionController.js
├── middlewares/              # Interceptors, validators, error handlers
│   ├── authMiddleware.js      # JWT Bearer verification
│   ├── errorHandler.js        # Global uncaught exception handler
│   ├── uploadMiddleware.js    # Multer CSV memory-storage & MIME filter
│   └── validate*.js          # Route payload validation guards
├── routes/                   # Route endpoint definitions
│   ├── analyticsRoutes.js
│   ├── authRoutes.js
│   ├── budgetRoutes.js
│   ├── categoryRoutes.js
│   ├── consentRoutes.js
│   ├── dataSourceRoutes.js
│   ├── goalRoutes.js
│   ├── importRoutes.js
│   ├── profileRoutes.js
│   ├── recurringRoutes.js
│   └── transactionRoutes.js
├── services/                 # Core domain business logic
│   ├── analyticsService.js
│   ├── authService.js
│   ├── budgetService.js
│   ├── categorizationService.js
│   ├── consentService.js
│   ├── csvImportService.js
│   ├── dataSourceService.js
│   ├── goalService.js
│   ├── profileService.js
│   ├── recurringService.js
│   └── transactionService.js
├── utils/                    # Helper libraries
│   ├── jwt.js                # Token signing & verification
│   └── response.js           # Standardized JSON response envelope
├── app.js                    # Express app configuration & middleware mounts
└── server.js                 # HTTP listener entrypoint (Port 3000)
```

### Detailed Service Functionality

#### 1. Authentication & Security Service (`authService.js`)
- Handles user registration with email normalization (`toLowerCase()`, `trim()`).
- Secure password hashing using `bcryptjs` with salt rounds = 12.
- Issues signed JSON Web Tokens (JWT) with standard expiration.
- Protects downstream endpoints via `authenticate` middleware, mounting the verified `req.user = { id, email }` object onto Express requests.
- Validates token authenticity through `GET /api/v1/auth/me`.

#### 2. Financial Accounts & Data Sources (`dataSourceService.js`)
- **Multi-Source Abstraction**: Models external providers as `DataSource` records (`CSV_STATEMENT`, `ANDROID_SMS`, `MANUAL_INPUT`).
- **Account Types**: Supports `SAVINGS`, `CURRENT` (Checking), `CREDIT_CARD`, `WALLET`, `CASH`, `INVESTMENT`.
- **Metadata Storage**: Saves extra bank metadata (full account numbers, IFSC codes, bank names) inside JSON `metadata` columns.
- **Account Soft Deletion**: When an account is deleted, the system executes a transactional soft-delete (`deletedAt = new Date()`, `status = 'CLOSED'`) and deactivates attached data sources, preserving transaction audit trails while ensuring the account never reappears on the user's dashboard.
- **Balance Snapshots**: Creates `AccountBalanceSnapshot` records upon opening balance creation or statement reconciliation.

#### 3. CSV Statement Ingestion Pipeline (`csvImportService.js`)
Designed specifically to ingest Indian bank statements without manual file modification:
- **Intelligent Preamble Scanner**: Scans the first 60 lines of the uploaded statement to skip non-standard bank metadata (e.g., Punjab National Bank, State Bank of India headers containing customer address, branch codes, etc.) until the actual table header row is found.
- **Dynamic Header Aliasing**: Auto-detects columns regardless of bank naming variations (`Txn Date`, `Date`, `Dr Amount`, `Cr Amount`, `Debit`, `Credit`, `Description`, `Narration`, `Particulars`, `Balance`).
- **Idempotency & Re-Upload Protection**: Calculates SHA-256 hash of the uploaded file buffer. If the same file is re-uploaded, returns the batch summary without failing.
- **Transaction Deduplication**: Computes a deterministic `referenceHash` for every row:
  $$\text{Hash} = \text{SHA256}(\text{Date} + \text{Amount} + \text{Type} + \text{Narration} + \text{AccountId})$$
  Duplicate rows are flagged as `POTENTIAL_DUPLICATE` in `raw_messages` and excluded from double-counting.
- **Automated Balance Reconciliation**: Aggregates net delta across all parsed credit and debit records and updates `cachedBalance` on `FinancialAccount` in a single ACID transaction.

#### 4. Smart Categorization Engine (`categorizationService.js`)
- **Rule-Based Engine**: Regex and keyword matching against transaction narration strings (e.g., `UPI/CR`, `UPI/DR`, `Zomato`, `Swiggy`, `Amazon`, `Uber`, `Electricity`).
- **User Feedback Correction**: When a user manually edits a transaction's category, the system logs the correction and prioritizes user preference for future matching.
- **Default Category Seeds**: 17 standardized categories seeded into PostgreSQL (`Food & Dining`, `Groceries`, `Utilities`, `Shopping & Entertainment`, `Salary & Income`, `Transportation`, `Healthcare`, `Investment`, etc.).

#### 5. Analytics & Visualization Engine (`analyticsService.js`)
- **Dashboard Overview (`getDashboardOverview`)**: Calculates period-bound metrics (`totalIncome`, `totalExpenditure`, `netSavings`, `savingsRatePercentage`, `totalAccountBalance`).
- **Expense Breakdown (`getExpenseAnalytics`)**: Groups spending by category, calculating exact amounts and percentage allocations for the dynamic Donut chart.
- **Historical Comparisons (`getHistoricalComparisons`)**: Computes month-over-month and week-over-week financial variance.
- **Visualizations (`getVisualizationData`)**: Returns pre-computed multi-month trend series for bar and area chart components.

#### 6. Budgets & Real-Time Alerts (`budgetService.js`)
- Allows users to set monthly or custom period budgets per category or overall.
- Compares real-time posted expenses against budget amounts.
- Triggers notifications:
  - **`WARNING`**: Triggered when spending crosses 80% of threshold.
  - **`BREACH`**: Triggered when spending exceeds 100%.

#### 7. Financial Goals & Commitments (`goalService.js`)
- Tracks target savings goals (e.g., *Emergency Fund*, *New Car*, *Vacation*).
- Supports manual contributions (`POST /goals/:id/contributions`) and calculates projected completion dates based on current velocity.

#### 8. Recurring Commitments & Subscriptions (`recurringService.js`)
- Detects recurring expenses (subscriptions, monthly rent, EMI) by analyzing transaction intervals and narration patterns over a configurable lookback window (default: 90 days).
- Generates notifications when upcoming recurring payments are due.

---

## 5. Mobile Client Architecture (`mobile/`)

```
mobile/
├── src/
│   ├── api.js                   # Unified API Client with dynamic network resolution
│   ├── constants.js             # Colors, app defaults, formatters
│   ├── theme.js                 # Theme tokens & formatCurrency helper (₹ INR)
│   ├── components/
│   │   ├── FeaturedActions.js   # 4-button quick action bar (CSV, Tx, Budget, Goal)
│   │   ├── GoogleIcon.js        # SVG Google logo
│   │   ├── QuickActionModal.js  # Floating '+' action menu (Transfer, Bill, Request)
│   │   ├── WalleyBottomNav.js   # Floating 4-tab bottom navigation bar
│   │   ├── WalleyCard.js        # Signature fintech credit/debit card component
│   │   ├── WalleyHeader.js      # App header with notification and theme toggles
│   │   └── WalleyLogo.js        # Walley SVG brand icon
│   └── screens/
│       ├── AccountDetailsScreen.js    # View all accounts, unmask A/C numbers, IFSC
│       ├── AccountSelectionScreen.js  # Account switcher, manual account creator, delete
│       ├── AuthScreen.js              # Login & Sign up with password toggle
│       ├── BillPayScreen.js           # Bill payment interface
│       ├── ConfirmTransferScreen.js   # Pre-transfer verification modal
│       ├── HomeScreen.js              # Primary dashboard: card, actions, transactions
│       ├── ImportMethodScreen.js      # CSV statement upload screen
│       ├── PayToScreen.js             # Direct recipient payment screen
│       ├── ProfileScreen.js           # Settings, user details, FAQ, privacy policies
│       ├── RequestScreen.js           # Money request generator
│       ├── SelectCardScreen.js        # Card selection picker
│       ├── StatisticScreen.js         # Donut chart, bar chart, live analytics metrics
│       ├── TransferScreen.js          # Account-to-account funds transfer
│       ├── TransferSuccessScreen.js   # Transfer confirmation receipt
│       └── WalletScreen.js            # Connected bank accounts, cards carousel
├── App.js                       # Root component, router, initial auth & session sync
├── app.json                     # Expo manifest & permissions configuration
└── package.json                 # Mobile dependencies
```

### Key Screen Flows & Capabilities

1. **Authentication Flow (`AuthScreen.js`)**:
   - Supports seamless toggling between Sign In and Sign Up modes.
   - Validates input formats and displays descriptive backend error alerts.
   - On success, saves token in `expo-secure-store` and invokes server-side token validation.

2. **Session Verification & Account Check (`App.js`)**:
   - On app startup, `checkInitialAuth()` retrieves the stored JWT and calls `GET /api/v1/auth/me`.
   - If the token is invalid or the user was deleted, the token is purged and the user is redirected to `AuthScreen`.
   - If no account is linked, prompts the user with `AccountSelectionScreen`.

3. **Account Management (`AccountSelectionScreen.js` & `AccountDetailsScreen.js`)**:
   - **Creation**: Users can add bank accounts by specifying Account Holder Name, Bank (SBI, HDFC, PNB, ICICI, etc.), Account Type, Account Number, IFSC Code, and Initial Balance.
   - **Deletion**: Soft-deletes accounts with confirmation dialogs, immediately refreshing the UI and PostgreSQL.
   - **Privacy Masking**: Accounts display masked numbers (`•••• •••• 4841`). Tapping the Eye icon toggles unmasked view (`0264 1017 0000 4841`) using clean 4-digit bank formatting.

4. **Dashboard (`HomeScreen.js`)**:
   - Displays the interactive **WalleyCard** showing current balance (with hide/reveal eye toggle), account holder name, and quick links to "View Accounts" and "Transactions".
   - Features **Quick Action Grid**: Add Transaction, Upload Statement, Set Budget, Set Goal.
   - Live Transaction Feed: Renders posted transactions with category badges, amounts (green for credit, primary for debit), formatted in Indian Rupees (₹).

5. **Statistics & Live Data Visualizations (`StatisticScreen.js`)**:
   - **Timeframe Selector**: Dynamically switches between Day (`D`), Week (`W`), Month (`M`), and Year (`Y`).
   - **Real Metrics**: Renders real Total Balance, Income, and Expenses derived from `api.getOverview()`.
   - **Dynamic SVG Donut Chart**: Renders actual category spending distribution percentages dynamically computed using SVG stroke dashes.
   - **Monthly Trends Bar Chart**: Renders multi-month income vs. expense comparison bars scaled dynamically from backend visualization data.

6. **Networking & Dynamic IP Resolution (`mobile/src/api.js`)**:
   - Includes automatic hostname fallback: prioritizes active Wi-Fi LAN IP (e.g., `172.20.249.127:3000`) with automatic localhost fallback.
   - Equipped with an `AbortController` timeout guard (4.5s) to avoid UI hangs on dead connections.

---

## 6. Database Design & Relational Schema

The database is built on **PostgreSQL** managed through **Prisma ORM** (`prisma/schema.prisma`).

```mermaid
erDiagram
    User ||--o{ UserProfile : has
    User ||--o{ FinancialAccount : owns
    User ||--o{ DataSource : registers
    User ||--o{ Transaction : executes
    User ||--o{ Budget : defines
    User ||--o{ FinancialGoal : sets
    User ||--o{ RecurringCommitment : schedules
    User ||--o{ ImportBatch : imports
    User ||--o{ Consent : grants

    FinancialAccount ||--o{ DataSource : links
    FinancialAccount ||--o{ AccountBalanceSnapshot : snapshots
    FinancialAccount ||--o{ Transaction : records
    FinancialAccount ||--o{ Transfer : transfers_from
    FinancialAccount ||--o{ Transfer : transfers_to
    FinancialAccount ||--o{ GoalContribution : funds

    DataSource ||--o{ ImportBatch : produces
    DataSource ||--o{ RawMessage : receives
    ImportBatch ||--o{ RawMessage : contains
    
    Category ||--o{ Transaction : categorizes
    Category ||--o{ Budget : bounds
    Transaction ||--o{ GoalContribution : links
```

### Core Database Entities

| Table Name | Model Name | Description |
|---|---|---|
| `users` | `User` | User auth identity, hashed passwords, timestamps |
| `user_profiles` | `UserProfile` | Monthly income, savings target percentage, currency, risk tolerance |
| `financial_accounts` | `FinancialAccount` | Bank accounts, credit cards, wallets with cached balances and soft-delete flags |
| `account_balance_snapshots`| `AccountBalanceSnapshot`| Auditable balance snapshots with timestamps and references |
| `data_sources` | `DataSource` | Ingestion channels (`CSV_STATEMENT`, `ANDROID_SMS`, `MANUAL_INPUT`) with JSON metadata |
| `import_batches` | `ImportBatch` | Tracks file upload batches, SHA-256 hashes, status, and parsed/duplicate counts |
| `raw_messages` | `RawMessage` | Raw unparsed CSV rows/SMS text for forensic auditing and deduplication |
| `transactions` | `Transaction` | Processed financial transactions (amount, type, date, reference hash, category) |
| `categories` | `Category` | 17 default system categories and user-created custom categories |
| `transfers` | `Transfer` | Double-entry transfer records between internal accounts |
| `budgets` | `Budget` | Spending thresholds per category and period |
| `financial_goals` | `FinancialGoal` | Savings targets, deadlines, target amounts |
| `goal_contributions` | `GoalContribution` | Contributions linked to goals and accounts |
| `recurring_commitments` | `RecurringCommitment` | Detected recurring bills, frequencies, and next expected due dates |
| `consents` | `Consent` | User data processing consents, versions, and IP audit trails |

---

## 7. Complete API Reference

All protected endpoints require the HTTP header:  
`Authorization: Bearer <JWT_ACCESS_TOKEN>`

### Authentication & Profile
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new user | No |
| `POST` | `/api/v1/auth/login` | Authenticate and obtain JWT | No |
| `GET` | `/api/v1/auth/me` | Validate session token & get user | Yes |
| `GET` | `/api/v1/profile` | Retrieve user profile & settings | Yes |
| `PATCH` | `/api/v1/profile` | Update profile settings (income, goals) | Yes |

### Financial Accounts & Data Sources
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/financial/accounts` | List active user bank accounts | Yes |
| `POST` | `/api/v1/financial/accounts` | Create new manual financial account | Yes |
| `DELETE` | `/api/v1/financial/accounts/:id` | Soft-delete a financial account | Yes |
| `GET` | `/api/v1/financial/sources` | List connected data sources | Yes |
| `POST` | `/api/v1/financial/sources` | Register a new data source | Yes |
| `PATCH` | `/api/v1/financial/sources/:id`| Update or deactivate data source | Yes |

### Statement Ingestion
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/imports/csv` | Upload multipart/form-data CSV statement | Yes |
| `GET` | `/api/v1/imports/batches` | View history of uploaded batches | Yes |

### Transactions & Transfers
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/transactions` | Query transactions (supports filtering & pagination) | Yes |
| `POST` | `/api/v1/transactions` | Record a manual transaction | Yes |
| `POST` | `/api/v1/transactions/transfer` | Execute atomic transfer between accounts | Yes |
| `GET` | `/api/v1/categories` | Retrieve available transaction categories | Yes |

### Analytics & Visualizations
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/analytics/overview` | Income, expense, net savings & account balance | Yes |
| `GET` | `/api/v1/analytics/expenses` | Category breakdown percentages & daily timeline | Yes |
| `GET` | `/api/v1/analytics/comparisons` | Week-over-week & month-over-month variances | Yes |
| `GET` | `/api/v1/analytics/visualizations`| Multi-month trend arrays for charting | Yes |

### Budgets, Goals & Recurring
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/budgets` | List user budgets and current spending | Yes |
| `POST` | `/api/v1/budgets` | Create or update budget threshold | Yes |
| `GET` | `/api/v1/budgets/alerts` | Check for budget warning/breach alerts | Yes |
| `GET` | `/api/v1/goals` | List savings goals | Yes |
| `POST` | `/api/v1/goals` | Create a new savings goal | Yes |
| `POST` | `/api/v1/goals/:id/contributions`| Add funds to a savings goal | Yes |
| `GET` | `/api/v1/recurring` | List recurring commitments | Yes |
| `POST` | `/api/v1/recurring/detect` | Run automatic pattern detection algorithm | Yes |
| `GET` | `/api/v1/recurring/alerts` | Get upcoming due dates for bills | Yes |

---

## 8. Setup & Development Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14.0 or higher (running on `localhost:5432`)
- **Expo Go App**: Installed on physical Android or iOS device (connected to the same Wi-Fi)

### 1. Environment Configuration (`.env`)
Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development

# PostgreSQL Connection String
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_app?schema=public"

# JWT Secret Key
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
```

### 2. Backend Installation & Database Setup
```bash
# Install root dependencies
npm install

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to inspect the database
npx prisma studio

# Start backend server in development mode (auto-restarts on save via nodemon)
npm run dev
```
*The server will start listening at `http://localhost:3000` with the health check available at `http://localhost:3000/health`.*

### 3. Mobile Client Setup
```bash
# Navigate to mobile directory and install dependencies
cd mobile
npm install

# Start the Expo development server
npx expo start
```

### 4. Running on a Physical Device
1. Ensure your laptop and phone are connected to the **same Wi-Fi network**.
2. Note your laptop's local IPv4 address (e.g., `172.20.249.127`).
3. Verify that `mobile/src/api.js` points to your IP address:
   ```javascript
   const dynamicHost = '172.20.249.127';
   const API_PORT = 3000;
   ```
4. Open the **Expo Go** app on your phone and scan the QR code displayed in your terminal.

---

## 9. Security & Data Integrity Principles

1. **User Isolation**: Every database query in Prisma includes a mandatory `where: { userId }` clause, making cross-tenant data leakage impossible.
2. **Deterministic Deduplication**: Statement imports rely on SHA-256 idempotency hashing to prevent duplicate transactions even across overlapping statement dates.
3. **Soft Deletion & Auditability**: Destructive operations (e.g., deleting bank accounts) soft-delete records (`deletedAt != null`) so financial histories and transaction ledgers remain intact for reconciliation.
4. **Credential Security**: Passwords are salted and hashed using bcrypt; tokens are stored in hardware-backed secure storage on mobile devices (`Expo SecureStore`).
5. **Indian Banking Compliance**: Formats statement parsing around standard Reserve Bank of India (RBI) conventions, including PNB/SBI preambles, IFSC validation, and INR currency standards.

