/**
 * lib/interview/question-cache.ts
 *
 * Cache-first lookup and storage for company-specific interview questions.
 * Questions are keyed by normalized_company + normalized_role + skill.
 */

import prisma from '@/lib/prisma';
import { ensureTables } from '@/lib/db-init';
import { normalizeCompanyName } from './retrieval';
import { extractRole, normalizeRole } from './role-utils';
import crypto from 'crypto';

type Skill = 'SQL' | 'EXCEL' | 'POWERBI';

export interface CachedQuestion {
    id: string;
    skill: string;
    questionType: string;
    questionData: any;
    sourceContext: string;
    difficulty: number;
}

export interface CacheLookupResult {
    questions: CachedQuestion[];
    cacheHit: boolean;
    partialHit: boolean;
    cached: number;
    company: string;
    role: string;
}

/**
 * Look up cached interview questions for a given company + role + skills.
 *
 * - FULL HIT: ≥ questionCount questions exist and are fresh → return cached
 * - PARTIAL HIT: some questions exist but < questionCount → return partial
 * - MISS: no questions found or all stale → return empty
 */
export async function getCachedInterviewQuestions(params: {
    company: string;
    jdText?: string;
    skills: Skill[];
    questionCount: number;
    maxAgeDays?: number;
}): Promise<CacheLookupResult> {
    const { company, jdText, skills, questionCount, maxAgeDays = 30 } = params;
    const normalizedCompany = normalizeCompanyName(company);
    const { normalized: normalizedRole, display: roleDisplay } = extractRole(jdText);

    if (!normalizedCompany) {
        return { questions: [], cacheHit: false, partialHit: false, cached: 0, company: normalizedCompany, role: normalizedRole };
    }

    await ensureTables();
    const db = prisma as any;

    const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
    const skillList = skills.map((s) => s.toUpperCase());

    try {
        const rows = await db.$queryRawUnsafe(
            `SELECT id, skill, question_type, question_data, source_context, difficulty
         FROM "InterviewQuestionBank"
        WHERE normalized_company = $1
          AND normalized_role = $2
          AND skill = ANY($3::text[])
          AND is_active = TRUE
          AND updated_at >= $4::timestamptz
        ORDER BY difficulty ASC, created_at DESC
        LIMIT $5`,
            normalizedCompany,
            normalizedRole,
            skillList,
            cutoffDate,
            questionCount * 2, // fetch extra for random selection
        );

        const questions: CachedQuestion[] = (Array.isArray(rows) ? rows : []).map((r: any) => ({
            id: String(r.id),
            skill: String(r.skill),
            questionType: String(r.question_type),
            questionData: typeof r.question_data === 'string' ? JSON.parse(r.question_data) : r.question_data,
            sourceContext: String(r.source_context ?? 'ai_generated'),
            difficulty: Number(r.difficulty ?? 5),
        }));

        if (questions.length >= questionCount) {
            // Full hit — shuffle and take requested count
            const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, questionCount);
            return {
                questions: shuffled,
                cacheHit: true,
                partialHit: false,
                cached: questions.length,
                company: normalizedCompany,
                role: normalizedRole,
            };
        }

        if (questions.length > 0) {
            return {
                questions,
                cacheHit: false,
                partialHit: true,
                cached: questions.length,
                company: normalizedCompany,
                role: normalizedRole,
            };
        }

        return {
            questions: [],
            cacheHit: false,
            partialHit: false,
            cached: 0,
            company: normalizedCompany,
            role: normalizedRole,
        };
    } catch (err) {
        console.error('[question-cache] lookup failed:', err);
        return {
            questions: [],
            cacheHit: false,
            partialHit: false,
            cached: 0,
            company: normalizedCompany,
            role: normalizedRole,
        };
    }
}

/**
 * Store generated interview questions into the cache.
 * Silently skips duplicates (same company+role+skill with same question content hash).
 */
export async function cacheInterviewQuestions(params: {
    company: string;
    role: { normalized: string; display: string };
    questions: any[];
    jdText?: string;
}): Promise<number> {
    const { company, role, questions, jdText } = params;
    const normalizedCompany = normalizeCompanyName(company);
    if (!normalizedCompany || questions.length === 0) return 0;

    await ensureTables();
    const db = prisma as any;

    const jdHash = jdText
        ? crypto.createHash('sha256').update(jdText.trim().toLowerCase()).digest('hex').slice(0, 16)
        : null;

    let stored = 0;

    for (const q of questions) {
        try {
            const skill = String(q.skill ?? 'SQL').toUpperCase();
            const questionType = String(q.type ?? 'MCQ').toUpperCase();
            const questionData = typeof q === 'string' ? JSON.parse(q) : q;
            const sourceContext = String(q.source_context ?? q.sourceContext ?? 'ai_generated');
            const difficulty = typeof q.difficulty === 'number' ? q.difficulty : 5;

            // Check for existing duplicate (same company+role+skill+content hash)
            const contentHash = crypto
                .createHash('md5')
                .update(JSON.stringify(questionData))
                .digest('hex');

            const existing = await db.$queryRawUnsafe(
                `SELECT id FROM "InterviewQuestionBank"
          WHERE normalized_company = $1
            AND normalized_role = $2
            AND skill = $3
            AND md5(question_data::text) = $4
          LIMIT 1`,
                normalizedCompany,
                role.normalized,
                skill,
                contentHash,
            );

            if (Array.isArray(existing) && existing.length > 0) {
                // Update timestamp on existing entry to refresh staleness
                await db.$executeRawUnsafe(
                    `UPDATE "InterviewQuestionBank" SET updated_at = NOW() WHERE id = $1`,
                    existing[0].id,
                );
                continue;
            }

            await db.$executeRawUnsafe(
                `INSERT INTO "InterviewQuestionBank"
          (normalized_company, company_display, normalized_role, role_display,
           skill, question_type, question_data, source_context, difficulty, jd_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
                normalizedCompany,
                company,
                role.normalized,
                role.display,
                skill,
                questionType,
                JSON.stringify(questionData),
                sourceContext,
                difficulty,
                jdHash,
            );
            stored++;
        } catch (err) {
            // Skip individual failures (e.g., unique constraint violations)
            console.error('[question-cache] insert failed for question:', err);
        }
    }

    return stored;
}

/**
 * Increment the `times_served` counter for a set of cached question IDs.
 * Non-blocking — failures are silently ignored.
 */
export async function incrementServedCount(questionIds: string[]): Promise<void> {
    if (questionIds.length === 0) return;

    const db = prisma as any;
    try {
        await db.$executeRawUnsafe(
            `UPDATE "InterviewQuestionBank"
         SET times_served = times_served + 1
       WHERE id = ANY($1::uuid[])`,
            questionIds,
        );
    } catch {
        // Non-blocking
    }
}
