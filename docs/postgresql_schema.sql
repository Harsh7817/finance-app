-- ============================================================================
-- AI-Powered Personal Finance & Smart Expenditure Advisor
-- Complete Production-Grade PostgreSQL DDL Script (v1.1 - Hardened Edition)
-- Target Database: PostgreSQL 14+ / 15+ / 16+
-- ============================================================================

-- Enable pgcrypto extension for cryptographic hashing and UUID v4 generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean schema teardown (safe for migration testing / repeatable test harnesses)
-- Drop in reverse dependency order
DROP TABLE IF EXISTS audit_events CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS feedbacks CASCADE;
DROP TABLE IF EXISTS advisory_decisions CASCADE;
DROP TABLE IF EXISTS advisory_requests CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS recurring_commitments CASCADE;
DROP TABLE IF EXISTS goal_contributions CASCADE;
DROP TABLE IF EXISTS financial_goals CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS categorization_logs CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS raw_messages CASCADE;
DROP TABLE IF EXISTS import_batches CASCADE;
DROP TABLE IF EXISTS data_sources CASCADE;
DROP TABLE IF EXISTS account_balance_snapshots CASCADE;
DROP TABLE IF EXISTS financial_accounts CASCADE;
DROP TABLE IF EXISTS consents CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom ENUM types
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS feedback_target CASCADE;
DROP TYPE IF EXISTS advisory_outcome CASCADE;
DROP TYPE IF EXISTS forecast_type CASCADE;
DROP TYPE IF EXISTS commitment_status CASCADE;
DROP TYPE IF EXISTS commitment_frequency CASCADE;
DROP TYPE IF EXISTS contribution_type CASCADE;
DROP TYPE IF EXISTS goal_status CASCADE;
DROP TYPE IF EXISTS budget_status CASCADE;
DROP TYPE IF EXISTS budget_period_type CASCADE;
DROP TYPE IF EXISTS categorization_method CASCADE;
DROP TYPE IF EXISTS transfer_status CASCADE;
DROP TYPE IF EXISTS duplicate_status CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS category_type CASCADE;
DROP TYPE IF EXISTS raw_message_status CASCADE;
DROP TYPE IF EXISTS batch_status CASCADE;
DROP TYPE IF EXISTS source_type CASCADE;
DROP TYPE IF EXISTS snapshot_source CASCADE;
DROP TYPE IF EXISTS account_status CASCADE;
DROP TYPE IF EXISTS account_type CASCADE;
DROP TYPE IF EXISTS consent_status CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ============================================================================
-- 1. ENUM DEFINITIONS
-- ============================================================================

CREATE TYPE user_role AS ENUM (
    'END_USER',
    'PROJECT_ADMIN',
    'AUDITOR'
);

CREATE TYPE user_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'DEACTIVATED'
);

CREATE TYPE consent_status AS ENUM (
    'GRANTED',
    'WITHDRAWN',
    'EXPIRED'
);

CREATE TYPE account_type AS ENUM (
    'SAVINGS',
    'CURRENT',
    'CREDIT_CARD',
    'WALLET',
    'CASH',
    'INVESTMENT'
);

CREATE TYPE account_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'CLOSED'
);

CREATE TYPE snapshot_source AS ENUM (
    'OPENING_BALANCE',
    'STATEMENT_IMPORT',
    'MANUAL_RECONCILIATION'
);

CREATE TYPE source_type AS ENUM (
    'ANDROID_SMS',
    'CSV_STATEMENT',
    'MANUAL_INPUT'
);

CREATE TYPE batch_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'PARTIALLY_FAILED',
    'FAILED'
);

CREATE TYPE raw_message_status AS ENUM (
    'PENDING',
    'PARSED',
    'POTENTIAL_DUPLICATE',
    'FAILED',
    'IGNORED'
);

CREATE TYPE category_type AS ENUM (
    'EXPENSE',
    'INCOME',
    'TRANSFER',
    'INVESTMENT'
);

CREATE TYPE transaction_type AS ENUM (
    'DEBIT',       -- Outgoing expenditure / purchase
    'CREDIT',      -- Incoming salary / deposit
    'TRANSFER',    -- Internal move between user accounts (net neutral)
    'REFUND',      -- Inbound refund offsetting prior purchase
    'REVERSAL',    -- Inbound bank reversal of incorrect debit
    'FEE'          -- Bank penalty / maintenance charge
);

CREATE TYPE transaction_status AS ENUM (
    'POSTED',
    'PENDING',
    'FLAGGED_FOR_REVIEW',
    'RECONCILED',
    'EXCLUDED'
);

CREATE TYPE duplicate_status AS ENUM (
    'NOT_DUPLICATE',
    'POTENTIAL_DUPLICATE',
    'CONFIRMED_DUPLICATE'
);

CREATE TYPE transfer_status AS ENUM (
    'SETTLED',
    'PENDING',
    'CANCELLED'
);

CREATE TYPE categorization_method AS ENUM (
    'RULE_BASED',
    'ML_MODEL',
    'USER_MANUAL',
    'FALLBACK_DEFAULT'
);

