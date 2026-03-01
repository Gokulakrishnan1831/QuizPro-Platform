/**
 * lib/firebase/db.ts
 *
 * Firestore helper functions that mirror Prisma's API patterns.
 * Drop-in replacements for prisma.model.findUnique(), create(), update(), etc.
 */

import { db } from './admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
    COLLECTIONS,
    type UserDoc,
    type AdminDoc,
    type QuizDoc,
    type QuestionDoc,
    type QuizAttemptDoc,
    type UserProgressDoc,
    type LeaderboardDoc,
    type SyntheticDatabaseDoc,
    type AppSettingDoc,
    type PaymentRequestDoc,
    type AppEventDoc,
    type AppErrorDoc,
    type CompanyInterviewPatternDoc,
    type InterviewQuestionBankDoc,
    type QuizGenerationTraceDoc,
} from './collections';

/* ─── Utility ─────────────────────────────────────────────────── */

function now() {
    return Timestamp.now();
}

function generateId(): string {
    return db.collection('_').doc().id; // Firestore auto-ID
}

/* ─── User ────────────────────────────────────────────────────── */

export async function getUserById(id: string): Promise<(UserDoc & { id: string }) | null> {
    const snap = await db.collection(COLLECTIONS.USERS).doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as UserDoc & { id: string };
}

export async function getUserByEmail(email: string): Promise<(UserDoc & { id: string }) | null> {
    const snap = await db.collection(COLLECTIONS.USERS).where('email', '==', email).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return { id: doc.id, ...doc.data() } as UserDoc & { id: string };
}

export async function createUser(id: string, data: Partial<UserDoc>): Promise<UserDoc & { id: string }> {
    const doc: UserDoc = {
        email: data.email ?? '',
        name: data.name ?? null,
        profileType: data.profileType ?? null,
        persona: data.persona ?? null,
        experienceYears: data.experienceYears ?? null,
        resumeUrl: data.resumeUrl ?? null,
        educationDetails: data.educationDetails ?? null,
        toolStack: data.toolStack ?? null,
        quizGoal: data.quizGoal ?? null,
        upcomingCompany: data.upcomingCompany ?? null,
        upcomingJD: data.upcomingJD ?? null,
        interviewDate: data.interviewDate ?? null,
        subscriptionTier: data.subscriptionTier ?? 'FREE',
        quizzesRemaining: data.quizzesRemaining ?? 1,
        createdAt: data.createdAt ?? now(),
        updatedAt: now(),
    };
    await db.collection(COLLECTIONS.USERS).doc(id).set(doc);
    return { id, ...doc };
}

export async function updateUser(id: string, data: Partial<UserDoc>): Promise<void> {
    await db.collection(COLLECTIONS.USERS).doc(id).update({ ...data, updatedAt: now() });
}

export async function upsertUser(id: string, data: Partial<UserDoc>): Promise<void> {
    const ref = db.collection(COLLECTIONS.USERS).doc(id);
    const snap = await ref.get();
    if (snap.exists) {
        await ref.update({ ...data, updatedAt: now() });
    } else {
        await createUser(id, data);
    }
}

export async function getAllUsers(): Promise<(UserDoc & { id: string })[]> {
    const snap = await db.collection(COLLECTIONS.USERS).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserDoc & { id: string });
}

export async function getUserCount(): Promise<number> {
    const snap = await db.collection(COLLECTIONS.USERS).count().get();
    return snap.data().count;
}

/* ─── Admin ───────────────────────────────────────────────────── */

export async function getAdminByEmail(email: string): Promise<(AdminDoc & { id: string }) | null> {
    const snap = await db.collection(COLLECTIONS.ADMINS).where('email', '==', email).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return { id: doc.id, ...doc.data() } as AdminDoc & { id: string };
}

export async function getAdminById(id: string): Promise<(AdminDoc & { id: string }) | null> {
    const snap = await db.collection(COLLECTIONS.ADMINS).doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as AdminDoc & { id: string };
}

export async function createAdmin(data: Omit<AdminDoc, 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = generateId();
    await db.collection(COLLECTIONS.ADMINS).doc(id).set({
        ...data,
        createdAt: now(),
        updatedAt: now(),
    });
    return id;
}

/* ─── Quiz ────────────────────────────────────────────────────── */

export async function createQuiz(data: Omit<QuizDoc, 'createdAt'>): Promise<string> {
    const id = generateId();
    await db.collection(COLLECTIONS.QUIZZES).doc(id).set({
        ...data,
        createdAt: now(),
    });
    return id;
}

