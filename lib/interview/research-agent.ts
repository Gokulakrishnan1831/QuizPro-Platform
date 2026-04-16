/**
 * lib/interview/research-agent.ts
 *
 * LLM-powered research agent that generates company-specific interview
 * questions for SQL, Excel, and Power BI, grounded in Glassdoor/AmbitionBox
 * patterns from the LLM's training data.
 */

import { groqQuizCompletion } from '@/lib/ai/groq-client';
import { postProcessQuestions } from '@/lib/ai/post-process';
import type { RankedInterviewPattern } from './retrieval';
import { buildInterviewGroundingContext } from './retrieval';
import { searchTavilyCompanyQuestions } from './tavily-client';

type Skill = 'SQL' | 'EXCEL' | 'POWERBI';

interface ResearchParams {
    company: string;
    role: { normalized: string; display: string };
    skills: Skill[];
    jdText?: string;
    questionCount: number;
    includeHandsOn: boolean;
    profileType: 'FRESHER' | 'EXPERIENCED';
    experienceYears?: number;
    existingPatterns?: RankedInterviewPattern[];
    avoidQuestionFingerprints?: string[];
    difficultyFloor?: number;
    difficultyCeiling?: number;
    tavilyContext?: string;
}

/**
 * Builds a specialised prompt that asks the LLM to generate company-specific
 * interview questions, drawing on its training data about Glassdoor,
 * AmbitionBox, and LinkedIn interview experiences.
 */
function buildResearchPrompt(params: ResearchParams): string {
    const {
        company,
        role,
        skills,
        jdText,
        questionCount,
        includeHandsOn,
        profileType,
        experienceYears,
        existingPatterns = [],
        avoidQuestionFingerprints = [],
        difficultyFloor,
        difficultyCeiling,
        tavilyContext,
    } = params;

    const groundingContext =
        existingPatterns.length > 0
            ? buildInterviewGroundingContext(existingPatterns)
            : '';

    const handsOnSkills = skills.filter((s) => s !== 'POWERBI');
    const hasHandsOn = includeHandsOn && handsOnSkills.length > 0;
    const handsOnCount = hasHandsOn ? Math.max(1, Math.round(questionCount * 0.3)) : 0;
    const mcqCount = questionCount - handsOnCount;

    const skillDistribution = skills
        .map((s) => {
            const perSkill = Math.ceil(questionCount / skills.length);
            return `- ${s}: ~${perSkill} questions`;
        })
        .join('\n');

    const difficultyGuide =
        profileType === 'FRESHER'
            ? 'Intermediate to Hard (difficulty 5-7). Avoid beginner-only recall questions.'
            : (experienceYears ?? 0) >= 5
                ? 'Hard (difficulty 7-9). Include advanced optimization and edge-case questions.'
                : 'Intermediate to Hard (difficulty 6-8). Mix conceptual depth with practical complexity.';

    return `You are an expert interview question researcher for data analytics roles.

---- COMPANY & ROLE ----
Company: ${company}
Role: ${role.display}
${jdText ? `Job Description:\n${jdText}\n` : ''}

---- CANDIDATE PROFILE ----
Level: ${profileType}${experienceYears ? `, ${experienceYears} years experience` : ''}
Difficulty: ${difficultyGuide}
${typeof difficultyFloor === 'number' && typeof difficultyCeiling === 'number'
            ? `Strict band: every question difficulty must be between ${difficultyFloor} and ${difficultyCeiling}.`
            : ''}

---- TASK ----
Generate ${questionCount} interview questions that ${company} is known to ask
for ${role.display} positions. Draw from your training data knowledge of interview
patterns commonly reported on Glassdoor, AmbitionBox, and LinkedIn for ${company}.

${groundingContext ? `\n${groundingContext}\n` : ''}
${tavilyContext ? `\n${tavilyContext}\n` : ''}
${avoidQuestionFingerprints.length > 0
            ? `\n---- PREVIOUSLY SERVED QUESTION SIGNATURES (DO NOT REPEAT) ----
${avoidQuestionFingerprints.slice(0, 60).map((v, i) => `${i + 1}. ${v}`).join('\n')}
`
            : ''}

---- SKILL DISTRIBUTION ----
${skillDistribution}
MCQ questions: ${mcqCount}
${hasHandsOn ? `Hands-on questions: ${handsOnCount} (from: ${handsOnSkills.join(', ')})` : 'No hands-on questions.'}

---- OUTPUT FORMAT ----
Each question MUST include a "source_context" field with one of:
- "glassdoor_pattern" — if based on patterns commonly reported on Glassdoor for ${company}
- "ambitionbox_pattern" — if based on AmbitionBox patterns for ${company}
- "jd_derived" — if derived from specific keywords/requirements in the JD
- "ai_generated" — if a general best-practice question for the role/skill

---- MCQ FORMAT ----
{
  "type": "MCQ",
  "skill": "EXCEL" | "SQL" | "POWERBI",
  "content": "Question text",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "The exact correct option text",
  "multipleCorrect": false,
  "solution": "2-3 sentence explanation",
  "difficulty": <number 1-10>,
  "source_context": "glassdoor_pattern" | "ambitionbox_pattern" | "jd_derived" | "ai_generated"
}

${skills.includes('POWERBI') ? `---- POWERBI FILL BLANK FORMAT ----
{
  "type": "POWERBI_FILL_BLANK",
  "skill": "POWERBI",
  "content": "In DAX, the function used to change filter context is ____.",
  "blankLabel": "DAX function",
  "acceptedAnswers": ["CALCULATE", "CALCULATE()"],
  "caseSensitive": false,
  "solution": "CALCULATE changes filter context in DAX.",
  "difficulty": <number 1-10>,
  "source_context": "glassdoor_pattern"
}
` : ''}

${hasHandsOn ? `---- SQL HANDS-ON FORMAT ----
{
  "type": "SQL_HANDS_ON",
  "skill": "SQL",
  "content": "Task description with table context",
  "setupSQL": "CREATE TABLE ...; INSERT INTO ...;",
  "sampleData": [{"tableName": "table_name", "rows": [{"col1": "val1", "col2": 123}]}],
  "expectedOutput": [{"col1": "val1", "col2": 123}],
  "expectedColumns": ["col1", "col2"],
  "starterCode": "-- Write your SQL query here\\nSELECT ",
  "solution": "The correct SQL query",
  "difficulty": <number 1-10>,
  "source_context": "glassdoor_pattern"
}

---- EXCEL HANDS-ON FORMAT ----
{
  "type": "EXCEL_HANDS_ON",
  "skill": "EXCEL",
  "content": "Task description",
  "columns": ["Name", "Q1", "Q2", "Total"],
  "initialData": [["Alice", 10, 20, null], ["Bob", 5, 15, null]],
  "editableCells": [[0, 3], [1, 3]],
  "expectedFormulas": [{"row": 0, "col": 3, "formulas": ["=B1+C1"]}],
  "expectedValues": [{"row": 0, "col": 3, "value": 30}],
  "solution": "D1 = B1+C1",
  "difficulty": <number 1-10>,
  "source_context": "jd_derived"
}
` : ''}

---- RULES ----
1. Questions MUST feel like real interview questions for ${company}: scenario-based, practical.
2. If you know specific patterns for ${company}, generate questions that mirror those concepts.
3. If ${company} is not well-known, generate questions typical for the industry/role based on the JD.
4. MCQ must have exactly 4 plausible options with a single correct answer.
5. SQL_HANDS_ON requires complete setupSQL with CREATE TABLE + INSERT INTO.
6. EXCEL_HANDS_ON requires columns, initialData, editableCells, expectedFormulas, expectedValues.
7. Never generate hands-on types for POWERBI skill.
8. Keep all difficulties inside the strict band above; do not generate easy-only questions.
9. For SQL datasets, use scenarios relevant to ${company}'s domain/industry.
10. Never repeat previous question signatures listed above.
11. Return ONLY a valid JSON array of ${questionCount} question objects. No markdown, no commentary.`;
}

