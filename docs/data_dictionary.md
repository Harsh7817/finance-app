# Data Dictionary: AI-Powered Personal Finance & Smart Expenditure Advisor (v1.1 - Hardened Edition)

## 1. Domain Concept Distinctions

Before reviewing the table-by-table specifications, the distinction between transactional and analytical concepts in the architecture must be clearly understood:

1. **Source Transaction Data (`raw_messages`):**
   - The unnormalized, raw text or extracted payload captured directly from bank SMS alerts or CSV statement rows.
   - Contains raw merchant strings, unparsed timestamps, and potentially noisy data.
   - Strictly sanitized to remove one-time passwords (OTPs) and unneeded personal identifiers before persistence.
   - Immutable historical record of what was received. Content hash is used to flag duplicate candidates, while external provider message ID enforces strong uniqueness.

2. **Normalized Transaction Data (`transactions`):**
   - The canonical financial event record following parsing, cleaning, validation, and sign convention assignment.
   - Standardizes amounts as positive decimals with explicit transaction directions (`DEBIT`, `CREDIT`, `TRANSFER`, `REFUND`, `REVERSAL`, `FEE`), canonical ISO currency codes (`INR`), clean merchant names, and timezone-aware timestamps (`TIMESTAMPTZ`).
   - Strong deduplication is enforced on verified bank references (`external_reference` / UTR). Heuristic fingerprints identify potential duplicates for review without silently dropping legitimate purchases.

3. **Logical Transfers (`transfers`):**
   - First-class entity pairing the debit leg (source account) and credit leg (destination account) of an internal fund transfer.
   - Enforces identical user ownership and distinct accounts at the database level.
   - Authoritatively excluded from consumer income and expenditure analytics.

4. **Balance Snapshots (`account_balance_snapshots`):**
   - Explicit point-in-time balance anchors sourced from statement imports or manual reconciliations.
   - Solves stored vs calculated balance drift: authoritative balance at timestamp $T$ equals the nearest prior snapshot balance plus settled ledger entries.

5. **Goal Contributions (`goal_contributions`):**
   - Dedicated contribution ledger recording allocations, transaction linkages, interest, and withdrawals.
   - Serves as the authoritative source of truth for financial goal progress.

6. **Predicted Categorization (`categorization_logs` with method `RULE_BASED` or `ML_MODEL`):**
   - Automated category assignment produced by heuristic regex rule engines or machine learning classification models.
   - Carries confidence score (0.0000 to 1.0000) and model version identifier.

7. **User-Confirmed Categorization (`transactions.category_id` with `is_user_verified = TRUE`):**
   - Final verified category assigned or corrected by the human user, feeding into feedback loops.

8. **Purchase-Advisor Output (`advisory_decisions`):**
   - Dual-component evaluation strictly isolating deterministic affordability calculations from LLM-generated explanations.

---

## 2. Table-by-Table Data Dictionary (22 Tables)

### 2.1 Table: `users`
**Purpose:** Application login identity and security credentials (NFR-SEC-02, FR-AUTH-01 to 05).  
**Classification:** Core / PII / Authentication  
**Lifecycle:** Mutable, Soft Deletable (`deleted_at`)

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `user_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key uniquely identifying the application user. |
| `email` | VARCHAR(255) | No | None | User | High (PII) | Valid email regex pattern, Unique | Unique login credential and email contact. |
| `password_hash` | VARCHAR(255) | No | None | System | Critical (Secret) | Valid Argon2id or Bcrypt hash | Cryptographic password hash. Plaintext strictly prohibited. |
| `role` | `user_role` ENUM | No | `'END_USER'` | System | Low | `END_USER`, `PROJECT_ADMIN`, `AUDITOR` | Role-based access control tier (FR-AUTH-03, FR-ADM-01). |
| `status` | `user_status` ENUM | No | `'ACTIVE'` | System | Low | `ACTIVE`, `SUSPENDED`, `DEACTIVATED` | Operational status of the user account. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Creation timestamp of the user account. |
| `updated_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Last update timestamp (managed via trigger). |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | System | Low | UTC Timestamp | Soft-delete timestamp. When non-null, user is deactivated (FR-AUTH-05). |

---