CREATE TYPE budget_period_type AS ENUM (
    'MONTHLY',
    'WEEKLY',
    'CUSTOM'
);

CREATE TYPE budget_status AS ENUM (
    'ACTIVE',
    'PAUSED',
    'ARCHIVED'
);

CREATE TYPE goal_status AS ENUM (
    'IN_PROGRESS',
    'ACHIEVED',
    'PAUSED',
    'CANCELLED'
);

CREATE TYPE contribution_type AS ENUM (
    'ALLOCATION',
    'TRANSACTION_LINKED',
    'INTEREST',
    'WITHDRAWAL'
);

CREATE TYPE commitment_frequency AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'YEARLY'
);

CREATE TYPE commitment_status AS ENUM (
    'ACTIVE',
    'PAUSED',
    'CANCELLED'
);

CREATE TYPE forecast_type AS ENUM (
    'TOTAL_EXPENDITURE',
    'CATEGORY_EXPENDITURE',
    'BUDGET_DEVIATION_RISK'
);

CREATE TYPE advisory_outcome AS ENUM (
    'BUY',
    'CONSIDER_WAITING',
    'AVOID_FOR_NOW'
);

CREATE TYPE feedback_target AS ENUM (
    'CATEGORIZATION',
    'ADVISORY',
    'FORECAST'
);

CREATE TYPE notification_type AS ENUM (
    'BUDGET_WARNING',
    'BUDGET_BREACH',
    'FORECAST_ALERT',
    'PARSING_FAILURE',
    'RECURRING_DUE',
    'ADVISORY_FOLLOWUP',
    'DUPLICATE_REVIEW_NEEDED',
    'SYSTEM'
);

-- ============================================================================
-- 2. REUSABLE TRIGGER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. CORE IDENTITY & USER DOMAIN
-- ============================================================================

-- Table: users
-- Represents the core login identity and credentials (NFR-SEC-02, FR-AUTH-01 to 05)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Argon2id/Bcrypt hash. Plaintext forbidden.
    role user_role NOT NULL DEFAULT 'END_USER',
    status user_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ NULL, -- Soft delete support (FR-AUTH-05)
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

COMMENT ON TABLE users IS 'Authoritative user login accounts and access control identities.';
COMMENT ON COLUMN users.password_hash IS 'Cryptographically hashed password (Argon2id/Bcrypt). Plaintext strictly prohibited.';
COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp. If populated, user account is deactivated while preserving audit records.';

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- Table: user_profiles
-- Configured financial profile and application preferences (FR-FIN-01, FR-ALT-04)
CREATE TABLE user_profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    base_currency VARCHAR(3) NOT NULL DEFAULT 'INR', -- ISO 4217 code
    monthly_stated_income NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    savings_target_percentage NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
    risk_tolerance VARCHAR(50) NOT NULL DEFAULT 'MODERATE', -- LOW, MODERATE, HIGH
    notification_preferences JSONB NOT NULL DEFAULT '{"budget_threshold_pct": 80, "forecast_warnings": true, "email_alerts": false, "in_app_alerts": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_profiles_user_id UNIQUE (user_id),
    CONSTRAINT fk_user_profiles_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_user_profiles_income CHECK (monthly_stated_income >= 0),
    CONSTRAINT chk_user_profiles_savings_pct CHECK (savings_target_percentage >= 0 AND savings_target_percentage <= 100),
    CONSTRAINT chk_user_profiles_currency_len CHECK (LENGTH(base_currency) = 3)
);

COMMENT ON TABLE user_profiles IS 'User financial profile containing base currency, declared income, and notification configurations.';

CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- Table: consents
-- Complete auditable consent lifecycle tracking (FR-CNS-01 to 05, NFR-PRV-02)
CREATE TABLE consents (
    consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    purpose VARCHAR(100) NOT NULL, -- e.g. 'TRANSACTION_MESSAGE_INGESTION', 'AI_PURCHASE_ADVISOR', 'ANALYTICS'
    scope VARCHAR(255) NOT NULL,   -- e.g. 'ANDROID_SMS_READ', 'CSV_STATEMENT_PROCESSING'
    status consent_status NOT NULL DEFAULT 'GRANTED',
    consent_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    ip_address VARCHAR(45) NULL,   -- Client IP at time of grant
    user_agent TEXT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NULL,   -- Optional automatic expiry
    withdrawn_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_consents_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_consents_withdrawn CHECK (
        (status = 'WITHDRAWN' AND withdrawn_at IS NOT NULL) OR
        (status != 'WITHDRAWN' AND withdrawn_at IS NULL)
    )
);

COMMENT ON TABLE consents IS 'Immutable audit history of user consent grants and revocations.';

CREATE INDEX idx_consents_user_status ON consents(user_id, status);
CREATE INDEX idx_consents_user_purpose ON consents(user_id, purpose, status);


-- ============================================================================
-- 4. FINANCIAL ACCOUNTS & BALANCE SNAPSHOTS DOMAIN
-- ============================================================================

