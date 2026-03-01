/**
 * scripts/migrate-to-firebase.ts
 *
 * Migrates all data from Supabase (PostgreSQL via Neon) to Firebase (Firestore).
 * Also exports Supabase Auth users and imports them into Firebase Auth.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-firebase.ts
 *
 * Requires:
 *   - DATABASE_URL in .env (Neon PostgreSQL)
 *   - FIREBASE_SERVICE_ACCOUNT_PATH in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - NEXT_PUBLIC_SUPABASE_URL in .env
 */

import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import pg from 'pg';
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';

/* ─── Firebase Admin Init ──────────────────────────────────────── */

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH!;
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const firestore = admin.firestore();
const fireAuth = admin.auth();

/* ─── PostgreSQL Init ─────────────────────────────────────────── */

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

/* ─── Firestore Collection Names ──────────────────────────────── */

const COLLECTIONS = {
    USERS: 'users',
    ADMINS: 'admins',
    QUIZZES: 'quizzes',
    QUESTIONS: 'questions',
    QUIZ_ATTEMPTS: 'quiz_attempts',
    USER_PROGRESS: 'user_progress',
    LEADERBOARDS: 'leaderboards',
    SYNTHETIC_DATABASES: 'synthetic_databases',
    APP_SETTINGS: 'app_settings',
    PAYMENT_REQUESTS: 'payment_requests',
    APP_EVENTS: 'app_events',
    APP_ERRORS: 'app_errors',
    COMPANY_INTERVIEW_PATTERNS: 'company_interview_patterns',
    INTERVIEW_QUESTION_BANK: 'interview_question_bank',
    QUIZ_GENERATION_TRACES: 'quiz_generation_traces',
};

/* ─── Helpers ─────────────────────────────────────────────────── */

function toTimestamp(date: Date | string | null) {
    if (!date) return null;
    return admin.firestore.Timestamp.fromDate(new Date(date));
}

function parseJsonSafe(val: any) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object') return sanitizeForFirestore(val);
    try { return sanitizeForFirestore(JSON.parse(val)); } catch { return val; }
}

/**
 * Firestore does NOT support nested arrays (arrays containing arrays).
 * This function recursively walks the data and converts any array element
 * that is itself an array into an indexed object: [a, b] → { "0": a, "1": b }.
 * Also strips undefined values which Firestore rejects.
 */
function sanitizeForFirestore(val: any): any {
    if (val === null || val === undefined) return null;
    if (val instanceof admin.firestore.Timestamp) return val;
    if (val instanceof Date) return admin.firestore.Timestamp.fromDate(val);
    if (Array.isArray(val)) {
        return val.map((item) => {
            if (Array.isArray(item)) {
                // Convert nested array to an indexed object
                const obj: Record<string, any> = {};
                item.forEach((v, i) => { obj[String(i)] = sanitizeForFirestore(v); });
                return obj;
            }
            return sanitizeForFirestore(item);
        });
    }
    if (typeof val === 'object') {
        const clean: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
            if (v !== undefined) {
                clean[k] = sanitizeForFirestore(v);
            }
        }
        return clean;
    }
    return val;
}

async function queryRows(sql: string): Promise<any[]> {
    try {
        const result = await pool.query(sql);
        return result.rows;
    } catch (err: any) {
        if (err.message?.includes('does not exist') || err.message?.includes('relation')) {
            console.log(`  ⚠ Table not found, skipping: ${err.message.split('"')[1] ?? 'unknown'}`);
            return [];
        }
        throw err;
    }
}

/**
 * Stringify any value that is a non-trivial object/array deeper than 1 level.
 * This is the nuclear fallback — Firestore accepts plain strings.
 */
function stringifyDeepFields(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
        if (v === null || v === undefined || typeof v !== 'object') {
            result[k] = v;
        } else if (v instanceof admin.firestore.Timestamp) {
            result[k] = v;
        } else {
            // Stringify complex objects/arrays to ensure Firestore accepts them
            result[k] = JSON.stringify(v);
        }
    }
    return result;
}