export async function getQuizById(id: string): Promise<(QuizDoc & { id: string }) | null> {
    const snap = await db.collection(COLLECTIONS.QUIZZES).doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as QuizDoc & { id: string };
}

export async function getQuizCount(): Promise<number> {
    const snap = await db.collection(COLLECTIONS.QUIZZES).count().get();
    return snap.data().count;
}

/* ─── Question (Bank) ─────────────────────────────────────────── */

export async function createQuestion(data: Omit<QuestionDoc, 'createdAt'>): Promise<string> {
    const id = generateId();
    await db.collection(COLLECTIONS.QUESTIONS).doc(id).set({
        ...data,
        createdAt: now(),
    });
    return id;
}

export async function createManyQuestions(docs: Omit<QuestionDoc, 'createdAt'>[]): Promise<number> {
    const batch = db.batch();
    for (const data of docs) {
        const ref = db.collection(COLLECTIONS.QUESTIONS).doc(generateId());
        batch.set(ref, { ...data, createdAt: now() });
    }
    await batch.commit();
    return docs.length;
}

export async function getQuestionsByFilter(filter: {
    skill?: string;
    type?: string;
    difficulty?: number;
    limit?: number;
}): Promise<(QuestionDoc & { id: string })[]> {
    let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.QUESTIONS);
    if (filter.skill) query = query.where('skill', '==', filter.skill);
    if (filter.type) query = query.where('type', '==', filter.type);
    if (filter.difficulty) query = query.where('difficulty', '==', filter.difficulty);
    if (filter.limit) query = query.limit(filter.limit);

    const snap = await query.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as QuestionDoc & { id: string });
}

export async function getQuestionCount(): Promise<number> {
    const snap = await db.collection(COLLECTIONS.QUESTIONS).count().get();
    return snap.data().count;
}

export async function deleteAllQuestions(): Promise<void> {
    const snap = await db.collection(COLLECTIONS.QUESTIONS).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
}

/* ─── QuizAttempt ─────────────────────────────────────────────── */

export async function createQuizAttempt(
    data: Omit<QuizAttemptDoc, 'completedAt'> & { completedAt?: Timestamp },
): Promise<string> {
    const id = generateId();
    await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).doc(id).set({
        ...data,
        completedAt: data.completedAt ?? now(),
    });
    return id;
}

export async function getQuizAttemptsByUser(
    userId: string,
    limitCount?: number,
): Promise<(QuizAttemptDoc & { id: string })[]> {
    let query = db
        .collection(COLLECTIONS.QUIZ_ATTEMPTS)
        .where('userId', '==', userId)
        .orderBy('completedAt', 'desc');
    if (limitCount) query = query.limit(limitCount);

    const snap = await query.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as QuizAttemptDoc & { id: string });
}

export async function getQuizAttemptCount(): Promise<number> {
    const snap = await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).count().get();
    return snap.data().count;
}

export async function getQuizAttemptsByQuiz(
    quizId: string,
): Promise<(QuizAttemptDoc & { id: string })[]> {
    const snap = await db
        .collection(COLLECTIONS.QUIZ_ATTEMPTS)
        .where('quizId', '==', quizId)
        .orderBy('score', 'desc')
        .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as QuizAttemptDoc & { id: string });
}

/* ─── UserProgress ────────────────────────────────────────────── */

function progressId(userId: string, skill: string) {
    return `${userId}_${skill}`;
}

export async function getUserProgress(
    userId: string,
    skill: string,
): Promise<(UserProgressDoc & { id: string }) | null> {
    const id = progressId(userId, skill);
    const snap = await db.collection(COLLECTIONS.USER_PROGRESS).doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as UserProgressDoc & { id: string };
}

export async function getAllUserProgress(
    userId: string,
): Promise<(UserProgressDoc & { id: string })[]> {
    const snap = await db
        .collection(COLLECTIONS.USER_PROGRESS)
        .where('userId', '==', userId)
        .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserProgressDoc & { id: string });
}

export async function upsertUserProgress(
    userId: string,
    skill: string,
    data: Partial<UserProgressDoc>,
): Promise<void> {
    const id = progressId(userId, skill);
    const ref = db.collection(COLLECTIONS.USER_PROGRESS).doc(id);
    const snap = await ref.get();

    if (snap.exists) {
        await ref.update({ ...data, lastPracticed: now() });
    } else {
        await ref.set({
            userId,
            skill,
            totalAttempted: data.totalAttempted ?? 0,
            totalCorrect: data.totalCorrect ?? 0,
            accuracy: data.accuracy ?? 0,
            lastPracticed: now(),
        });
    }
}