-- Table: financial_accounts
-- Real-world financial instruments owned by the user (Bank accounts, cards, cash)
-- CRITICAL FIX 2: Includes composite unique key (user_id, account_id) to enforce account ownership across schema!
CREATE TABLE financial_accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    account_name VARCHAR(100) NOT NULL, -- e.g. 'HDFC Salary Account', 'ICICI Amazon Pay Card'
    account_type account_type NOT NULL,
    institution_name VARCHAR(100) NOT NULL, -- e.g. 'HDFC Bank', 'State Bank of India'
    account_mask VARCHAR(10) NULL, -- Last 4 digits (e.g. '1234') for recognition. NEVER full account number.
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    cached_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- Performance cache; authoritative balance is calculated from snapshot + ledger
    last_reconciled_at TIMESTAMPTZ NULL,
    status account_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_financial_accounts_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT uq_financial_accounts_user_account UNIQUE (user_id, account_id), -- Composite target for composite foreign keys
    CONSTRAINT chk_financial_accounts_currency CHECK (LENGTH(currency) = 3)
);

COMMENT ON TABLE financial_accounts IS 'User bank accounts, credit cards, and digital wallets. NEVER stores credentials or PINs.';
COMMENT ON COLUMN financial_accounts.account_mask IS 'Sanitized masked identifier (e.g. *1234) for transaction matching.';
COMMENT ON COLUMN financial_accounts.cached_balance IS 'Cached balance for fast UI queries. Authoritative balance is calculated from account_balance_snapshots + transactions ledger.';

CREATE INDEX idx_financial_accounts_user ON financial_accounts(user_id, status);

CREATE TRIGGER trg_financial_accounts_updated_at
BEFORE UPDATE ON financial_accounts
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- Table: account_balance_snapshots
-- HIGH FIX 5: Authoritative point-in-time balance anchor records.
-- Solves conflict between stored vs calculated balances:
-- Balance(t) = SnapshotBalance(t_anchor) + SUM(Ledger entries between t_anchor and t)
CREATE TABLE account_balance_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL,
    user_id UUID NOT NULL,
    balance_amount NUMERIC(14, 2) NOT NULL,
    as_of_timestamp TIMESTAMPTZ NOT NULL,
    snapshot_source snapshot_source NOT NULL DEFAULT 'STATEMENT_IMPORT',
    statement_reference VARCHAR(100) NULL, -- e.g. Statement Period or Batch Ref
    is_reconciled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_balance_snapshots_user_acc FOREIGN KEY (user_id, account_id) 
        REFERENCES financial_accounts(user_id, account_id) ON DELETE CASCADE
);

COMMENT ON TABLE account_balance_snapshots IS 'Authoritative historical balance anchors from bank statements or manual reconciliation.';

CREATE INDEX idx_balance_snapshots_account ON account_balance_snapshots(account_id, as_of_timestamp DESC);


-- ============================================================================
-- 5. INGESTION PIPELINE (DATA SOURCES, BATCHES & RAW MESSAGES)
-- ============================================================================

-- Table: data_sources
-- Ingestion pipelines authorized by the user (Android SMS, CSV upload, manual)
-- CRITICAL FIX 2: Composite FK enforcing user ownership of account_id
CREATE TABLE data_sources (
    source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    account_id UUID NULL, -- Optional default account mapping
    source_type source_type NOT NULL,
    provider_name VARCHAR(100) NOT NULL, -- e.g. 'HDFC_SMS_SENDER', 'SBI_CSV_TEMPLATE'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- Config info like parser ruleset ID
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_data_sources_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_data_sources_user_account FOREIGN KEY (user_id, account_id) 
        REFERENCES financial_accounts(user_id, account_id) ON DELETE SET NULL,
    CONSTRAINT uq_data_sources_user_source UNIQUE (user_id, source_id) -- Composite target for batch ownership
);

COMMENT ON TABLE data_sources IS 'Configured transaction data acquisition endpoints.';

CREATE INDEX idx_data_sources_user ON data_sources(user_id, is_active);

CREATE TRIGGER trg_data_sources_updated_at
BEFORE UPDATE ON data_sources
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- Table: import_batches
-- Tracks ingestion sessions (CSV file upload session or SMS periodic sync batch)
-- CRITICAL FIX 2: Composite FK enforcing user ownership of source_id
CREATE TABLE import_batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL,
    user_id UUID NOT NULL,
    batch_reference VARCHAR(100) NULL, -- Client-supplied session ID or filename
    file_hash VARCHAR(64) NULL, -- SHA-256 hash of CSV file to prevent duplicate file uploads
    status batch_status NOT NULL DEFAULT 'PENDING',
    total_records INTEGER NOT NULL DEFAULT 0,
    parsed_records INTEGER NOT NULL DEFAULT 0,
    duplicate_records INTEGER NOT NULL DEFAULT 0,
    failed_records INTEGER NOT NULL DEFAULT 0,
    error_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_import_batches_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_import_batches_user_source FOREIGN KEY (user_id, source_id) 
        REFERENCES data_sources(user_id, source_id) ON DELETE CASCADE,
    CONSTRAINT uq_import_batches_user_batch UNIQUE (user_id, batch_id), -- Composite target for raw message ownership
    CONSTRAINT chk_import_batches_counts CHECK (
        total_records >= 0 AND parsed_records >= 0 AND
        duplicate_records >= 0 AND failed_records >= 0
    )
);