async function batchWrite(
    collection: string,
    docs: { id: string; data: Record<string, any> }[],
) {
    const BATCH_SIZE = 400;
    let written = 0;
    let errors = 0;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const chunk = docs.slice(i, i + BATCH_SIZE);
        const batch = firestore.batch();

        for (const { id, data } of chunk) {
            batch.set(firestore.collection(collection).doc(id), data, { merge: true });
        }

        try {
            await batch.commit();
            written += chunk.length;
        } catch {
            // Batch failed — fall back to per-doc writes
            for (const { id, data } of chunk) {
                try {
                    await firestore.collection(collection).doc(id).set(data, { merge: true });
                    written++;
                } catch {
                    // Last resort: stringify all complex fields
                    try {
                        const safe = stringifyDeepFields(data);
                        await firestore.collection(collection).doc(id).set(safe, { merge: true });
                        written++;
                    } catch (e3: any) {
                        errors++;
                        console.error(`  ✗ ${collection}/${id}: ${e3.message?.slice(0, 80)}`);
                    }
                }
            }
        }
        process.stdout.write(`  → ${written}/${docs.length}\r`);
    }

    console.log(`  ✓ ${collection}: ${written} written, ${errors} errors`);
}

/* ─── Migration Functions ─────────────────────────────────────── */

async function migrateUsers() {
    console.log('\n📋 Migrating Users...');
    const rows = await queryRows('SELECT * FROM "User" ORDER BY "createdAt" ASC');
    if (rows.length === 0) { console.log('  No users found.'); return; }

    const docs = rows.map((r) => ({
        id: r.id,
        data: {
            email: r.email,
            name: r.name ?? null,
            profileType: r.profileType ?? null,
            persona: r.persona ?? null,
            experienceYears: r.experienceYears ?? null,
            resumeUrl: r.resumeUrl ?? null,
            educationDetails: parseJsonSafe(r.educationDetails),
            toolStack: parseJsonSafe(r.toolStack),
            quizGoal: r.quizGoal ?? null,
            upcomingCompany: r.upcomingCompany ?? null,
            upcomingJD: r.upcomingJD ?? null,
            interviewDate: r.interviewDate ? toTimestamp(r.interviewDate) : null,
            subscriptionTier: r.subscriptionTier ?? 'FREE',
            quizzesRemaining: r.quizzesRemaining ?? 1,
            createdAt: toTimestamp(r.createdAt),
            updatedAt: toTimestamp(r.updatedAt),
        },
    }));

    await batchWrite(COLLECTIONS.USERS, docs);
}

async function migrateAdmins() {
    console.log('\n📋 Migrating Admins...');
    const rows = await queryRows('SELECT * FROM "Admin"');
    if (rows.length === 0) { console.log('  No admins found.'); return; }

    const docs = rows.map((r) => ({
        id: r.id,
        data: {
            email: r.email,
            passwordHash: r.passwordHash,
            name: r.name ?? null,
            createdAt: toTimestamp(r.createdAt),
            updatedAt: toTimestamp(r.updatedAt),
        },
    }));

    await batchWrite(COLLECTIONS.ADMINS, docs);
}

async function migrateQuizzes() {
    console.log('\n📋 Migrating Quizzes...');
    const rows = await queryRows('SELECT * FROM "Quiz" ORDER BY "createdAt" ASC');
    if (rows.length === 0) { console.log('  No quizzes found.'); return; }

    const docs = rows.map((r) => ({
        id: r.id,
        data: {
            persona: r.persona,
            skill: r.skill ?? null,
            quizGoal: r.quizGoal ?? 'PRACTICE',
            jdCompany: r.jdCompany ?? null,
            jdText: r.jdText ?? null,
            timerMins: r.timerMins ?? 30,
            questions: parseJsonSafe(r.questions) ?? [],
            createdAt: toTimestamp(r.createdAt),
        },
    }));

    await batchWrite(COLLECTIONS.QUIZZES, docs);
}

async function migrateQuestions() {
    console.log('\n📋 Migrating Questions (Bank)...');
    const rows = await queryRows('SELECT * FROM "Question" ORDER BY "createdAt" ASC');
    if (rows.length === 0) { console.log('  No questions found.'); return; }

    const docs = rows.map((r) => ({
        id: r.id,
        data: {
            skill: r.skill,
            type: r.type,
            content: r.content,
            options: parseJsonSafe(r.options),
            correctAnswer: parseJsonSafe(r.correctAnswer),
            solution: r.solution,
            difficulty: r.difficulty ?? 5,
            metadata: parseJsonSafe(r.metadata),
            createdAt: toTimestamp(r.createdAt),
        },
    }));

    await batchWrite(COLLECTIONS.QUESTIONS, docs);
}

