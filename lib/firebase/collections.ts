/**
 * lib/firebase/collections.ts
 *
 * Firestore collection names and TypeScript interfaces
 * replacing Prisma models + raw SQL table types.
 */

import { Timestamp } from 'firebase-admin/firestore';

/* ─── Collection Names ────────────────────────────────────────── */

export const COLLECTIONS = {
    USERS: 'users',
    ADMINS: 'admins',
    QUIZZES: 'quizzes',
    QUESTIONS: 'questions',
    QUIZ_ATTEMPTS: 'quizAttempts',
    USER_PROGRESS: 'userProgress',
    LEADERBOARDS: 'leaderboards',
    SYNTHETIC_DATABASES: 'syntheticDatabases',
    APP_SETTINGS: 'appSettings',
    PAYMENT_REQUESTS: 'paymentRequests',
    APP_EVENTS: 'appEvents',
    APP_ERRORS: 'appErrors',
    COMPANY_INTERVIEW_PATTERNS: 'companyInterviewPatterns',
    INTERVIEW_QUESTION_BANK: 'interviewQuestionBank',
    QUIZ_GENERATION_TRACES: 'quizGenerationTraces',
} as const;

/* ─── Enums (mirrors Prisma enums) ────────────────────────────── */

export type ProfileType = 'FRESHER' | 'EXPERIENCED';
export type Persona = 'SWITCHER' | 'JOB_HOPPER' | 'FRESHER';
export type SubscriptionTier = 'FREE' | 'BASIC' | 'PRO' | 'ELITE';
export type QuestionType = 'MCQ' | 'EXCEL_HANDS_ON' | 'SQL_HANDS_ON' | 'POWERBI_MCQ' | 'PYTHON_HANDS_ON';
export type SkillType = 'EXCEL' | 'SQL' | 'POWERBI' | 'PYTHON';
export type QuizGoal = 'PRACTICE' | 'INTERVIEW_PREP';

/* ─── Document Interfaces ─────────────────────────────────────── */

/** `users` collection — Doc ID = Firebase Auth UID */
export interface UserDoc {
    email: string;
    name?: string | null;
    profileType?: ProfileType | null;
    persona?: Persona | null;
    experienceYears?: number | null;
    resumeUrl?: string | null;
    educationDetails?: Record<string, any> | null;
    toolStack?: string[] | null;
    quizGoal?: QuizGoal | null;
    upcomingCompany?: string | null;
    upcomingJD?: string | null;
    interviewDate?: Timestamp | null;
    subscriptionTier: SubscriptionTier;
    quizzesRemaining: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/** `admins` collection */
export interface AdminDoc {
    email: string;
    passwordHash: string;
    name?: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/** `quizzes` collection */
export interface QuizDoc {
    persona: Persona;
    skill?: SkillType | null;
    quizGoal: QuizGoal;
    jdCompany?: string | null;
    jdText?: string | null;
    timerMins: number;
    questions: any[];
    createdAt: Timestamp;
}

/** `questions` collection (question bank) */
export interface QuestionDoc {
    skill: SkillType;
    type: QuestionType;
    content: string;
    options?: string[] | null;
    correctAnswer: any;
    solution: string;
    difficulty: number;
    metadata?: Record<string, any> | null;
    createdAt: Timestamp;
}

/** `quizAttempts` collection */
export interface QuizAttemptDoc {
    userId: string;
    quizId: string;
    answers: any[];
    score: number;
    timeTaken: number;
    wrongAnswers: any[];
    aiSummary?: string | null;
    focusTopics?: string[] | null;
    rank?: number | null;
    tabSwitchCount?: number;
    terminatedByProctor?: boolean;
    completedAt: Timestamp;
}

/** `userProgress` collection — Doc ID = `{userId}_{skill}` */
export interface UserProgressDoc {
    userId: string;
    skill: SkillType;
    totalAttempted: number;
    totalCorrect: number;
    accuracy: number;
    lastPracticed: Timestamp;
}

/** `leaderboards` collection — Doc ID = `{skill}_{profileType}` */
export interface LeaderboardDoc {
    skill: SkillType;
    profileType: ProfileType;
    scores: any[];
    updatedAt: Timestamp;
}

/** `syntheticDatabases` collection */
export interface SyntheticDatabaseDoc {
    industry?: string | null;
    difficulty: number;
    setupSQL: string;
    tableSummary: string;
    sampleData: any[];
    usageCount: number;
    createdAt: Timestamp;
}

/** `appSettings` collection — Doc ID = setting key */
export interface AppSettingDoc {
    value: string;
    updatedAt: Timestamp;
}

/** `paymentRequests` collection */
export interface PaymentRequestDoc {
    userId: string;
    userEmail: string;
    userName?: string | null;
    tier: string;
    amount: number;
    upiTransactionId?: string | null;
    screenshotBase64?: string | null;
    status: string;
    adminNotes?: string | null;
    createdAt: Timestamp;
    reviewedAt?: Timestamp | null;
}

/** `appEvents` collection */
export interface AppEventDoc {
    userId?: string | null;
    event: string;
    props?: Record<string, any> | null;
    path?: string | null;
    createdAt: Timestamp;
}

/** `appErrors` collection */
export interface AppErrorDoc {
    userId?: string | null;
    errorMessage: string;
    errorStack?: string | null;
    component?: string | null;
    path?: string | null;
    createdAt: Timestamp;
}

/** `companyInterviewPatterns` collection */
export interface CompanyInterviewPatternDoc {
    company: string;
    normalizedCompany: string;
    role: string;
    skill?: string | null;
    patternType: string;
    questionText: string;
    difficulty?: number | null;
    tags: string[];
    source: string;
    sourceUrl?: string | null;
    evidenceNote?: string | null;
    isVerified: boolean;
    isActive: boolean;
    lastSeenAt: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/** `interviewQuestionBank` collection */
export interface InterviewQuestionBankDoc {
    normalizedCompany: string;
    companyDisplay: string;
    normalizedRole: string;
    roleDisplay: string;
    skill: string;
    questionType: string;
    questionData: Record<string, any>;
    sourceContext?: string | null;
    difficulty?: number | null;
    timesServed: number;
    isActive: boolean;
    jdHash?: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/** `quizGenerationTraces` collection */
export interface QuizGenerationTraceDoc {
    userId?: string | null;
    quizId?: string | null;
    quizGoal: string;
    company?: string | null;
    skills: string[];
    model?: string | null;
    usedPatternCount: number;
    usedPatternIds: string[];
    usedFallback: boolean;
    trace: Record<string, any>;
    createdAt: Timestamp;
}