COMMENT ON TABLE import_batches IS 'Batch session monitoring for asynchronous CSV statement processing and SMS syncs.';

CREATE INDEX idx_import_batches_user ON import_batches(user_id, status);
CREATE INDEX idx_import_batches_file_hash ON import_batches(user_id, file_hash) WHERE file_hash IS NOT NULL;

CREATE TRIGGER trg_import_batches_updated_at
BEFORE UPDATE ON import_batches
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- Table: raw_messages
-- Auditable, minimized raw message or CSV row record (FR-TXN-03, NFR-PRV-01)
-- CRITICAL FIX 1: Unique constraint on external_message_id when present.
-- Message text content_hash is indexed for review, NOT hard-unique to avoid rejecting valid recurring messages!
-- CRITICAL FIX 2: Composite FK enforcing user ownership of batch_id.
CREATE TABLE raw_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    source_id UUID NOT NULL,
    user_id UUID NOT NULL,
    external_message_id VARCHAR(100) NULL, -- Android SMS telephony ID or CSV row index
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 fingerprint of the sanitized text
    sanitized_preview TEXT NULL, -- Redacted text (PII/OTPs stripped). Never full inbox.
    processing_status raw_message_status NOT NULL DEFAULT 'PENDING',
    duplicate_of_id UUID NULL, -- Links to existing message if flagged as duplicate
    parser_version VARCHAR(50) NOT NULL DEFAULT 'v1.0',
    rejection_reason TEXT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_raw_messages_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_raw_messages_user_batch FOREIGN KEY (user_id, batch_id) 
        REFERENCES import_batches(user_id, batch_id) ON DELETE CASCADE,
    CONSTRAINT fk_raw_messages_sources FOREIGN KEY (source_id) REFERENCES data_sources(source_id) ON DELETE CASCADE,
    CONSTRAINT fk_raw_messages_duplicate FOREIGN KEY (duplicate_of_id) REFERENCES raw_messages(message_id) ON DELETE SET NULL
);

COMMENT ON TABLE raw_messages IS 'Minimized, redacted source ingestion messages. Strictly filters out personal texts and OTPs.';

-- Strong provider deduplication when external ID is supplied
CREATE UNIQUE INDEX uq_raw_messages_provider_id 
ON raw_messages (source_id, external_message_id) 
WHERE external_message_id IS NOT NULL;

-- Fast index for duplicate lookup without blocking legitimate identical text
CREATE INDEX idx_raw_messages_content_hash ON raw_messages (user_id, content_hash);
CREATE INDEX idx_raw_messages_status ON raw_messages(processing_status);
CREATE INDEX idx_raw_messages_user_received ON raw_messages(user_id, received_at DESC);


-- ============================================================================
-- 6. CATEGORIES & TAXONOMY DOMAIN
-- ============================================================================

-- Table: categories
-- Configurable hierarchical spending categories (FR-CAT-01 to 06)
-- Supports system-wide defaults (user_id IS NULL) and user custom categories
CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL, -- NULL indicates global system category; Populated indicates user-custom category
    parent_id UUID NULL, -- Hierarchical parent-child relationship
    name VARCHAR(50) NOT NULL,
    category_type category_type NOT NULL DEFAULT 'EXPENSE',
    icon VARCHAR(50) NULL,
    color_hex VARCHAR(7) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    CONSTRAINT chk_categories_color CHECK (color_hex IS NULL OR color_hex ~* '^#[0-9A-Fa-f]{6}$')
);

COMMENT ON TABLE categories IS 'Hierarchical taxonomy. System defaults have user_id = NULL; custom categories have user_id set.';

CREATE UNIQUE INDEX uq_categories_system_name ON categories (LOWER(name)) WHERE user_id IS NULL;
CREATE UNIQUE INDEX uq_categories_user_name ON categories (user_id, LOWER(name)) WHERE user_id IS NOT NULL;
CREATE INDEX idx_categories_parent ON categories(parent_id);

CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- ============================================================================
-- 7. TRANSACTIONS & RECONCILIATION DOMAIN
-- ============================================================================