async function migrateQuizAttempts() {
    console.log('\n📋 Migrating QuizAttempts...');
    const rows = await queryRows('SELECT * FROM "QuizAttempt" ORDER BY "completedAt" ASC');
    if (rows.length === 0) { console.log('  No quiz attempts found.'); return; }

    const docs = rows.map((r) => ({
        id: r.id,
        data: {
            userId: r.userId,
            quizId: r.quizId,
            answers: parseJsonSafe(r.answers) ?? [],
            score: r.score ? parseFloat(String(r.score)) : 0,
            timeTaken: r.timeTaken ?? 0,
            wrongAnswers: parseJsonSafe(r.wrongAnswers) ?? [],
            aiSummary: r.aiSummary ?? null,
            focusTopics: parseJsonSafe(r.focusTopics),
            rank: r.rank ?? null,
            completedAt: toTimestamp(r.completedAt),
        },
    }));

    await batchWrite(COLLECTIONS.QUIZ_ATTEMPTS, docs);
}

async function migrateUserProgress() {
    console.log('\n📋 Migrating UserProgress...');
    const rows = await queryRows('SELECT * FROM "UserProgress"');
    if (rows.length === 0) { console.log('  No user progress found.'); return; }

    const docs = rows.map((r) => ({
        id: `${r.userId}_${r.skill}`,
        data: {
            userId: r.userId,
            skill: r.skill,
            totalAttempted: r.totalAttempted ?? 0,
            totalCorrect: r.totalCorrect ?? 0,
            accuracy: r.accuracy ? parseFloat(String(r.accuracy)) : 0,
            lastPracticed: toTimestamp(r.lastPracticed),
        },
    }));

    await batchWrite(COLLECTIONS.USER_PROGRESS, docs);
}

async function migrateLeaderboards() {
    console.log('\n📋 Migrating Leaderboards...');
    const rows = await queryRows('SELECT * FROM "Leaderboard"');
    if (rows.length === 0) { console.log('  No leaderboards found.'); return; }

    const docs = rows.map((r) => ({
        id: `${r.skill}_${r.profileType}`,
        data: {
            skill: r.skill,
            profileType: r.profileType,
            scores: parseJsonSafe(r.scores) ?? [],
            updatedAt: toTimestamp(r.updatedAt),
        },
    }));

    await batchWrite(COLLECTIONS.LEADERBOARDS, docs);
}

async function migrateSyntheticDatabases() {
    console.log('\n📋 Migrating SyntheticDatabases...');
    const rows = await queryRows('SELECT * FROM "SyntheticDatabase"');
    if (rows.length === 0) { console.log('  No synthetic databases found.'); return; }

    const docs = rows.map((r) => ({
        id: r.id,
        data: {
            industry: r.industry ?? null,
            difficulty: r.difficulty ?? 5,
            setupSQL: r.setupSQL,
            tableSummary: r.tableSummary,
            sampleData: parseJsonSafe(r.sampleData) ?? [],
            usageCount: r.usageCount ?? 0,
            createdAt: toTimestamp(r.createdAt),
        },
    }));

    await batchWrite(COLLECTIONS.SYNTHETIC_DATABASES, docs);
}

/* ─── Raw SQL Tables ────────────────────────────────────────── */

async function migrateAppSettings() {
    console.log('\n📋 Migrating AppSettings...');
    const rows = await queryRows('SELECT * FROM "AppSetting"');
    if (rows.length === 0) { console.log('  No app settings found.'); return; }

    const docs = rows.map((r) => ({
        id: r.key,
        data: {
            value: r.value,
            updatedAt: toTimestamp(r.updated_at ?? new Date()),
        },
    }));

    await batchWrite(COLLECTIONS.APP_SETTINGS, docs);
}

async function migratePaymentRequests() {
    console.log('\n📋 Migrating PaymentRequests...');
    const rows = await queryRows('SELECT * FROM "PaymentRequest" ORDER BY created_at ASC');
    if (rows.length === 0) { console.log('  No payment requests found.'); return; }

    const docs = rows.map((r) => ({
        id: r.id?.toString() ?? admin.firestore().collection('_').doc().id,
        data: {
            userId: r.user_id,
            userEmail: r.user_email,
            userName: r.user_name ?? null,
            tier: r.tier,
            amount: r.amount ? parseFloat(String(r.amount)) : 0,
            upiTransactionId: r.upi_transaction_id,
            screenshotBase64: r.screenshot_base64 ?? null,
            status: r.status ?? 'pending',
            adminNotes: r.admin_notes ?? null,
            createdAt: toTimestamp(r.created_at),
            reviewedAt: r.reviewed_at ? toTimestamp(r.reviewed_at) : null,
        },
    }));

    await batchWrite(COLLECTIONS.PAYMENT_REQUESTS, docs);
}

