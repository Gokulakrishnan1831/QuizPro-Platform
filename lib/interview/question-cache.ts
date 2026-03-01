/**
 * lib/interview/question-cache.ts
 *
 * Cache-first lookup and storage for company-specific interview questions.
 * Questions are keyed by normalizedCompany + normalizedRole + skill.
 */

import { getCachedInterviewQuestions as firestoreGetCached, createManyInterviewQuestions, incrementInterviewQuestionServed } from '@/lib/firebase/db';
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

    try {
        // Query Firestore for each skill
        const allDocs: any[] = [];
        for (const skill of skills) {
            const docs = await firestoreGetCached({
                normalizedCompany,
                normalizedRole,
                skill: skill.toUpperCase(),
                isActive: true,
            });
            allDocs.push(...docs);
        }

        // Filter by age
        const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
        const freshDocs = allDocs.filter((d) => {
            const updated = d.updatedAt?.toDate?.()?.getTime?.() ?? 0;
            return updated >= cutoff;
        });

        const questions: CachedQuestion[] = freshDocs.map((d) => ({
            id: d.id,
            skill: String(d.skill),
            questionType: String(d.questionType),
            questionData: d.questionData,
            sourceContext: String(d.sourceContext ?? 'ai_generated'),
            difficulty: Number(d.difficulty ?? 5),
        }));

        if (questions.length >= questionCount) {
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
 * Store generated interview questions into the Firestore cache.
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

    const jdHash = jdText
        ? crypto.createHash('sha256').update(jdText.trim().toLowerCase()).digest('hex').slice(0, 16)
        : null;

    try {
        const docs = questions.map((q) => ({
            normalizedCompany,
            companyDisplay: company,
            normalizedRole: role.normalized,
            roleDisplay: role.display,
            skill: String(q.skill ?? 'SQL').toUpperCase(),
            questionType: String(q.type ?? 'MCQ').toUpperCase(),
            questionData: typeof q === 'string' ? JSON.parse(q) : q,
            sourceContext: String(q.source_context ?? q.sourceContext ?? 'ai_generated'),
            difficulty: typeof q.difficulty === 'number' ? q.difficulty : 5,
            isActive: true,
            jdHash,
        }));

        return await createManyInterviewQuestions(docs);
    } catch (err) {
        console.error('[question-cache] batch insert failed:', err);
        return 0;
    }
}

/**
 * Increment the `timesServed` counter for cached question IDs.
 */
export async function incrementServedCount(questionIds: string[]): Promise<void> {
    if (questionIds.length === 0) return;

    try {
        await Promise.all(
            questionIds.map((id) => incrementInterviewQuestionServed(id))
        );
    } catch {
        // Non-blocking
    }
}