/**
 * Generates company-specific interview questions using OpenAI.
 * Returns post-processed questions ready for quiz assembly or caching.
 */
export async function researchAndGenerateQuestions(
    params: ResearchParams
): Promise<any[]> {
    let tavilyContext = '';
    // If no existing patterns were provided (meaning we missed the fast cache), hit Tavily
    if (!params.existingPatterns || params.existingPatterns.length === 0) {
        const tavilyResults = await searchTavilyCompanyQuestions(params.company, params.role.display);
        if (tavilyResults.length > 0) {
            tavilyContext = `\n---- RECENT EXTERNAL INTERVIEW DATA (HIGH PRIORITY) ----\nUse the following real-world search snippets from Glassdoor/AmbitionBox to extract exact questions asked at ${params.company}. Format them into the Quiz format requested.\n`;
            tavilyResults.forEach((res, idx) => {
                tavilyContext += `\n[Snippet ${idx + 1} from ${res.url}]:\n${res.content}\n`;
            });
        }
    }

    const prompt = buildResearchPrompt({ ...params, tavilyContext });

    const raw = await groqQuizCompletion(prompt);
    const cleaned = raw
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

    let questions: any[];
    try {
        questions = JSON.parse(cleaned);
    } catch {
        // Try to extract JSON array from the response
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) {
            questions = JSON.parse(match[0]);
        } else {
            throw new Error('Failed to parse LLM response as JSON array');
        }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('LLM returned empty or invalid question array');
    }

    // Post-process: ensure SQL_HANDS_ON has setupSQL, EXCEL has grid data, etc.
    questions = postProcessQuestions(questions);

    return questions;
}