-- Table: transactions
-- Canonical normalized financial records (FR-TXN-04, 05, FR-FIN-04, 05)
-- CRITICAL FIX 1: Non-unique reference_hash for heuristic matching; hard unique index ONLY on verified external_reference.
-- CRITICAL FIX 2: Composite FK enforcing user ownership of account_id!
-- HIGH FIX 4: Explicit original_transaction_id for refunds and reversals.
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    account_id UUID NOT NULL,
    batch_id UUID NULL,
    raw_message_id UUID NULL,
    category_id UUID NOT NULL,
    amount NUMERIC(14, 2) NOT NULL, -- Non-negative value. Sign/direction governed by type.
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    type transaction_type NOT NULL, -- DEBIT, CREDIT, TRANSFER, REFUND, REVERSAL, FEE
    status transaction_status NOT NULL DEFAULT 'POSTED',
    duplicate_status duplicate_status NOT NULL DEFAULT 'NOT_DUPLICATE',
    possible_duplicate_of_id UUID NULL, -- Links to existing transaction if flagged for review
    merchant_name VARCHAR(150) NOT NULL, -- Normalized merchant / counterparty
    clean_merchant_name VARCHAR(150) NOT NULL, -- Stripped of terminal IDs, locations, etc.
    description TEXT NULL, -- Bank narration / reference line
    transaction_at TIMESTAMPTZ NOT NULL, -- Actual time of transaction occurrence
    posting_date DATE NOT NULL, -- Settlement / accounting date
    reference_hash VARCHAR(64) NOT NULL, -- Heuristic fingerprint = SHA256(account_id, amount, transaction_at, clean_merchant_name)
    external_reference VARCHAR(100) NULL, -- Bank UPI ref, UTR, RRN, or check number
    original_transaction_id UUID NULL, -- HIGH FIX 4: Links REFUND or REVERSAL back to original purchase
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    is_user_verified BOOLEAN NOT NULL DEFAULT FALSE, -- Set to TRUE once user confirms categorization
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- Raw extraction attributes (e.g. balance_after)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ NULL, -- Soft delete support
    CONSTRAINT fk_transactions_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_user_account FOREIGN KEY (user_id, account_id) 
        REFERENCES financial_accounts(user_id, account_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_batches FOREIGN KEY (batch_id) REFERENCES import_batches(batch_id) ON DELETE SET NULL,
    CONSTRAINT fk_transactions_raw_messages FOREIGN KEY (raw_message_id) REFERENCES raw_messages(message_id) ON DELETE SET NULL,
    CONSTRAINT fk_transactions_categories FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_original FOREIGN KEY (original_transaction_id) REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    CONSTRAINT fk_transactions_duplicate FOREIGN KEY (possible_duplicate_of_id) REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    CONSTRAINT chk_transactions_amount_pos CHECK (amount > 0),
    CONSTRAINT chk_transactions_currency CHECK (LENGTH(currency) = 3)
);

COMMENT ON TABLE transactions IS 'Authoritative normalized ledger of all financial transactions.';
COMMENT ON COLUMN transactions.reference_hash IS 'Heuristic fingerprint used to identify candidate duplicates for review without hard rejecting legitimate purchases.';
COMMENT ON COLUMN transactions.external_reference IS 'Strong provider reference (UPI UTR / Bank RRN). Uniquely constrained when present.';

-- Strong provider deduplication: Prevents exact duplicate entries with identical bank UTR/RRN
CREATE UNIQUE INDEX uq_transactions_account_external_ref 
ON transactions (account_id, external_reference) 
WHERE external_reference IS NOT NULL AND deleted_at IS NULL;

-- Fast index on heuristic reference hash to find duplicate candidates
CREATE INDEX idx_transactions_reference_hash 
ON transactions (account_id, reference_hash) 
WHERE deleted_at IS NULL;