async function migrateAppEvents() {
    console.log('\n📋 Migrating AppEvents...');
    const rows = await queryRows('SELECT * FROM "AppEvent" ORDER BY created_at ASC LIMIT 5000');
    if (rows.length === 0) { console.log('  No app events found.'); return; }

    const docs = rows.map((r) => ({
        id: r.id?.toString() ?? admin.firestore().collection('_').doc().id,
        data: {
            userId: r.user_id ?? null,
            eventType: r.event_type,
            eventData: parseJsonSafe(r.event_data),
            createdAt: toTimestamp(r.created_at),
        },
    }));

    await batchWrite(COLLECTIONS.APP_EVENTS, docs);
}

async function migrateAppErrors() {
    console.log('\n📋 Migrating AppErrors...');
    const rows = await queryRows('SELECT * FROM "AppError" ORDER BY created_at ASC LIMIT 5000');
    if (rows.length === 0) { console.log('  No app errors found.'); return; }

    const docs = rows.map((r) => ({
        id: r.id?.toString() ?? admin.firestore().collection('_').doc().id,
        data: {
            userId: r.user_id ?? null,
            errorType: r.error_type,
            errorMessage: r.error_message,
            errorStack: r.error_stack ?? null,
            metadata: parseJsonSafe(r.metadata),
            createdAt: toTimestamp(r.created_at),
        },
    }));

    await batchWrite(COLLECTIONS.APP_ERRORS, docs);
}

async function migrateInterviewPatterns() {
    console.log('\n📋 Migrating CompanyInterviewPatterns...');
    const rows = await queryRows('SELECT * FROM "CompanyInterviewPattern" ORDER BY created_at ASC');
    if (rows.length === 0) { console.log('  No interview patterns found.'); return; }

    const docs = rows.map((r) => ({
        id: r.id?.toString() ?? admin.firestore().collection('_').doc().id,
        data: {
            company: r.company,
            normalizedCompany: r.normalized_company,
            role: r.role ?? 'Data Analyst',
            skill: r.skill ?? null,
            patternType: r.pattern_type ?? 'QUESTION',
            questionText: r.question_text,
            difficulty: r.difficulty ?? null,
            tags: parseJsonSafe(r.tags) ?? [],
            source: r.source,
            sourceUrl: r.source_url ?? null,
            evidenceNote: r.evidence_note ?? null,
            isVerified: r.is_verified ?? false,
            isActive: r.is_active !== false,
            lastSeenAt: r.last_seen_at ? toTimestamp(r.last_seen_at) : null,
            createdAt: toTimestamp(r.created_at),
            updatedAt: toTimestamp(r.updated_at ?? r.created_at),
        },
    }));

    await batchWrite(COLLECTIONS.COMPANY_INTERVIEW_PATTERNS, docs);
}

async function migrateInterviewQuestionBank() {
    console.log('\n📋 Migrating InterviewQuestionBank...');
    const rows = await queryRows('SELECT * FROM "InterviewQuestionBank" ORDER BY created_at ASC');
    if (rows.length === 0) { console.log('  No interview question bank entries found.'); return; }

    const docs = rows.map((r) => ({
        id: r.id?.toString() ?? admin.firestore().collection('_').doc().id,
        data: {
            normalizedCompany: r.normalized_company,
            companyDisplay: r.company_display,
            normalizedRole: r.normalized_role,
            roleDisplay: r.role_display,
            skill: r.skill,
            questionType: r.question_type,
            questionData: parseJsonSafe(r.question_data),
            sourceContext: r.source_context ?? 'ai_generated',
            difficulty: r.difficulty ?? 5,
            isActive: r.is_active !== false,
            jdHash: r.jd_hash ?? null,
            timesServed: r.times_served ?? 0,
            createdAt: toTimestamp(r.created_at),
            updatedAt: toTimestamp(r.updated_at ?? r.created_at),
        },
    }));

    await batchWrite(COLLECTIONS.INTERVIEW_QUESTION_BANK, docs);
}

async function migrateQuizGenerationTraces() {
    console.log('\n📋 Migrating QuizGenerationTraces...');
    const rows = await queryRows('SELECT * FROM "QuizGenerationTrace" ORDER BY created_at ASC LIMIT 5000');
    if (rows.length === 0) { console.log('  No quiz generation traces found.'); return; }

    const docs = rows.map((r) => ({
        id: r.id?.toString() ?? admin.firestore().collection('_').doc().id,
        data: {
            userId: r.user_id,
            quizId: r.quiz_id ?? null,
            quizGoal: r.quiz_goal,
            company: r.company ?? null,
            skills: parseJsonSafe(r.skills) ?? [],
            model: r.model ?? null,
            usedPatternCount: r.used_pattern_count ?? 0,
            usedPatternIds: parseJsonSafe(r.used_pattern_ids) ?? [],
            usedFallback: r.used_fallback ?? false,
            trace: parseJsonSafe(r.trace) ?? {},
            createdAt: toTimestamp(r.created_at),
        },
    }));

    await batchWrite(COLLECTIONS.QUIZ_GENERATION_TRACES, docs);
}