### 2.2 Table: `user_profiles`
**Purpose:** User financial preferences, stated monthly income, and notification configurations (FR-FIN-01, FR-ALT-04).  
**Classification:** Core / Preferences  
**Lifecycle:** Mutable

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `profile_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the profile entity. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id`, Unique | 1:1 association to user identity. |
| `base_currency` | VARCHAR(3) | No | `'INR'` | User | Low | ISO 4217 3-letter currency code | Primary accounting currency for summaries and advisor logic. |
| `monthly_stated_income` | NUMERIC(14,2) | No | `0.00` | User | High (Financial) | `>= 0.00` | User-declared monthly income used in affordability calculations. |
| `savings_target_percentage` | NUMERIC(5,2) | No | `20.00` | User | Low | `0.00` to `100.00` | Baseline percentage of monthly income targeted for savings. |
| `risk_tolerance` | VARCHAR(50) | No | `'MODERATE'` | User | Low | `'CONSERVATIVE'`, `'MODERATE'`, `'AGGRESSIVE'` | Financial personality indicator for advisory recommendations. |
| `notification_preferences` | JSONB | No | Default JSON object | User | Low | Valid JSON | Configurable alert thresholds and channel preferences (FR-ALT-04). |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Record creation timestamp. |
| `updated_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Trigger-maintained update timestamp. |

---

### 2.3 Table: `consents`
**Purpose:** Explicit, auditable record of user consent grants and revocations (FR-CNS-01 to 05, NFR-PRV-02).  
**Classification:** Core / Compliance / GDPR / DPDP  
**Lifecycle:** Append-Only / Immutable Audit Log (status updated only on withdrawal)

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `consent_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the consent event. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id` | User granting or revoking authorization. |
| `purpose` | VARCHAR(100) | No | None | System | Low | e.g. `'SMS_INGESTION'`, `'CSV_IMPORT'`, `'ADVISORY'` | Explicit purpose for data processing (FR-CNS-02). |
| `scope` | VARCHAR(255) | No | None | System | Low | e.g. `'READ_BANK_SMS'`, `'EXPENSE_PREDICTION'` | Technical scope of authorization. |
| `status` | `consent_status` ENUM | No | `'GRANTED'` | User | Low | `GRANTED`, `WITHDRAWN`, `EXPIRED` | Current status of the consent grant (FR-CNS-03). |
| `consent_version` | VARCHAR(20) | No | `'1.0'` | System | Low | String version tag | Version of terms or privacy policy presented. |
| `ip_address` | VARCHAR(45) | Yes | NULL | System | Medium | Valid IPv4/IPv6 string | Network audit trail of where consent was granted. |
| `user_agent` | TEXT | Yes | NULL | System | Low | Browser/Client string | Device audit trail of client application. |
| `granted_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Timestamp when user authorized consent. |
| `expires_at` | TIMESTAMPTZ | Yes | NULL | System | Low | UTC Timestamp | Optional timestamp after which consent auto-expires (FR-CNS-04). |
| `withdrawn_at` | TIMESTAMPTZ | Yes | NULL | User | Low | UTC Timestamp | Timestamp when user revoked authorization (FR-CNS-03). |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Record audit timestamp. |

---

### 2.4 Table: `financial_accounts`
**Purpose:** Represents real-world financial instruments owned by the user (bank accounts, cards, cash).  
**Classification:** Core / Financial  
**Lifecycle:** Mutable, Soft Deletable (`deleted_at`)

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `account_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the financial account. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id`, Composite Unique `(user_id, account_id)` | Account owner. Target of composite foreign keys. |
| `account_name` | VARCHAR(100) | No | None | User | Medium | Non-empty string | Human-readable alias (e.g. "Salary Account", "Shopping Card"). |
| `account_type` | `account_type` ENUM | No | None | User / System | Medium | `SAVINGS`, `CURRENT`, `CREDIT_CARD`, `WALLET`, `CASH`, `INVESTMENT` | Financial classification of account instrument. |
| `institution_name` | VARCHAR(100) | No | None | User / Ingest | Medium | Non-empty string | Financial institution (e.g. "HDFC Bank", "SBI", "Paytm"). |
| `account_mask` | VARCHAR(10) | Yes | NULL | Ingest / User | High (PII) | Max 10 chars (e.g. "*1234") | Masked account suffix. Real full account numbers are NEVER stored. |
| `currency` | VARCHAR(3) | No | `'INR'` | User / Ingest | Low | ISO 4217 code | Account operating currency. |
| `cached_balance` | NUMERIC(14,2) | No | `0.00` | Cached | High (Financial) | Any numeric amount | Cached balance for fast display. Authoritative balance is computed from snapshots + ledger. |
| `last_reconciled_at` | TIMESTAMPTZ | Yes | NULL | Reconciled | Low | UTC Timestamp | Timestamp of last balance reconciliation. |
| `status` | `account_status` ENUM | No | `'ACTIVE'` | User / System | Low | `ACTIVE`, `INACTIVE`, `CLOSED` | Operational status of the account. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Creation timestamp. |
| `updated_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Trigger-maintained update timestamp. |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | System | Low | UTC Timestamp | Soft delete timestamp. |

---

### 2.5 Table: `account_balance_snapshots` (NEW)
**Purpose:** Explicit point-in-time balance anchor records from statement closing balances or manual reconciliation.  
**Classification:** Core / Financial / Audit  
**Lifecycle:** Append-Only / Immutable

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `snapshot_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the balance snapshot. |
| `account_id` | UUID | No | None | Ingest / User | Low | Composite FK `(user_id, account_id)` | Financial account being anchored. |
| `user_id` | UUID | No | None | System | Low | Part of Composite FK | Account owner. |
| `balance_amount` | NUMERIC(14,2) | No | None | Ingest / User | High (Financial) | Any valid numeric amount | Exact closing or opening balance as of timestamp. |
| `as_of_timestamp` | TIMESTAMPTZ | No | None | Ingest / User | Low | UTC Timestamp | Exact statement closing date or verification instant. |
| `snapshot_source` | `snapshot_source` ENUM | No | `'STATEMENT_IMPORT'` | System | Low | `OPENING_BALANCE`, `STATEMENT_IMPORT`, `MANUAL_RECONCILIATION` | Origin of the balance figure. |
| `statement_reference`| VARCHAR(100) | Yes | NULL | Ingest | Low | Statement identifier | Bank statement filename or batch reference. |
| `is_reconciled` | BOOLEAN | No | `TRUE` | System | Low | `TRUE`, `FALSE` | Reconciliation verification flag. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Record creation timestamp. |

