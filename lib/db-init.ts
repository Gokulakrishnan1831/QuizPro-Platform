/**
 * lib/db-init.ts
 *
 * Bootstraps custom tables using raw SQL (CREATE TABLE IF NOT EXISTS).
 * These tables are not in prisma/schema.prisma — they're managed manually
 * so we don't need another migration cycle.
 *
 * Call `ensureTables()` at the top of any API route that uses them.
 */

import prisma from '@/lib/prisma';

let initialized = false;

export async function ensureTables() {
  if (initialized) return;

  const db = prisma as any;

  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AppSetting" (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PaymentRequest" (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           TEXT NOT NULL,
        user_email        TEXT NOT NULL,
        user_name         TEXT,
        tier              TEXT NOT NULL,
        amount            INTEGER NOT NULL,
        upi_transaction_id TEXT,
        screenshot_base64  TEXT,
        status            TEXT NOT NULL DEFAULT 'pending',
        admin_notes       TEXT,
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at       TIMESTAMPTZ
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AppEvent" (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    TEXT,
        event      TEXT NOT NULL,
        props      JSONB,
        path       TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AppError" (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       TEXT,
        error_message TEXT NOT NULL,
        error_stack   TEXT,
        component     TEXT,
        path          TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CompanyInterviewPattern" (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company            TEXT NOT NULL,
        normalized_company TEXT NOT NULL,
        role               TEXT NOT NULL DEFAULT 'Data Analyst',
        skill              TEXT,
        pattern_type       TEXT NOT NULL DEFAULT 'QUESTION',
        question_text      TEXT NOT NULL,
        difficulty         INTEGER,
        tags               JSONB NOT NULL DEFAULT '[]'::jsonb,
        source             TEXT NOT NULL,
        source_url         TEXT,
        evidence_note      TEXT,
        is_verified        BOOLEAN NOT NULL DEFAULT FALSE,
        is_active          BOOLEAN NOT NULL DEFAULT TRUE,
        last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (normalized_company, question_text, source)
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_company_interview_pattern_lookup"
      ON "CompanyInterviewPattern"(normalized_company, is_active, is_verified, last_seen_at DESC);
    `);

    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_company_interview_pattern_skill"
      ON "CompanyInterviewPattern"(skill);
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "QuizGenerationTrace" (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id            TEXT,
        quiz_id            TEXT,
        quiz_goal          TEXT NOT NULL,
        company            TEXT,
        skills             JSONB NOT NULL DEFAULT '[]'::jsonb,
        model              TEXT,
        used_pattern_count INTEGER NOT NULL DEFAULT 0,
        used_pattern_ids   JSONB NOT NULL DEFAULT '[]'::jsonb,
        used_fallback      BOOLEAN NOT NULL DEFAULT FALSE,
        trace              JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_quiz_generation_trace_user_created"
      ON "QuizGenerationTrace"(user_id, created_at DESC);
    `);

    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_quiz_generation_trace_company_created"
      ON "QuizGenerationTrace"(company, created_at DESC);
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InterviewQuestionBank" (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        normalized_company TEXT NOT NULL,
        company_display    TEXT NOT NULL,
        normalized_role    TEXT NOT NULL DEFAULT 'data analyst',
        role_display       TEXT NOT NULL DEFAULT 'Data Analyst',
        skill              TEXT NOT NULL,
        question_type      TEXT NOT NULL DEFAULT 'MCQ',
        question_data      JSONB NOT NULL,
        source_context     TEXT DEFAULT 'ai_generated',
        difficulty         INTEGER DEFAULT 5,
        times_served       INTEGER DEFAULT 0,
        is_active          BOOLEAN DEFAULT TRUE,
        jd_hash            TEXT,
        created_at         TIMESTAMPTZ DEFAULT NOW(),
        updated_at         TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_iqb_lookup"
      ON "InterviewQuestionBank"(normalized_company, normalized_role, skill, is_active);
    `);

    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_iqb_staleness"
      ON "InterviewQuestionBank"(normalized_company, normalized_role, updated_at DESC);
    `);

    initialized = true;
  } catch (err) {
    // Non-blocking — if table creation fails, we continue anyway
    console.error('[db-init] table bootstrap failed:', err);
  }
}