/* ─── Leaderboard ─────────────────────────────────────────────── */

function leaderboardId(skill: string, profileType: string) {
    return `${skill}_${profileType}`;
}

export async function getLeaderboard(
    skill: string,
    profileType: string,
): Promise<(LeaderboardDoc & { id: string }) | null> {
    const id = leaderboardId(skill, profileType);
    const snap = await db.collection(COLLECTIONS.LEADERBOARDS).doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as LeaderboardDoc & { id: string };
}

export async function upsertLeaderboard(
    skill: string,
    profileType: string,
    scores: any[],
): Promise<void> {
    const id = leaderboardId(skill, profileType);
    await db.collection(COLLECTIONS.LEADERBOARDS).doc(id).set(
        {
            skill,
            profileType,
            scores,
            updatedAt: now(),
        },
        { merge: true },
    );
}

/* ─── SyntheticDatabase ───────────────────────────────────────── */

export async function getSyntheticDatabase(filter: {
    industry?: string;
    difficulty?: number;
}): Promise<(SyntheticDatabaseDoc & { id: string }) | null> {
    let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.SYNTHETIC_DATABASES);
    if (filter.industry) query = query.where('industry', '==', filter.industry);
    if (filter.difficulty) query = query.where('difficulty', '==', filter.difficulty);
    query = query.limit(1);

    const snap = await query.get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return { id: doc.id, ...doc.data() } as SyntheticDatabaseDoc & { id: string };
}

export async function createSyntheticDatabase(
    data: Omit<SyntheticDatabaseDoc, 'createdAt' | 'usageCount'>,
): Promise<string> {
    const id = generateId();
    await db.collection(COLLECTIONS.SYNTHETIC_DATABASES).doc(id).set({
        ...data,
        usageCount: 0,
        createdAt: now(),
    });
    return id;
}

export async function incrementSyntheticDbUsage(id: string): Promise<void> {
    await db.collection(COLLECTIONS.SYNTHETIC_DATABASES).doc(id).update({
        usageCount: FieldValue.increment(1),
    });
}

/* ─── AppSetting ──────────────────────────────────────────────── */

export async function getAppSetting(key: string): Promise<string | null> {
    const snap = await db.collection(COLLECTIONS.APP_SETTINGS).doc(key).get();
    if (!snap.exists) return null;
    return (snap.data() as AppSettingDoc).value;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
    await db.collection(COLLECTIONS.APP_SETTINGS).doc(key).set({
        value,
        updatedAt: now(),
    });
}

/* ─── PaymentRequest ──────────────────────────────────────────── */

export async function createPaymentRequest(
    data: Omit<PaymentRequestDoc, 'createdAt' | 'reviewedAt' | 'status'>,
): Promise<string> {
    const id = generateId();
    await db.collection(COLLECTIONS.PAYMENT_REQUESTS).doc(id).set({
        ...data,
        status: 'pending',
        createdAt: now(),
        reviewedAt: null,
    });
    return id;
}

export async function getPaymentRequests(
    filter?: { status?: string },
): Promise<(PaymentRequestDoc & { id: string })[]> {
    let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.PAYMENT_REQUESTS);
    if (filter?.status) query = query.where('status', '==', filter.status);
    query = query.orderBy('createdAt', 'desc');

    const snap = await query.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentRequestDoc & { id: string });
}

export async function updatePaymentRequest(id: string, data: Partial<PaymentRequestDoc>): Promise<void> {
    await db.collection(COLLECTIONS.PAYMENT_REQUESTS).doc(id).update(data);
}

/* ─── AppEvent ────────────────────────────────────────────────── */

export async function createAppEvent(data: Omit<AppEventDoc, 'createdAt'>): Promise<void> {
    const id = generateId();
    await db.collection(COLLECTIONS.APP_EVENTS).doc(id).set({
        ...data,
        createdAt: now(),
    });
}

export async function getAppEvents(limitCount: number = 100): Promise<(AppEventDoc & { id: string })[]> {
    const snap = await db
        .collection(COLLECTIONS.APP_EVENTS)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppEventDoc & { id: string });
}

/* ─── AppError ────────────────────────────────────────────────── */

export async function createAppError(data: Omit<AppErrorDoc, 'createdAt'>): Promise<void> {
    const id = generateId();
    await db.collection(COLLECTIONS.APP_ERRORS).doc(id).set({
        ...data,
        createdAt: now(),
    });
}