---

### 2.6 Table: `data_sources`
**Purpose:** Configuration and status of transaction ingestion endpoints (SMS sender, CSV format).  
**Classification:** Core / Operational  
**Lifecycle:** Mutable

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `source_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the ingestion source. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id`, Composite Unique `(user_id, source_id)` | User authorizing the source. |
| `account_id` | UUID | Yes | NULL | User | Low | Composite FK `(user_id, account_id)` | Default financial account associated with this source. |
| `source_type` | `source_type` ENUM | No | None | System | Low | `ANDROID_SMS`, `CSV_STATEMENT`, `MANUAL_INPUT` | Acquisition modality (FR-TXN-01). |
| `provider_name` | VARCHAR(100) | No | None | System | Low | Non-empty string | Provider/template key (e.g. "HDFC_SMS_V1", "ICICI_CSV_STD"). |
| `is_active` | BOOLEAN | No | `TRUE` | User / System | Low | `TRUE`, `FALSE` | Toggle to pause/resume ingestion for this source. |
| `metadata` | JSONB | No | `'{}'` | System | Low | Valid JSON | Technical parser configurations and mapping templates. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Record creation timestamp. |
| `updated_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Last update timestamp. |

---

### 2.7 Table: `import_batches`
**Purpose:** Session tracking for bulk ingestion jobs (CSV file processing, periodic SMS syncs).  
**Classification:** Core / Ingestion / Operational  
**Lifecycle:** Mutable during processing, Finalized upon completion

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `batch_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the batch job. |
| `source_id` | UUID | No | None | System | Low | Composite FK `(user_id, source_id)` | Source initiating the batch. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id`, Composite Unique `(user_id, batch_id)` | Account owner. |
| `batch_reference` | VARCHAR(100) | Yes | NULL | Client | Low | Client session tag / filename | Original filename or client sync batch identifier. |
| `file_hash` | VARCHAR(64) | Yes | NULL | System | Low | SHA-256 hex string | Hash of raw file content to detect duplicate file uploads. |
| `status` | `batch_status` ENUM | No | `'PENDING'` | System | Low | `PENDING`, `PROCESSING`, `COMPLETED`, `PARTIALLY_FAILED`, `FAILED` | Ingestion job processing status (NFR-REL-03). |
| `total_records` | INTEGER | No | `0` | System | Low | `>= 0` | Total number of items detected in the batch. |
| `parsed_records` | INTEGER | No | `0` | System | Low | `>= 0` | Number of successfully parsed transactions. |
| `duplicate_records`| INTEGER | No | `0` | System | Low | `>= 0` | Number of duplicate transactions skipped. |
| `failed_records` | INTEGER | No | `0` | System | Low | `>= 0` | Number of invalid or rejected entries. |
| `error_summary` | JSONB | No | `'[]'` | System | Low | JSON Array | Array of error codes and row indices for troubleshooting. |
| `started_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Job kickoff timestamp. |
| `completed_at` | TIMESTAMPTZ | Yes | NULL | System | Low | UTC Timestamp | Job completion timestamp. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Record creation timestamp. |
| `updated_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Last update timestamp. |

---

### 2.8 Table: `raw_messages`
**Purpose:** Minimized, redacted source record for SMS messages or CSV statement rows (FR-TXN-03, NFR-PRV-01).  
**Classification:** Core / Ingestion / Audit  
**Lifecycle:** Immutable / Append-only

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `message_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the source record. |
| `batch_id` | UUID | No | None | System | Low | Composite FK `(user_id, batch_id)` | Batch session containing this message. |
| `source_id` | UUID | No | None | System | Low | FK to `data_sources.source_id` | Originating ingestion source. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id` | Account owner. |
| `external_message_id`| VARCHAR(100)| Yes | NULL | Client | Low | Unique per source when set | Android SMS Telephony ID or CSV row number. Strong provider deduplication key. |
| `content_hash` | VARCHAR(64) | No | None | System | Low | SHA-256 hex string, Indexed | Fingerprint of cleaned message text. Used for candidate duplicate review (not hard rejection). |
| `sanitized_preview`| TEXT | Yes | NULL | System | High (PII) | Redacted string | Preview text with bank OTPs and personal phone numbers scrubbed (FR-TXN-03). |
| `processing_status`| `raw_message_status` ENUM | No | `'PENDING'` | System | Low | `PENDING`, `PARSED`, `POTENTIAL_DUPLICATE`, `FAILED`, `IGNORED` | Parsing lifecycle state. |
| `duplicate_of_id` | UUID | Yes | NULL | System | Low | Self-referential FK | Points to existing message if flagged as potential duplicate. |
| `parser_version` | VARCHAR(50) | No | `'v1.0'` | System | Low | String version | Version of the parser ruleset applied (NFR-MNT-02). |
| `rejection_reason` | TEXT | Yes | NULL | System | Low | Error description | Why parsing failed or why message was ignored. |
| `received_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Client-reported receipt timestamp. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Record creation timestamp. |