-- High-frequency analytics and filtering indexes
CREATE INDEX idx_transactions_user_date ON transactions (user_id, transaction_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_user_cat_date ON transactions (user_id, category_id, transaction_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_account_date ON transactions (account_id, transaction_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_clean_merchant ON transactions (clean_merchant_name);
CREATE INDEX idx_transactions_original ON transactions (original_transaction_id) WHERE original_transaction_id IS NOT NULL;
CREATE INDEX idx_transactions_duplicate ON transactions (possible_duplicate_of_id) WHERE possible_duplicate_of_id IS NOT NULL;

CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- ============================================================================
-- 8. INTERNAL TRANSFERS DOMAIN
-- ============================================================================

-- Table: transfers
-- CRITICAL FIX 3: Logical transfer relationship between two account-side entries!
-- Enforces:
-- 1. Source and destination accounts belong to the SAME user.
-- 2. Source account != destination account.
-- 3. Exact 1:1 pair between source_transaction_id (debit leg) and destination_transaction_id (credit leg).
-- 4. Excluded from ordinary income and expenditure calculations.
CREATE TABLE transfers (
    transfer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    source_account_id UUID NOT NULL,
    destination_account_id UUID NOT NULL,
    source_transaction_id UUID NOT NULL,
    destination_transaction_id UUID NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status transfer_status NOT NULL DEFAULT 'SETTLED',
    transfer_date TIMESTAMPTZ NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_transfers_source_txn UNIQUE (source_transaction_id),
    CONSTRAINT uq_transfers_dest_txn UNIQUE (destination_transaction_id),
    CONSTRAINT chk_transfers_distinct_accounts CHECK (source_account_id <> destination_account_id),
    CONSTRAINT chk_transfers_amount_pos CHECK (amount > 0),
    CONSTRAINT fk_transfers_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_transfers_user_source_acc FOREIGN KEY (user_id, source_account_id) 
        REFERENCES financial_accounts(user_id, account_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfers_user_dest_acc FOREIGN KEY (user_id, destination_account_id) 
        REFERENCES financial_accounts(user_id, account_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfers_source_txn FOREIGN KEY (source_transaction_id) 
        REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    CONSTRAINT fk_transfers_dest_txn FOREIGN KEY (destination_transaction_id) 
        REFERENCES transactions(transaction_id) ON DELETE CASCADE
);

COMMENT ON TABLE transfers IS 'First-class logical transfer pairing two account-side transactions, guaranteeing identical user ownership and distinct accounts.';

CREATE INDEX idx_transfers_user_date ON transfers (user_id, transfer_date DESC);

CREATE TRIGGER trg_transfers_updated_at
BEFORE UPDATE ON transfers
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- Table: categorization_logs
-- Decision metadata and user correction feedback (FR-CAT-07, 08, 09, NFR-MNT-02)
CREATE TABLE categorization_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    category_id UUID NOT NULL,
    method categorization_method NOT NULL,
    confidence_score NUMERIC(5, 4) NULL, -- e.g. 0.9520 (NULL if manual user selection)
    model_version VARCHAR(50) NOT NULL DEFAULT 'rule_engine_v1.0',
    user_overridden BOOLEAN NOT NULL DEFAULT FALSE,
    previous_category_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cat_logs_transactions FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    CONSTRAINT fk_cat_logs_categories FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    CONSTRAINT fk_cat_logs_prev_cat FOREIGN KEY (previous_category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    CONSTRAINT chk_cat_logs_confidence CHECK (confidence_score IS NULL OR (confidence_score >= 0.0 AND confidence_score <= 1.0))
);

COMMENT ON TABLE categorization_logs IS 'Audit log of categorization decisions, model versions, confidence scores, and user overrides.';

CREATE INDEX idx_cat_logs_transaction ON categorization_logs (transaction_id);
CREATE INDEX idx_cat_logs_override ON categorization_logs (user_overridden) WHERE user_overridden = TRUE;


-- ============================================================================
-- 9. BUDGETS & FINANCIAL GOALS DOMAIN
-- ============================================================================

-- Table: budgets
-- User-defined spending limits by category or overall period (FR-BUD-01 to 07)
CREATE TABLE budgets (
    budget_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    category_id UUID NULL, -- NULL implies an overall/global spending budget across all categories
    name VARCHAR(100) NOT NULL, -- e.g. 'Monthly Dining Out Budget'
    period_type budget_period_type NOT NULL DEFAULT 'MONTHLY',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    limit_amount NUMERIC(14, 2) NOT NULL,
    warning_threshold_pct INTEGER NOT NULL DEFAULT 80, -- Trigger warning notification at this %
    status budget_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_budgets_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_budgets_categories FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    CONSTRAINT chk_budgets_period CHECK (period_end >= period_start),
    CONSTRAINT chk_budgets_limit CHECK (limit_amount > 0),
    CONSTRAINT chk_budgets_threshold CHECK (warning_threshold_pct BETWEEN 1 AND 100)
);

COMMENT ON TABLE budgets IS 'Budget limits. category_id is nullable to support overall total monthly spending budgets.';

CREATE INDEX idx_budgets_user_period ON budgets (user_id, period_start, period_end, status);
CREATE INDEX idx_budgets_user_cat ON budgets (user_id, category_id) WHERE category_id IS NOT NULL;

CREATE TRIGGER trg_budgets_updated_at
BEFORE UPDATE ON budgets
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- Table: financial_goals
-- User financial savings targets and milestones (FR-GOAL-01 to 05)
-- CRITICAL FIX 2: Composite FK enforcing user ownership of account_id
CREATE TABLE financial_goals (
    goal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    account_id UUID NULL, -- Dedicated savings account linked to this goal, if assigned
    name VARCHAR(100) NOT NULL, -- e.g. 'Emergency Fund', 'New Laptop Purchase'
    target_amount NUMERIC(14, 2) NOT NULL,
    cached_current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- Authoritative progress derived from goal_contributions ledger
    target_date DATE NOT NULL,
    monthly_target_contribution NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    priority INTEGER NOT NULL DEFAULT 1, -- 1 = High, 2 = Medium, 3 = Low
    status goal_status NOT NULL DEFAULT 'IN_PROGRESS',
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_financial_goals_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_financial_goals_user_account FOREIGN KEY (user_id, account_id) 
        REFERENCES financial_accounts(user_id, account_id) ON DELETE SET NULL,
    CONSTRAINT uq_financial_goals_user_goal UNIQUE (user_id, goal_id), -- Composite target for contribution ledger
    CONSTRAINT chk_financial_goals_target CHECK (target_amount > 0),
    CONSTRAINT chk_financial_goals_current CHECK (cached_current_amount >= 0),
    CONSTRAINT chk_financial_goals_priority CHECK (priority >= 1)
);

COMMENT ON TABLE financial_goals IS 'User savings targets, deadlines, and deterministic allocation tracking.';

CREATE INDEX idx_financial_goals_user_status ON financial_goals (user_id, status);

CREATE TRIGGER trg_financial_goals_updated_at
BEFORE UPDATE ON financial_goals
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- Table: goal_contributions
-- HIGH FIX 6: Clear, auditable source-of-truth ledger for goal progress!
-- Progress is calculated as: SUM(allocations) - SUM(withdrawals)
CREATE TABLE goal_contributions (
    contribution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL,
    user_id UUID NOT NULL,
    account_id UUID NULL,
    transaction_id UUID NULL, -- Optional link to real ledger transaction
    amount NUMERIC(14, 2) NOT NULL,
    contribution_type contribution_type NOT NULL DEFAULT 'ALLOCATION',
    contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contributions_user_goal FOREIGN KEY (user_id, goal_id) 
        REFERENCES financial_goals(user_id, goal_id) ON DELETE CASCADE,
    CONSTRAINT fk_contributions_user_acc FOREIGN KEY (user_id, account_id) 
        REFERENCES financial_accounts(user_id, account_id) ON DELETE SET NULL,
    CONSTRAINT fk_contributions_transaction FOREIGN KEY (transaction_id) 
        REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    CONSTRAINT chk_contributions_amount_pos CHECK (amount > 0)
);

COMMENT ON TABLE goal_contributions IS 'Authoritative audit ledger of all goal allocations, transaction linkages, and withdrawals.';

CREATE INDEX idx_contributions_goal ON goal_contributions(goal_id, contribution_date DESC);
CREATE INDEX idx_contributions_user ON goal_contributions(user_id);


-- Table: recurring_commitments
-- Detected and confirmed subscriptions and recurring bills (FR-CAT-11, FR-ANL-05)
-- CRITICAL FIX 2: Composite FK enforcing user ownership of account_id
CREATE TABLE recurring_commitments (
    commitment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    category_id UUID NOT NULL,
    account_id UUID NULL,
    merchant_name VARCHAR(150) NOT NULL, -- e.g. 'Netflix', 'Electricity Utility'
    expected_amount NUMERIC(14, 2) NOT NULL,
    frequency commitment_frequency NOT NULL DEFAULT 'MONTHLY',
    next_expected_date DATE NOT NULL,
    detection_confidence NUMERIC(5, 4) NULL, -- NULL if created directly by user
    is_user_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    status commitment_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_commitments_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_commitments_categories FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    CONSTRAINT fk_commitments_user_account FOREIGN KEY (user_id, account_id) 
        REFERENCES financial_accounts(user_id, account_id) ON DELETE SET NULL,
    CONSTRAINT chk_commitments_amount CHECK (expected_amount > 0),
    CONSTRAINT chk_commitments_confidence CHECK (detection_confidence IS NULL OR (detection_confidence >= 0.0 AND detection_confidence <= 1.0))
);

COMMENT ON TABLE recurring_commitments IS 'Subscription commitments used by the advisory engine for fixed expense obligations.';

CREATE INDEX idx_commitments_user_due ON recurring_commitments (user_id, next_expected_date, status);

CREATE TRIGGER trg_recurring_commitments_updated_at
BEFORE UPDATE ON recurring_commitments
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- ============================================================================
-- 10. PREDICTIVE BUDGETING & FORECASTING DOMAIN
-- ============================================================================

-- Table: predictions
-- Forecast output records and budget deviation risk estimates (FR-ML-01 to 08)
CREATE TABLE predictions (
    prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    category_id UUID NULL, -- NULL for total monthly expenditure forecasts
    forecast_type forecast_type NOT NULL,
    target_period_start DATE NOT NULL,
    target_period_end DATE NOT NULL,
    predicted_amount NUMERIC(14, 2) NOT NULL,
    confidence_score NUMERIC(5, 4) NULL, -- Uncertainty indicator (FR-ML-04)
    risk_probability NUMERIC(5, 4) NULL, -- Probability of exceeding budget (FR-ML-03)
    model_version VARCHAR(50) NOT NULL, -- e.g. 'arima_expenditure_v1.2'
    input_window_start DATE NOT NULL,
    input_window_end DATE NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. features used, upper/lower bounds
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_predictions_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_predictions_categories FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    CONSTRAINT chk_predictions_period CHECK (target_period_end >= target_period_start),
    CONSTRAINT chk_predictions_input_window CHECK (input_window_end >= input_window_start),
    CONSTRAINT chk_predictions_confidence CHECK (confidence_score IS NULL OR (confidence_score >= 0.0 AND confidence_score <= 1.0)),
    CONSTRAINT chk_predictions_risk CHECK (risk_probability IS NULL OR (risk_probability >= 0.0 AND risk_probability <= 1.0))
);

COMMENT ON TABLE predictions IS 'Immutable history of ML forecast outputs. Retraining preserves historical predictions.';

CREATE INDEX idx_predictions_user_period ON predictions (user_id, target_period_start, target_period_end);
CREATE INDEX idx_predictions_user_cat ON predictions (user_id, category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_predictions_model ON predictions (model_version);


-- ============================================================================
-- 11. SMART PURCHASE ADVISORY DOMAIN ('SHOULD I BUY THIS?')
-- ============================================================================

-- Table: advisory_requests
-- User-initiated purchase queries (FR-ADV-01, FR-ADV-10)
CREATE TABLE advisory_requests (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    category_id UUID NULL,
    purchase_amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    item_description VARCHAR(255) NOT NULL,
    user_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_advisory_requests_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_advisory_requests_categories FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    CONSTRAINT chk_advisory_requests_amount CHECK (purchase_amount > 0),
    CONSTRAINT chk_advisory_requests_currency CHECK (LENGTH(currency) = 3)
);

COMMENT ON TABLE advisory_requests IS 'User purchase inquiries evaluated by the advisory engine.';

CREATE INDEX idx_advisory_requests_user ON advisory_requests (user_id, created_at DESC);


-- Table: advisory_decisions
-- Deterministic calculation factors and LLM-grounded explanations (FR-ADV-02 to 12)
CREATE TABLE advisory_decisions (
    request_id UUID PRIMARY KEY, -- 1:1 relationship with advisory_requests
    decision_outcome advisory_outcome NOT NULL, -- BUY, CONSIDER_WAITING, AVOID_FOR_NOW
    affordability_score NUMERIC(5, 2) NOT NULL, -- Deterministic score (0.00 to 100.00)
    deterministic_factors JSONB NOT NULL, -- Snapshot: {disposable_income, budget_surplus, unallocated_savings}
    budget_impact_summary JSONB NOT NULL, -- {budget_id, pre_utilization_pct, post_utilization_pct, will_breach}
    goal_impact_summary JSONB NOT NULL,   -- {goal_id, delayed_days, goal_monthly_deficit}
    llm_explanation TEXT NOT NULL,        -- Natural language rationale (strictly grounded in deterministic facts)
    disclaimer TEXT NOT NULL,             -- Mandatory legal / non-fiduciary advisory disclaimer
    rule_engine_version VARCHAR(50) NOT NULL,
    llm_model_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_advisory_decisions_request FOREIGN KEY (request_id) REFERENCES advisory_requests(request_id) ON DELETE CASCADE,
    CONSTRAINT chk_advisory_decisions_score CHECK (affordability_score >= 0.00 AND affordability_score <= 100.00)
);

COMMENT ON TABLE advisory_decisions IS 'Advisory outcomes. Strictly isolates deterministic mathematical inputs from generative AI text.';

CREATE INDEX idx_advisory_decisions_outcome ON advisory_decisions (decision_outcome);


-- ============================================================================
-- 12. FEEDBACK, NOTIFICATIONS & AUDIT TRAIL DOMAIN
-- ============================================================================

-- Table: feedbacks
-- User corrections and feedback for continuous system evaluation (FR-CAT-09, FR-AI-06)
CREATE TABLE feedbacks (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    target_type feedback_target NOT NULL, -- CATEGORIZATION, ADVISORY, FORECAST
    target_id UUID NOT NULL, -- Polymorphic reference to transaction_id, request_id, or prediction_id
    rating INTEGER NULL, -- Optional 1 to 5 star rating
    feedback_text TEXT NULL,
    correction_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {corrected_category_id: "...", reason: "..."}
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedbacks_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_feedbacks_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

COMMENT ON TABLE feedbacks IS 'User feedback on ML classifications and advisory evaluations.';

CREATE INDEX idx_feedbacks_target ON feedbacks (target_type, target_id);
CREATE INDEX idx_feedbacks_user ON feedbacks (user_id);


-- Table: notifications
-- User notifications and alert dispatch queue (FR-ALT-01 to 05)
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    notification_type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- Context links: {budget_id, transaction_id, etc.}
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

COMMENT ON TABLE notifications IS 'Persisted notifications and in-app alerts.';

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);


-- Table: audit_events
-- Security, administrative access, and compliance audit trail (FR-ADM-01 to 05, NFR-SEC-08)
CREATE TABLE audit_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NULL, -- User or Admin who initiated the event (NULL for background system jobs)
    actor_role VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    action VARCHAR(100) NOT NULL, -- e.g. 'USER_LOGIN', 'CONSENT_WITHDRAWAL', 'ACCOUNT_DELETION_REQUEST'
    entity_type VARCHAR(50) NOT NULL, -- 'USER', 'TRANSACTION', 'CONSENT', 'DATA_SOURCE'
    entity_id VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- Audit details without leaking sensitive secrets
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE audit_events IS 'Immutable, append-only security and administrative audit log.';

CREATE INDEX idx_audit_events_actor ON audit_events (actor_id, created_at DESC);
CREATE INDEX idx_audit_events_entity ON audit_events (entity_type, entity_id);
CREATE INDEX idx_audit_events_action_date ON audit_events (action, created_at DESC);

-- ============================================================================
-- END OF HARDENED DDL SCRIPT (v1.1)
-- ============================================================================