export async function getAppErrors(limitCount: number = 100): Promise<(AppErrorDoc & { id: string })[]> {
    const snap = await db
        .collection(COLLECTIONS.APP_ERRORS)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppErrorDoc & { id: string });
}

/* ─── CompanyInterviewPattern ─────────────────────────────────── */

export async function getInterviewPatterns(filter: {
    normalizedCompany: string;
    isActive?: boolean;
    isVerified?: boolean;
    skill?: string;
    limit?: number;
}): Promise<(CompanyInterviewPatternDoc & { id: string })[]> {
    let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.COMPANY_INTERVIEW_PATTERNS);
    query = query.where('normalizedCompany', '==', filter.normalizedCompany);
    if (filter.isActive !== undefined) query = query.where('isActive', '==', filter.isActive);
    if (filter.isVerified !== undefined) query = query.where('isVerified', '==', filter.isVerified);
    if (filter.skill) query = query.where('skill', '==', filter.skill);
    query = query.orderBy('lastSeenAt', 'desc');
    if (filter.limit) query = query.limit(filter.limit);

    const snap = await query.get();
    return snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as CompanyInterviewPatternDoc & { id: string },
    );
}

export async function createInterviewPattern(
    data: Omit<CompanyInterviewPatternDoc, 'createdAt' | 'updatedAt'>,
): Promise<string> {
    const id = generateId();
    await db.collection(COLLECTIONS.COMPANY_INTERVIEW_PATTERNS).doc(id).set({
        ...data,
        createdAt: now(),
        updatedAt: now(),
    });
    return id;
}

export async function getAllInterviewPatterns(): Promise<(CompanyInterviewPatternDoc & { id: string })[]> {
    const snap = await db.collection(COLLECTIONS.COMPANY_INTERVIEW_PATTERNS).orderBy('createdAt', 'desc').get();
    return snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as CompanyInterviewPatternDoc & { id: string },
    );
}

export async function updateInterviewPattern(id: string, data: Partial<CompanyInterviewPatternDoc>): Promise<void> {
    await db.collection(COLLECTIONS.COMPANY_INTERVIEW_PATTERNS).doc(id).update({
        ...data,
        updatedAt: now(),
    });
}

/* ─── InterviewQuestionBank ───────────────────────────────────── */

export async function getCachedInterviewQuestions(filter: {
    normalizedCompany: string;
    normalizedRole: string;
    skill: string;
    isActive?: boolean;
}): Promise<(InterviewQuestionBankDoc & { id: string })[]> {
    let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.INTERVIEW_QUESTION_BANK);
    query = query.where('normalizedCompany', '==', filter.normalizedCompany);
    query = query.where('normalizedRole', '==', filter.normalizedRole);
    query = query.where('skill', '==', filter.skill);
    if (filter.isActive !== undefined) query = query.where('isActive', '==', filter.isActive);

    const snap = await query.get();
    return snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as InterviewQuestionBankDoc & { id: string },
    );
}

export async function createInterviewQuestion(
    data: Omit<InterviewQuestionBankDoc, 'createdAt' | 'updatedAt' | 'timesServed'>,
): Promise<string> {
    const id = generateId();
    await db.collection(COLLECTIONS.INTERVIEW_QUESTION_BANK).doc(id).set({
        ...data,
        timesServed: 0,
        createdAt: now(),
        updatedAt: now(),
    });
    return id;
}

export async function createManyInterviewQuestions(
    docs: Omit<InterviewQuestionBankDoc, 'createdAt' | 'updatedAt' | 'timesServed'>[],
): Promise<number> {
    const batch = db.batch();
    for (const data of docs) {
        const ref = db.collection(COLLECTIONS.INTERVIEW_QUESTION_BANK).doc(generateId());
        batch.set(ref, {
            ...data,
            timesServed: 0,
            createdAt: now(),
            updatedAt: now(),
        });
    }
    await batch.commit();
    return docs.length;
}

export async function incrementInterviewQuestionServed(id: string): Promise<void> {
    await db.collection(COLLECTIONS.INTERVIEW_QUESTION_BANK).doc(id).update({
        timesServed: FieldValue.increment(1),
        updatedAt: now(),
    });
}

/* ─── QuizGenerationTrace ─────────────────────────────────────── */

export async function createQuizGenerationTrace(
    data: Omit<QuizGenerationTraceDoc, 'createdAt'>,
): Promise<string> {
    const id = generateId();
    await db.collection(COLLECTIONS.QUIZ_GENERATION_TRACES).doc(id).set({
        ...data,
        createdAt: now(),
    });
    return id;
}