---

### 2.9 Table: `categories`
**Purpose:** Hierarchical taxonomy for spending and income classification (FR-CAT-01 to 06).  
**Classification:** Core / Taxonomy  
**Lifecycle:** Mutable, Soft Deletable via `is_active`

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `category_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the category. |
| `user_id` | UUID | Yes | NULL | System / User | Low | FK to `users.user_id` | NULL indicates global system default; UUID indicates user-created custom category (FR-CAT-06). |
| `parent_id` | UUID | Yes | NULL | System / User | Low | Self-referential FK to `categories.category_id` | Supports 2-tier parent-child hierarchy (e.g. Food -> Groceries). |
| `name` | VARCHAR(50) | No | None | System / User | Low | Unique per scope | Category display name (FR-CAT-02, 05). |
| `category_type` | `category_type` ENUM | No | `'EXPENSE'` | System / User | Low | `EXPENSE`, `INCOME`, `TRANSFER`, `INVESTMENT` | High-level financial accounting bucket. |
| `icon` | VARCHAR(50) | Yes | NULL | System / User | Low | Icon token string | UI representation icon. |
| `color_hex` | VARCHAR(7) | Yes | NULL | System / User | Low | Regex `^#[0-9A-Fa-f]{6}$` | Hexadecimal color code for charts and visualizations. |
| `is_active` | BOOLEAN | No | `TRUE` | System / User | Low | `TRUE`, `FALSE` | Active status. Deactivated categories cannot receive new transactions. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Record creation timestamp. |
| `updated_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Last update timestamp. |

---

### 2.10 Table: `transactions`
**Purpose:** Authoritative canonical ledger of all normalized financial events.  
**Classification:** Core / Financial / Highly Sensitive  
**Lifecycle:** Mutable (category/verification only), Soft Deletable (`deleted_at`)

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `transaction_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the financial transaction. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id` | Account owner. |
| `account_id` | UUID | No | None | System / Ingest | Low | Composite FK `(user_id, account_id)` | Associated financial account (enforces account ownership!). |
| `batch_id` | UUID | Yes | NULL | System | Low | FK to `import_batches.batch_id` | Ingestion batch that created this record. |
| `raw_message_id` | UUID | Yes | NULL | System | Low | FK to `raw_messages.message_id` | Source raw message reference for auditability. |
| `category_id` | UUID | No | None | System / User | Low | FK to `categories.category_id` | Current assigned category (FR-CAT-03). |
| `amount` | NUMERIC(14,2) | No | None | Ingest / User | High (Financial) | `> 0.00` | Exact monetary transaction value. Positive only. Direction defined by `type`. |
| `currency` | VARCHAR(3) | No | `'INR'` | Ingest / User | Low | ISO 4217 3-letter code | Currency of the transaction (FR-TXN-05). |
| `type` | `transaction_type` ENUM | No | None | Ingest / User | Low | `DEBIT`, `CREDIT`, `TRANSFER`, `REFUND`, `REVERSAL`, `FEE` | Financial classification (FR-FIN-04). |
| `status` | `transaction_status` ENUM | No | `'POSTED'` | System / User | Low | `POSTED`, `PENDING`, `FLAGGED_FOR_REVIEW`, `RECONCILED`, `EXCLUDED` | Lifecycle status of transaction (FR-TXN-06). |
| `duplicate_status`| `duplicate_status` ENUM | No | `'NOT_DUPLICATE'` | System | Low | `NOT_DUPLICATE`, `POTENTIAL_DUPLICATE`, `CONFIRMED_DUPLICATE` | Deduplication review state. |
| `possible_duplicate_of_id`| UUID | Yes | NULL | System | Low | Self-referential FK | Points to existing transaction when heuristic match is flagged. |
| `merchant_name` | VARCHAR(150) | No | None | Ingest | Medium | Non-empty string | Raw/extracted merchant or counterparty name. |
| `clean_merchant_name`| VARCHAR(150)| No | None | System | Low | Non-empty string | Normalized merchant name used for grouping and recurring detection. |
| `description` | TEXT | Yes | NULL | Ingest | Medium | Sanitized text | Bank statement narration or memo line. |
| `transaction_at` | TIMESTAMPTZ | No | None | Ingest | Low | Real-world UTC instant | Date and time when the transaction actually occurred. |
| `posting_date` | DATE | No | None | Ingest | Low | Calendar date | Date when transaction was settled / booked by bank. |
| `reference_hash` | VARCHAR(64) | No | None | System | Low | SHA-256 hex string, Indexed | Heuristic fingerprint = `SHA256(account_id, amount, transaction_at, clean_merchant_name)`. |
| `external_reference`| VARCHAR(100)| Yes | NULL | Ingest | Medium | Unique per account when set | Bank UPI ref / UTR / check number. Strong provider deduplication key. |
| `original_transaction_id` | UUID | Yes | NULL | System / User | Low | Self-referential FK | Links refunds and reversals to original purchase (HIGH FIX 4). |
| `is_recurring` | BOOLEAN | No | `FALSE` | System | Low | `TRUE`, `FALSE` | Flag indicating recurring subscription or bill (FR-CAT-11). |
| `is_user_verified` | BOOLEAN | No | `FALSE` | User | Low | `TRUE`, `FALSE` | Set to TRUE once user explicitly confirms or edits the category. |
| `metadata` | JSONB | No | `'{}'` | System | Low | Valid JSON | Ancillary data such as extracted balance after transaction. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Ingestion timestamp. |
| `updated_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Last update timestamp. |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | System | Low | UTC Timestamp | Soft-delete timestamp. |

