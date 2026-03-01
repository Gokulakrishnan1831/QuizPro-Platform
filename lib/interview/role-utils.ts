/**
 * lib/interview/role-utils.ts
 *
 * Extracts and normalizes job roles from JD text.
 * Used to key the InterviewQuestionBank cache per company+role+skill.
 */

const ROLE_PATTERNS: { regex: RegExp; normalized: string; display: string }[] = [
    { regex: /\bdata\s*analyst/i, normalized: 'data analyst', display: 'Data Analyst' },
    { regex: /\bbusiness\s*analyst/i, normalized: 'business analyst', display: 'Business Analyst' },
    { regex: /\banalytics\s*engineer/i, normalized: 'analytics engineer', display: 'Analytics Engineer' },
    { regex: /\bbi\s*analyst/i, normalized: 'bi analyst', display: 'BI Analyst' },
    { regex: /\bbi\s*developer/i, normalized: 'bi developer', display: 'BI Developer' },
    { regex: /\bdata\s*engineer/i, normalized: 'data engineer', display: 'Data Engineer' },
    { regex: /\bdata\s*scientist/i, normalized: 'data scientist', display: 'Data Scientist' },
    { regex: /\bmis\s*executive/i, normalized: 'mis executive', display: 'MIS Executive' },
    { regex: /\bmis\s*analyst/i, normalized: 'mis analyst', display: 'MIS Analyst' },
    { regex: /\breporting\s*analyst/i, normalized: 'reporting analyst', display: 'Reporting Analyst' },
    { regex: /\bresearch\s*analyst/i, normalized: 'research analyst', display: 'Research Analyst' },
    { regex: /\bfinancial\s*analyst/i, normalized: 'financial analyst', display: 'Financial Analyst' },
    { regex: /\boperations\s*analyst/i, normalized: 'operations analyst', display: 'Operations Analyst' },
    { regex: /\bmarketing\s*analyst/i, normalized: 'marketing analyst', display: 'Marketing Analyst' },
    { regex: /\bproduct\s*analyst/i, normalized: 'product analyst', display: 'Product Analyst' },
];

/**
 * Extracts the most likely role from a JD text.
 * Returns the first matching role pattern; defaults to "Data Analyst".
 */
export function extractRole(jdText?: string): { normalized: string; display: string } {
    const DEFAULT = { normalized: 'data analyst', display: 'Data Analyst' };
    if (!jdText || !jdText.trim()) return DEFAULT;

    for (const pattern of ROLE_PATTERNS) {
        if (pattern.regex.test(jdText)) {
            return { normalized: pattern.normalized, display: pattern.display };
        }
    }

    return DEFAULT;
}

/**
 * Normalizes a free-form role string.
 * Strips seniority prefixes (Sr., Jr., Lead, etc.) and level numbers.
 */
export function normalizeRole(role: string): string {
    return String(role ?? '')
        .trim()
        .toLowerCase()
        .replace(/\b(sr\.?|senior|jr\.?|junior|lead|principal|staff|associate|intern)\b/gi, '')
        .replace(/\b(i{1,3}|iv|v|[0-9]+)\b/gi, '') // levels: I, II, III, 1, 2
        .replace(/[-–—]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