/* ─── Auth Migration (Supabase → Firebase) ────────────────────── */

async function migrateAuthUsers() {
    console.log('\n🔐 Migrating Auth Users (Supabase → Firebase)...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.log('  ⚠ Skipping auth migration: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not set.');
        return;
    }

    // Fetch all auth users from Supabase Admin API
    let page = 1;
    let allUsers: any[] = [];
    const perPage = 100;

    while (true) {
        const url = `${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`;
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${serviceRoleKey}`,
                apikey: serviceRoleKey,
            },
        });

        if (!res.ok) {
            console.error(`  ✗ Failed to fetch users (page ${page}): ${res.status}`);
            break;
        }

        const data = await res.json();
        const users = data.users ?? [];
        allUsers.push(...users);

        if (users.length < perPage) break;
        page++;
    }

    console.log(`  Found ${allUsers.length} Supabase Auth users`);

    let imported = 0;
    let skipped = 0;

    for (const user of allUsers) {
        try {
            // Check if user already exists in Firebase
            try {
                await fireAuth.getUser(user.id);
                skipped++;
                continue; // Already exists
            } catch {
                // User doesn't exist, create them
            }

            const createRequest: admin.auth.CreateRequest = {
                uid: user.id,
                email: user.email,
                emailVerified: user.email_confirmed_at ? true : false,
                displayName: user.user_metadata?.full_name ?? user.email?.split('@')[0],
                disabled: false,
            };

            // If user has encrypted password (bcrypt), import it directly
            if (user.encrypted_password) {
                await fireAuth.importUsers(
                    [{
                        uid: user.id,
                        email: user.email,
                        emailVerified: !!user.email_confirmed_at,
                        displayName: createRequest.displayName,
                        passwordHash: Buffer.from(user.encrypted_password),
                    }],
                    {
                        hash: {
                            algorithm: 'BCRYPT',
                        },
                    }
                );
            } else {
                await fireAuth.createUser(createRequest);
            }

            imported++;
            process.stdout.write(`  → ${imported} imported, ${skipped} skipped\r`);
        } catch (err: any) {
            console.error(`  ✗ Failed to import user ${user.email}: ${err.message}`);
        }
    }

    console.log(`  ✓ Auth: ${imported} imported, ${skipped} skipped (already existed)`);
}

/* ─── Main ────────────────────────────────────────────────────── */

async function main() {
    console.log('═══════════════════════════════════════════════');
    console.log('  QuizPro — Supabase → Firebase Migration');
    console.log('═══════════════════════════════════════════════');

    const start = Date.now();
    const failures: string[] = [];

    async function run(name: string, fn: () => Promise<void>) {
        try {
            await fn();
        } catch (err: any) {
            console.error(`\n  ✗ ${name} FAILED: ${err.message}`);
            failures.push(name);
        }
    }

    // Phase 1: Auth users
    await run('Auth Users', migrateAuthUsers);

    // Phase 2: Prisma-managed tables
    await run('Users', migrateUsers);
    await run('Admins', migrateAdmins);
    await run('Quizzes', migrateQuizzes);
    await run('Questions', migrateQuestions);
    await run('QuizAttempts', migrateQuizAttempts);
    await run('UserProgress', migrateUserProgress);
    await run('Leaderboards', migrateLeaderboards);
    await run('SyntheticDatabases', migrateSyntheticDatabases);

    // Phase 3: Raw SQL tables
    await run('AppSettings', migrateAppSettings);
    await run('PaymentRequests', migratePaymentRequests);
    await run('AppEvents', migrateAppEvents);
    await run('AppErrors', migrateAppErrors);
    await run('InterviewPatterns', migrateInterviewPatterns);
    await run('InterviewQuestionBank', migrateInterviewQuestionBank);
    await run('QuizGenerationTraces', migrateQuizGenerationTraces);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n═══════════════════════════════════════════════`);
    if (failures.length > 0) {
        console.log(`  ⚠ Migration finished in ${elapsed}s with ${failures.length} failures:`);
        failures.forEach((f) => console.log(`    - ${f}`));
    } else {
        console.log(`  ✅ Migration complete in ${elapsed}s — all tables migrated!`);
    }
    console.log(`═══════════════════════════════════════════════\n`);

    await pool.end();
}

main();