---

### 2.11 Table: `transfers` (NEW)
**Purpose:** First-class logical internal transfer pairing two account-side transaction entries (CRITICAL FIX 3).  
**Classification:** Core / Financial Ledger  
**Lifecycle:** Mutable (`status`)

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `transfer_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the logical transfer. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id` | Transfer owner. |
| `source_account_id` | UUID | No | None | User / Ingest | Low | Composite FK `(user_id, source_account_id)` | Outgoing (debited) financial account. |
| `destination_account_id` | UUID | No | None | User / Ingest | Low | Composite FK `(user_id, destination_account_id)` | Incoming (credited) financial account (`source <> destination`). |
| `source_transaction_id` | UUID | No | None | System | Low | FK to `transactions.transaction_id`, Unique | Debit leg transaction in `transactions`. |
| `destination_transaction_id` | UUID | No | None | System | Low | FK to `transactions.transaction_id`, Unique | Credit leg transaction in `transactions`. |
| `amount` | NUMERIC(14,2) | No | None | Ingest / User | High (Financial) | `> 0.00` | Exact transferred amount. |
| `currency` | VARCHAR(3) | No | `'INR'` | Ingest / User | Low | ISO 4217 code | Operating currency. |
| `status` | `transfer_status` ENUM | No | `'SETTLED'` | System | Low | `SETTLED`, `PENDING`, `CANCELLED` | Settlement state of the transfer. |
| `transfer_date` | TIMESTAMPTZ | No | None | Ingest / User | Low | UTC Timestamp | Date and time transfer was executed. |
| `notes` | TEXT | Yes | NULL | User | Low | Free text | User transfer memo. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Record creation timestamp. |
| `updated_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Last update timestamp. |

---

### 2.12 Table: `categorization_logs`
**Purpose:** Decision audit trail for automated and manual category assignments (FR-CAT-07, 08, 09, NFR-MNT-02).  
**Classification:** Core / AI / Compliance  
**Lifecycle:** Append-Only / Immutable

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `log_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the log event. |
| `transaction_id` | UUID | No | None | System | Low | FK to `transactions.transaction_id` | Transaction being categorized. |
| `category_id` | UUID | No | None | System / User | Low | FK to `categories.category_id` | Category assigned in this step. |
| `method` | `categorization_method` ENUM | No | None | System / User | Low | `RULE_BASED`, `ML_MODEL`, `USER_MANUAL`, `FALLBACK_DEFAULT` | Logic engine responsible for classification (FR-CAT-07). |
| `confidence_score`| NUMERIC(5,4)| Yes | NULL | System (ML) | Low | `0.0000` to `1.0000` | Model confidence probability (NULL for manual user actions). |
| `model_version` | VARCHAR(50) | No | `'rule_engine_v1.0'`| System | Low | Model/rule version tag | Specific model or rule artifact version used (FR-CAT-07). |
| `user_overridden` | BOOLEAN | No | `FALSE` | User | Low | `TRUE`, `FALSE` | Flag indicating whether this record represents a human correction (FR-CAT-08). |
| `previous_category_id`| UUID | Yes | NULL | User | Low | FK to `categories.category_id` | Category replaced during a user override. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Decision timestamp. |

---

