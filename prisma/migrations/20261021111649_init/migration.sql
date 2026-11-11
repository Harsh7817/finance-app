-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('END_USER', 'PROJECT_ADMIN', 'AUDITOR');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "consent_status" AS ENUM ('GRANTED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "account_type" AS ENUM ('SAVINGS', 'CURRENT', 'CREDIT_CARD', 'WALLET', 'CASH', 'INVESTMENT');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('ACTIVE', 'INACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "snapshot_source" AS ENUM ('OPENING_BALANCE', 'STATEMENT_IMPORT', 'MANUAL_RECONCILIATION');

-- CreateEnum
CREATE TYPE "source_type" AS ENUM ('ANDROID_SMS', 'CSV_STATEMENT', 'MANUAL_INPUT');

-- CreateEnum
CREATE TYPE "batch_status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED');

-- CreateEnum
CREATE TYPE "raw_message_status" AS ENUM ('PENDING', 'PARSED', 'POTENTIAL_DUPLICATE', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "category_type" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER', 'INVESTMENT');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('DEBIT', 'CREDIT', 'TRANSFER', 'REFUND', 'REVERSAL', 'FEE');

-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('POSTED', 'PENDING', 'FLAGGED_FOR_REVIEW', 'RECONCILED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "duplicate_status" AS ENUM ('NOT_DUPLICATE', 'POTENTIAL_DUPLICATE', 'CONFIRMED_DUPLICATE');

-- CreateEnum
CREATE TYPE "transfer_status" AS ENUM ('SETTLED', 'PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "categorization_method" AS ENUM ('RULE_BASED', 'ML_MODEL', 'USER_MANUAL', 'FALLBACK_DEFAULT');

-- CreateEnum
CREATE TYPE "budget_period_type" AS ENUM ('MONTHLY', 'WEEKLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "budget_status" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "goal_status" AS ENUM ('IN_PROGRESS', 'ACHIEVED', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "contribution_type" AS ENUM ('ALLOCATION', 'TRANSACTION_LINKED', 'INTEREST', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "commitment_frequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "commitment_status" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "forecast_type" AS ENUM ('TOTAL_EXPENDITURE', 'CATEGORY_EXPENDITURE', 'BUDGET_DEVIATION_RISK');

-- CreateEnum
CREATE TYPE "advisory_outcome" AS ENUM ('BUY', 'CONSIDER_WAITING', 'AVOID_FOR_NOW');

-- CreateEnum
CREATE TYPE "feedback_target" AS ENUM ('CATEGORIZATION', 'ADVISORY', 'FORECAST');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('BUDGET_WARNING', 'BUDGET_BREACH', 'FORECAST_ALERT', 'PARSING_FAILURE', 'RECURRING_DUE', 'ADVISORY_FOLLOWUP', 'DUPLICATE_REVIEW_NEEDED', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'END_USER',
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "profile_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "base_currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "monthly_stated_income" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "savings_target_percentage" DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    "risk_tolerance" VARCHAR(50) NOT NULL DEFAULT 'MODERATE',
    "notification_preferences" JSONB NOT NULL DEFAULT '{"budget_threshold_pct": 80, "forecast_warnings": true, "email_alerts": false, "in_app_alerts": true}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "consents" (
    "consent_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "purpose" VARCHAR(100) NOT NULL,
    "scope" VARCHAR(255) NOT NULL,
    "status" "consent_status" NOT NULL DEFAULT 'GRANTED',
    "consent_version" VARCHAR(20) NOT NULL DEFAULT '1.0',
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "withdrawn_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("consent_id")
);

-- CreateTable
CREATE TABLE "financial_accounts" (
    "account_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "account_name" VARCHAR(100) NOT NULL,
    "account_type" "account_type" NOT NULL,
    "institution_name" VARCHAR(100) NOT NULL,
    "account_mask" VARCHAR(10),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "cached_balance" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "last_reconciled_at" TIMESTAMPTZ(6),
    "status" "account_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "account_balance_snapshots" (
    "snapshot_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "balance_amount" DECIMAL(14,2) NOT NULL,
    "as_of_timestamp" TIMESTAMPTZ(6) NOT NULL,
    "snapshot_source" "snapshot_source" NOT NULL DEFAULT 'STATEMENT_IMPORT',
    "statement_reference" VARCHAR(100),
    "is_reconciled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_balance_snapshots_pkey" PRIMARY KEY ("snapshot_id")
);

-- CreateTable
CREATE TABLE "data_sources" (
    "source_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "account_id" UUID,
    "source_type" "source_type" NOT NULL,
    "provider_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("source_id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "batch_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "batch_reference" VARCHAR(100),
    "file_hash" VARCHAR(64),
    "status" "batch_status" NOT NULL DEFAULT 'PENDING',
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "parsed_records" INTEGER NOT NULL DEFAULT 0,
    "duplicate_records" INTEGER NOT NULL DEFAULT 0,
    "failed_records" INTEGER NOT NULL DEFAULT 0,
    "error_summary" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("batch_id")
);

-- CreateTable
CREATE TABLE "raw_messages" (
    "message_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "external_message_id" VARCHAR(100),
    "content_hash" VARCHAR(64) NOT NULL,
    "sanitized_preview" TEXT,
    "processing_status" "raw_message_status" NOT NULL DEFAULT 'PENDING',
    "duplicate_of_id" UUID,
    "parser_version" VARCHAR(50) NOT NULL DEFAULT 'v1.0',
    "rejection_reason" TEXT,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "parent_id" UUID,
    "name" VARCHAR(50) NOT NULL,
    "category_type" "category_type" NOT NULL DEFAULT 'EXPENSE',
    "icon" VARCHAR(50),
    "color_hex" VARCHAR(7),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "transaction_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "batch_id" UUID,
    "raw_message_id" UUID,
    "category_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "type" "transaction_type" NOT NULL,
    "status" "transaction_status" NOT NULL DEFAULT 'POSTED',
    "duplicate_status" "duplicate_status" NOT NULL DEFAULT 'NOT_DUPLICATE',
    "possible_duplicate_of_id" UUID,
    "merchant_name" VARCHAR(150) NOT NULL,
    "clean_merchant_name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "transaction_at" TIMESTAMPTZ(6) NOT NULL,
    "posting_date" DATE NOT NULL,
    "reference_hash" VARCHAR(64) NOT NULL,
    "external_reference" VARCHAR(100),
    "original_transaction_id" UUID,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "is_user_verified" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "transfer_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "source_account_id" UUID NOT NULL,
    "destination_account_id" UUID NOT NULL,
    "source_transaction_id" UUID NOT NULL,
    "destination_transaction_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "transfer_status" NOT NULL DEFAULT 'SETTLED',
    "transfer_date" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("transfer_id")
);

-- CreateTable
CREATE TABLE "categorization_logs" (
    "log_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "method" "categorization_method" NOT NULL,
    "confidence_score" DECIMAL(5,4),
    "model_version" VARCHAR(50) NOT NULL DEFAULT 'rule_engine_v1.0',
    "user_overridden" BOOLEAN NOT NULL DEFAULT false,
    "previous_category_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorization_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "budget_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "period_type" "budget_period_type" NOT NULL DEFAULT 'MONTHLY',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "limit_amount" DECIMAL(14,2) NOT NULL,
    "warning_threshold_pct" INTEGER NOT NULL DEFAULT 80,
    "status" "budget_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("budget_id")
);

-- CreateTable
CREATE TABLE "financial_goals" (
    "goal_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "account_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "target_amount" DECIMAL(14,2) NOT NULL,
    "cached_current_amount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "target_date" DATE NOT NULL,
    "monthly_target_contribution" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" "goal_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_goals_pkey" PRIMARY KEY ("goal_id")
);

-- CreateTable
CREATE TABLE "goal_contributions" (
    "contribution_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goal_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "account_id" UUID,
    "transaction_id" UUID,
    "amount" DECIMAL(14,2) NOT NULL,
    "contribution_type" "contribution_type" NOT NULL DEFAULT 'ALLOCATION',
    "contribution_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_contributions_pkey" PRIMARY KEY ("contribution_id")
);

-- CreateTable
CREATE TABLE "recurring_commitments" (
    "commitment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "account_id" UUID,
    "merchant_name" VARCHAR(150) NOT NULL,
    "expected_amount" DECIMAL(14,2) NOT NULL,
    "frequency" "commitment_frequency" NOT NULL DEFAULT 'MONTHLY',
    "next_expected_date" DATE NOT NULL,
    "detection_confidence" DECIMAL(5,4),
    "is_user_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "status" "commitment_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_commitments_pkey" PRIMARY KEY ("commitment_id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "prediction_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category_id" UUID,
    "forecast_type" "forecast_type" NOT NULL,
    "target_period_start" DATE NOT NULL,
    "target_period_end" DATE NOT NULL,
    "predicted_amount" DECIMAL(14,2) NOT NULL,
    "confidence_score" DECIMAL(5,4),
    "risk_probability" DECIMAL(5,4),
    "model_version" VARCHAR(50) NOT NULL,
    "input_window_start" DATE NOT NULL,
    "input_window_end" DATE NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("prediction_id")
);

-- CreateTable
CREATE TABLE "advisory_requests" (
    "request_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category_id" UUID,
    "purchase_amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "item_description" VARCHAR(255) NOT NULL,
    "user_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisory_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "advisory_decisions" (
    "request_id" UUID NOT NULL,
    "decision_outcome" "advisory_outcome" NOT NULL,
    "affordability_score" DECIMAL(5,2) NOT NULL,
    "deterministic_factors" JSONB NOT NULL,
    "budget_impact_summary" JSONB NOT NULL,
    "goal_impact_summary" JSONB NOT NULL,
    "llm_explanation" TEXT NOT NULL,
    "disclaimer" TEXT NOT NULL,
    "rule_engine_version" VARCHAR(50) NOT NULL,
    "llm_model_version" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisory_decisions_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "feedback_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "target_type" "feedback_target" NOT NULL,
    "target_id" UUID NOT NULL,
    "rating" INTEGER,
    "feedback_text" TEXT,
    "correction_data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "notification_type" "notification_type" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "event_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "actor_role" VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(100) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_consents_user_status" ON "consents"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_consents_user_purpose" ON "consents"("user_id", "purpose", "status");

-- CreateIndex
CREATE INDEX "idx_financial_accounts_user" ON "financial_accounts"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "financial_accounts_user_id_account_id_key" ON "financial_accounts"("user_id", "account_id");

-- CreateIndex
CREATE INDEX "idx_balance_snapshots_account" ON "account_balance_snapshots"("account_id", "as_of_timestamp");

-- CreateIndex
CREATE INDEX "idx_data_sources_user" ON "data_sources"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "data_sources_user_id_source_id_key" ON "data_sources"("user_id", "source_id");

-- CreateIndex
CREATE INDEX "idx_import_batches_user" ON "import_batches"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "import_batches_user_id_batch_id_key" ON "import_batches"("user_id", "batch_id");

-- CreateIndex
CREATE INDEX "idx_raw_messages_content_hash" ON "raw_messages"("user_id", "content_hash");

-- CreateIndex
CREATE INDEX "idx_raw_messages_status" ON "raw_messages"("processing_status");

-- CreateIndex
CREATE INDEX "idx_raw_messages_user_received" ON "raw_messages"("user_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "raw_messages_source_id_external_message_id_key" ON "raw_messages"("source_id", "external_message_id");

-- CreateIndex
CREATE INDEX "idx_categories_parent" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "idx_transactions_user_date" ON "transactions"("user_id", "transaction_at");

-- CreateIndex
CREATE INDEX "idx_transactions_user_cat_date" ON "transactions"("user_id", "category_id", "transaction_at");

-- CreateIndex
CREATE INDEX "idx_transactions_account_date" ON "transactions"("account_id", "transaction_at");

-- CreateIndex
CREATE INDEX "idx_transactions_clean_merchant" ON "transactions"("clean_merchant_name");

-- CreateIndex
CREATE INDEX "idx_transactions_reference_hash" ON "transactions"("account_id", "reference_hash");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_source_transaction_id_key" ON "transfers"("source_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_destination_transaction_id_key" ON "transfers"("destination_transaction_id");

-- CreateIndex
CREATE INDEX "idx_transfers_user_date" ON "transfers"("user_id", "transfer_date");

-- CreateIndex
CREATE INDEX "idx_cat_logs_transaction" ON "categorization_logs"("transaction_id");

-- CreateIndex
CREATE INDEX "idx_budgets_user_period" ON "budgets"("user_id", "period_start", "period_end", "status");

-- CreateIndex
CREATE INDEX "idx_financial_goals_user_status" ON "financial_goals"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "financial_goals_user_id_goal_id_key" ON "financial_goals"("user_id", "goal_id");

-- CreateIndex
CREATE INDEX "idx_contributions_goal" ON "goal_contributions"("goal_id", "contribution_date");

-- CreateIndex
CREATE INDEX "idx_contributions_user" ON "goal_contributions"("user_id");

-- CreateIndex
CREATE INDEX "idx_commitments_user_due" ON "recurring_commitments"("user_id", "next_expected_date", "status");

-- CreateIndex
CREATE INDEX "idx_predictions_user_period" ON "predictions"("user_id", "target_period_start", "target_period_end");

-- CreateIndex
CREATE INDEX "idx_predictions_model" ON "predictions"("model_version");

-- CreateIndex
CREATE INDEX "idx_advisory_requests_user" ON "advisory_requests"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_advisory_decisions_outcome" ON "advisory_decisions"("decision_outcome");

-- CreateIndex
CREATE INDEX "idx_feedbacks_target" ON "feedbacks"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "idx_feedbacks_user" ON "feedbacks"("user_id");

-- CreateIndex
CREATE INDEX "idx_notifications_user_unread" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_events_actor" ON "audit_events"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_events_entity" ON "audit_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_events_action_date" ON "audit_events"("action", "created_at");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_balance_snapshots" ADD CONSTRAINT "account_balance_snapshots_user_id_account_id_fkey" FOREIGN KEY ("user_id", "account_id") REFERENCES "financial_accounts"("user_id", "account_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_user_id_account_id_fkey" FOREIGN KEY ("user_id", "account_id") REFERENCES "financial_accounts"("user_id", "account_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_user_id_source_id_fkey" FOREIGN KEY ("user_id", "source_id") REFERENCES "data_sources"("user_id", "source_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_messages" ADD CONSTRAINT "raw_messages_user_id_batch_id_fkey" FOREIGN KEY ("user_id", "batch_id") REFERENCES "import_batches"("user_id", "batch_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_messages" ADD CONSTRAINT "raw_messages_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "data_sources"("source_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_messages" ADD CONSTRAINT "raw_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_messages" ADD CONSTRAINT "raw_messages_duplicate_of_id_fkey" FOREIGN KEY ("duplicate_of_id") REFERENCES "raw_messages"("message_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_account_id_fkey" FOREIGN KEY ("user_id", "account_id") REFERENCES "financial_accounts"("user_id", "account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("batch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_raw_message_id_fkey" FOREIGN KEY ("raw_message_id") REFERENCES "raw_messages"("message_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_original_transaction_id_fkey" FOREIGN KEY ("original_transaction_id") REFERENCES "transactions"("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_possible_duplicate_of_id_fkey" FOREIGN KEY ("possible_duplicate_of_id") REFERENCES "transactions"("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_user_id_source_account_id_fkey" FOREIGN KEY ("user_id", "source_account_id") REFERENCES "financial_accounts"("user_id", "account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_user_id_destination_account_id_fkey" FOREIGN KEY ("user_id", "destination_account_id") REFERENCES "financial_accounts"("user_id", "account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_source_transaction_id_fkey" FOREIGN KEY ("source_transaction_id") REFERENCES "transactions"("transaction_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_destination_transaction_id_fkey" FOREIGN KEY ("destination_transaction_id") REFERENCES "transactions"("transaction_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorization_logs" ADD CONSTRAINT "categorization_logs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("transaction_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorization_logs" ADD CONSTRAINT "categorization_logs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorization_logs" ADD CONSTRAINT "categorization_logs_previous_category_id_fkey" FOREIGN KEY ("previous_category_id") REFERENCES "categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_user_id_account_id_fkey" FOREIGN KEY ("user_id", "account_id") REFERENCES "financial_accounts"("user_id", "account_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_user_id_goal_id_fkey" FOREIGN KEY ("user_id", "goal_id") REFERENCES "financial_goals"("user_id", "goal_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_user_id_account_id_fkey" FOREIGN KEY ("user_id", "account_id") REFERENCES "financial_accounts"("user_id", "account_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_commitments" ADD CONSTRAINT "recurring_commitments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_commitments" ADD CONSTRAINT "recurring_commitments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_commitments" ADD CONSTRAINT "recurring_commitments_user_id_account_id_fkey" FOREIGN KEY ("user_id", "account_id") REFERENCES "financial_accounts"("user_id", "account_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisory_requests" ADD CONSTRAINT "advisory_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisory_requests" ADD CONSTRAINT "advisory_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisory_decisions" ADD CONSTRAINT "advisory_decisions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "advisory_requests"("request_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
