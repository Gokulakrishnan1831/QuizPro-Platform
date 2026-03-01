import { describe, expect, it } from 'vitest';
import {
  buildInterviewGroundingContext,
  normalizeCompanyName,
  rankInterviewPatterns,
  type InterviewPattern,
} from '@/lib/interview/retrieval';

function pattern(overrides: Partial<InterviewPattern>): InterviewPattern {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    company: overrides.company ?? 'Acme',
    normalizedCompany: overrides.normalizedCompany ?? 'acme',
    role: overrides.role ?? 'Data Analyst',
    skill: overrides.skill ?? 'SQL',
    patternType: overrides.patternType ?? 'QUESTION',
    questionText: overrides.questionText ?? 'Write a SQL query for monthly revenue.',
    difficulty: overrides.difficulty ?? 5,
    tags: overrides.tags ?? ['sql', 'joins'],
    source: overrides.source ?? 'glassdoor',
    sourceUrl: overrides.sourceUrl ?? null,
    evidenceNote: overrides.evidenceNote ?? null,
    isVerified: overrides.isVerified ?? false,
    isActive: overrides.isActive ?? true,
    lastSeenAt: overrides.lastSeenAt ?? new Date().toISOString(),
    createdAt: overrides.createdAt ?? new Date().toISOString(),
  };
}

describe('interview retrieval helpers', () => {
  it('normalizes company names deterministically', () => {
    expect(normalizeCompanyName('  TCS - Digital  ')).toBe('tcs digital');
    expect(normalizeCompanyName('Myntra.com')).toBe('myntra com');
  });

  it('ranks verified and skill-matched patterns higher', () => {
    const rows = [
      pattern({
        id: '1',
        skill: 'EXCEL',
        isVerified: false,
        questionText: 'Build a pivot table for sales region summary.',
        tags: ['pivot', 'excel'],
      }),
      pattern({
        id: '2',
        skill: 'SQL',
        isVerified: true,
        questionText: 'Use window functions to rank top customers by revenue.',
        tags: ['window', 'sql', 'revenue'],
      }),
    ];

    const ranked = rankInterviewPatterns(rows, {
      skills: ['SQL'],
      jdText: 'Need strong SQL, window functions, and revenue reporting',
      maxItems: 2,
    });

    expect(ranked[0].id).toBe('2');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('builds a citation-ready grounding block', () => {
    const ranked = rankInterviewPatterns(
      [
        pattern({
          id: 'p-1',
          skill: 'POWERBI',
          source: 'ambitionbox',
          sourceUrl: 'https://example.com/pattern/1',
          questionText: 'Difference between calculated column and measure in DAX.',
        }),
      ],
      { skills: ['POWERBI'], maxItems: 1 }
    );

    const context = buildInterviewGroundingContext(ranked);
    expect(context).toContain('INTERNAL COMPANY INTERVIEW SIGNALS');
    expect(context).toContain('Pattern p-1');
    expect(context).toContain('metadata.citations');
  });
});