### 2.13 Table: `budgets`
**Purpose:** Spending limit definitions and deviation alert thresholds (FR-BUD-01 to 07).  
**Classification:** Core / Financial Planning  
**Lifecycle:** Mutable

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `budget_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the budget. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id` | Budget owner. |
| `category_id` | UUID | Yes | NULL | User | Low | FK to `categories.category_id` | Target category limit. If NULL, represents total monthly spending budget (FR-BUD-03). |
| `name` | VARCHAR(100) | No | None | User | Low | Non-empty string | Human-readable budget label (e.g. "Dining & Takeout"). |
| `period_type` | `budget_period_type` ENUM | No | `'MONTHLY'` | User | Low | `MONTHLY`, `WEEKLY`, `CUSTOM` | Recurrence cycle (FR-BUD-02). |
| `period_start` | DATE | No | None | User / System | Low | Calendar date | Start date of the budget validity period. |
| `period_end` | DATE | No | None | User / System | Low | Calendar date `>= period_start` | End date of the budget validity period. |
| `limit_amount` | NUMERIC(14,2) | No | None | User | Medium (Financial) | `> 0.00` | Spending ceiling in base currency. |
| `warning_threshold_pct`| INTEGER | No | `80` | User | Low | Between `1` and `100` | Utilization percentage at which warning alert is dispatched (FR-BUD-06). |
| `status` | `budget_status` ENUM | No | `'ACTIVE'` | User / System | Low | `ACTIVE`, `PAUSED`, `ARCHIVED` | Budget operational status (FR-BUD-01). |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Creation timestamp. |
| `updated_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Last update timestamp. |

---

### 2.14 Table: `financial_goals`
**Purpose:** Savings targets, deadlines, and deterministic allocation tracking (FR-GOAL-01 to 05).  
**Classification:** Core / Financial Planning  
**Lifecycle:** Mutable

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `goal_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the financial goal. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id`, Composite Unique `(user_id, goal_id)` | Goal owner. |
| `account_id` | UUID | Yes | NULL | User | Low | Composite FK `(user_id, account_id)` | Optional dedicated savings account linked to this goal. |
| `name` | VARCHAR(100) | No | None | User | Low | Non-empty string | Goal label (e.g. "Emergency Fund", "New Laptop"). |
| `target_amount` | NUMERIC(14,2) | No | None | User | Medium (Financial) | `> 0.00` | Total target savings amount (FR-GOAL-01). |
| `cached_current_amount`| NUMERIC(14,2)| No | `0.00` | Derived Cache | Medium (Financial) | `>= 0.00` | Cached progress. Authoritative amount is derived from `goal_contributions`. |
| `target_date` | DATE | No | None | User | Low | Calendar date | Target completion deadline (FR-GOAL-01). |
| `monthly_target_contribution`| NUMERIC(14,2)| No | `0.00` | System / User | Medium (Financial) | `>= 0.00` | Calculated or fixed required monthly savings rate (FR-GOAL-03). |
| `priority` | INTEGER | No | `1` | User | Low | `>= 1` | Priority order for advisory trade-off calculations. |
| `status` | `goal_status` ENUM | No | `'IN_PROGRESS'` | User / System | Low | `IN_PROGRESS`, `ACHIEVED`, `PAUSED`, `CANCELLED` | Lifecycle status of goal. |
| `notes` | TEXT | Yes | NULL | User | Low | Free text | Optional user notes. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Creation timestamp. |
| `updated_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Last update timestamp. |

---

### 2.15 Table: `goal_contributions` (NEW)
**Purpose:** Clear, auditable source-of-truth ledger for goal progress (HIGH FIX 6).  
**Classification:** Core / Financial Planning / Ledger  
**Lifecycle:** Append-Only / Immutable

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `contribution_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the goal contribution. |
| `goal_id` | UUID | No | None | User / System | Low | Composite FK `(user_id, goal_id)` | Target financial goal. |
| `user_id` | UUID | No | None | System | Low | Part of Composite FK | Goal owner. |
| `account_id` | UUID | Yes | NULL | User | Low | Composite FK `(user_id, account_id)` | Source account funding this contribution. |
| `transaction_id` | UUID | Yes | NULL | User / System | Low | FK to `transactions.transaction_id` | Optional link to actual transaction debiting account. |
| `amount` | NUMERIC(14,2) | No | None | User / System | High (Financial) | `> 0.00` | Contribution or withdrawal amount. |
| `contribution_type`| `contribution_type` ENUM | No | `'ALLOCATION'` | User / System | Low | `ALLOCATION`, `TRANSACTION_LINKED`, `INTEREST`, `WITHDRAWAL` | Financial movement type. |
| `contribution_date`| DATE | No | `CURRENT_DATE`| User / System | Low | Calendar date | Date allocation was recorded. |
| `notes` | TEXT | Yes | NULL | User | Low | Free text | Notes on contribution. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Record creation timestamp. |

---

### 2.16 Table: `recurring_commitments`
**Purpose:** Subscriptions and recurring bills used by the advisory engine for fixed obligations (FR-CAT-11, FR-ANL-05).  
**Classification:** Core / Subscriptions  
**Lifecycle:** Mutable

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `commitment_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for recurring commitment. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id` | Commitment owner. |
| `category_id` | UUID | No | None | System / User | Low | FK to `categories.category_id` | Spending category (e.g. Subscriptions, Utilities). |
| `account_id` | UUID | Yes | NULL | System / User | Low | Composite FK `(user_id, account_id)` | Account debited for this commitment (enforces ownership!). |
| `merchant_name` | VARCHAR(150) | No | None | System / User | Low | Non-empty string | Merchant / service provider (e.g. "Netflix", "BESCOM"). |
| `expected_amount`| NUMERIC(14,2)| No | None | System / User | Medium (Financial) | `> 0.00` | Expected recurring charge amount. |
| `frequency` | `commitment_frequency` ENUM | No | `'MONTHLY'` | System / User | Low | `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY` | Recurrence interval (FR-ANL-05). |
| `next_expected_date`| DATE | No | None | System / User | Low | Calendar date | Projected upcoming charge date. |
| `detection_confidence`| NUMERIC(5,4)| Yes | NULL | System (ML) | Low | `0.0000` to `1.0000` | Machine learning confidence score (NULL if user-defined). |
| `is_user_confirmed`| BOOLEAN | No | `FALSE` | User | Low | `TRUE`, `FALSE` | Whether user confirmed automated subscription detection (FR-CAT-11). |
| `status` | `commitment_status` ENUM | No | `'ACTIVE'` | User / System | Low | `ACTIVE`, `PAUSED`, `CANCELLED` | Operational status of commitment. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Creation timestamp. |
| `updated_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Last update timestamp. |

---

### 2.17 Table: `predictions`
**Purpose:** Immutable record of forecasting outputs and budget breach probability estimates (FR-ML-01 to 08).  
**Classification:** Core / AI / Analytical  
**Lifecycle:** Append-Only / Immutable Snapshot

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `prediction_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for the forecast output. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id` | Target user. |
| `category_id` | UUID | Yes | NULL | System | Low | FK to `categories.category_id` | Category being forecasted (NULL for total expenditure) (FR-ML-02). |
| `forecast_type` | `forecast_type` ENUM | No | None | System | Low | `TOTAL_EXPENDITURE`, `CATEGORY_EXPENDITURE`, `BUDGET_DEVIATION_RISK` | Forecast objective (FR-ML-01). |
| `target_period_start`| DATE | No | None | System | Low | Calendar date | Start date of predicted window. |
| `target_period_end`| DATE | No | None | System | Low | Calendar date `>= start` | End date of predicted window. |
| `predicted_amount`| NUMERIC(14,2)| No | None | System (ML) | Medium (Financial) | Any numeric amount | Point estimate of forecasted expenditure. |
| `confidence_score`| NUMERIC(5,4)| Yes | NULL | System (ML) | Low | `0.0000` to `1.0000` | Model statistical confidence interval metric (FR-ML-04). |
| `risk_probability`| NUMERIC(5,4)| Yes | NULL | System (ML) | Low | `0.0000` to `1.0000` | Probability of exceeding active budget (FR-ML-03). |
| `model_version` | VARCHAR(50) | No | None | System | Low | Version string | Artifact identifier of model generating forecast (FR-ML-05, 08). |
| `input_window_start`| DATE | No | None | System | Low | Calendar date | Historical start date of data feeding model. |
| `input_window_end` | DATE | No | None | System | Low | Calendar date | Historical end date of data feeding model. |
| `metadata` | JSONB | No | `'{}'` | System | Low | Valid JSON | Detailed parameters (e.g. upper/lower confidence bounds). |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Forecast generation timestamp. |

---

### 2.18 Table: `advisory_requests`
**Purpose:** User inquiries evaluating affordability of a proposed purchase ("Should I Buy This?") (FR-ADV-01, FR-ADV-10).  
**Classification:** Core / Advisory Input  
**Lifecycle:** Immutable Record

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `request_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for advisory inquiry. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id` | User submitting inquiry. |
| `category_id` | UUID | Yes | NULL | User | Low | FK to `categories.category_id` | Spending category of proposed purchase. |
| `purchase_amount` | NUMERIC(14,2)| No | None | User | Medium (Financial) | `> 0.00` | Proposed expenditure amount (FR-ADV-01). |
| `currency` | VARCHAR(3) | No | `'INR'` | User | Low | ISO 4217 code | Currency of proposed purchase. |
| `item_description`| VARCHAR(255) | No | None | User | Low | Non-empty string | What user plans to buy (e.g. "Mechanical Keyboard"). |
| `user_notes` | TEXT | Yes | NULL | User | Low | Free text | Context notes. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Inquiry submission timestamp. |

---

### 2.19 Table: `advisory_decisions`
**Purpose:** Results of deterministic affordability evaluation paired with LLM explanation (FR-ADV-02 to 12).  
**Classification:** Core / Advisory Output / Audit  
**Lifecycle:** Immutable Snapshot (FR-ADV-10)

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `request_id` | UUID | No | None | System | Low | PK & FK to `advisory_requests.request_id` | 1:1 strict binding to user request. |
| `decision_outcome`| `advisory_outcome` ENUM | No | None | Engine (Rules) | Low | `BUY`, `CONSIDER_WAITING`, `AVOID_FOR_NOW` | Bounded recommendation outcome (FR-ADV-05). |
| `affordability_score`| NUMERIC(5,2)| No | None | Engine (Math) | Low | `0.00` to `100.00` | Deterministic numerical score calculated from user liquidity. |
| `deterministic_factors`| JSONB | No | None | Engine (Math) | Medium (Financial) | Valid JSON | Snapshot of financial math: disposable income, committed bills, unallocated cash (FR-ADV-02). |
| `budget_impact_summary`| JSONB | No | None | Engine (Math) | Medium (Financial) | Valid JSON | Calculated category budget pre/post utilization percentage (FR-ADV-03). |
| `goal_impact_summary` | JSONB | No | None | Engine (Math) | Medium (Financial) | Valid JSON | Calculated days of delay on savings goals (FR-ADV-04). |
| `llm_explanation` | TEXT | No | None | AI (LLM) | Low | Natural language text | Human-readable explanation strictly grounded in deterministic factors (FR-ADV-06, FR-AI-01, 03). |
| `disclaimer` | TEXT | No | None | System | Low | Mandatory legal text | Non-fiduciary advisory disclaimer (FR-ADV-12). |
| `rule_engine_version`| VARCHAR(50)| No | None | System | Low | Version string | Artifact version of deterministic financial logic ruleset. |
| `llm_model_version` | VARCHAR(50)| No | None | System | Low | Version string | LLM provider and model checkpoint version. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Decision generation timestamp. |

---

### 2.20 Table: `feedbacks`
**Purpose:** Human feedback and corrections on AI classifications and recommendations (FR-CAT-09, FR-AI-06).  
**Classification:** Core / Feedback Loop / ML Improvement  
**Lifecycle:** Append-Only

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `feedback_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for feedback record. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id` | Feedback author. |
| `target_type` | `feedback_target` ENUM | No | None | User / UI | Low | `CATEGORIZATION`, `ADVISORY`, `FORECAST` | Subject entity being evaluated (FR-CAT-09, FR-AI-06). |
| `target_id` | UUID | No | None | User / UI | Low | Valid UUID | ID of specific transaction, request, or prediction. |
| `rating` | INTEGER | Yes | NULL | User | Low | `1` to `5` | Optional user rating score. |
| `feedback_text` | TEXT | Yes | NULL | User | Low | Free text | User commentary on accuracy or quality. |
| `correction_data` | JSONB | No | `'{}'` | User | Low | Valid JSON | Ground-truth correction payload (e.g. correct category ID). |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Feedback submission timestamp. |

---

### 2.21 Table: `notifications`
**Purpose:** In-app alerts and notifications for budget breaches, forecast warnings, and parsing errors (FR-ALT-01 to 05).  
**Classification:** Core / Notification  
**Lifecycle:** Mutable (`is_read`, `read_at`)

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `notification_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for notification. |
| `user_id` | UUID | No | None | System | Low | FK to `users.user_id` | Recipient user. |
| `notification_type` | `notification_type` ENUM | No | None | System | Low | `BUDGET_WARNING`, `BUDGET_BREACH`, `FORECAST_ALERT`, `PARSING_FAILURE`, `DUPLICATE_REVIEW_NEEDED`, etc. | Classification of alert event (FR-ALT-01, 02, 03). |
| `title` | VARCHAR(255) | No | None | System | Low | Non-empty string | Alert headline. |
| `message` | TEXT | No | None | System | Low | Non-empty string | Human-readable alert notification body. |
| `payload` | JSONB | No | `'{}'` | System | Low | Valid JSON | Deep-link attributes (e.g. `{budget_id: "...", current_spent: 4200}`). |
| `is_read` | BOOLEAN | No | `FALSE` | User | Low | `TRUE`, `FALSE` | Read state indicator. |
| `read_at` | TIMESTAMPTZ | Yes | NULL | User | Low | UTC Timestamp | Timestamp when user opened alert. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Alert dispatch timestamp. |

---

### 2.22 Table: `audit_events`
**Purpose:** Immutable security, administrative access, and compliance audit trail (FR-ADM-01 to 05, NFR-SEC-08).  
**Classification:** Core / Security / Compliance  
**Lifecycle:** Append-Only / Strictly Immutable

| Column Name | PostgreSQL Type | Nullable | Default | Source | Sensitivity | Allowed Values / Constraints | Business Meaning & Lifecycle Rules |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `event_id` | UUID | No | `gen_random_uuid()` | System | Low | Valid UUID v4 | Primary key for audit record. |
| `actor_id` | UUID | Yes | NULL | System | Low | Valid UUID | User or admin who performed action (NULL for background jobs). |
| `actor_role` | VARCHAR(50) | No | `'SYSTEM'` | System | Low | e.g. `'PROJECT_ADMIN'`, `'END_USER'`, `'SYSTEM'` | Access role of actor at time of execution (NFR-SEC-08). |
| `action` | VARCHAR(100) | No | None | System | Low | e.g. `'USER_LOGIN'`, `'CONSENT_REVOKED'`, `'ACCOUNT_DELETION'` | Audited security or data operation (FR-ADM-02). |
| `entity_type` | VARCHAR(50) | No | None | System | Low | e.g. `'USER'`, `'TRANSACTION'`, `'CONSENT'` | Target entity category. |
| `entity_id` | VARCHAR(100) | No | None | System | Low | String identifier | Primary key or reference of impacted entity. |
| `ip_address` | VARCHAR(45) | Yes | NULL | System | Medium | Valid IPv4/IPv6 string | Network IP address of caller. |
| `user_agent` | TEXT | Yes | NULL | System | Low | Client user-agent string | Browser or device signature. |
| `metadata` | JSONB | No | `'{}'` | System | Low | Valid JSON | Context parameters. NEVER stores passwords, secrets, or raw banking PII. |
| `created_at` | TIMESTAMPTZ | No | `CURRENT_TIMESTAMP` | System | Low | UTC Timestamp | Event occurrence timestamp. |
